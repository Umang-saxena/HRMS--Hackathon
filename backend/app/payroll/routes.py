# app/payroll/routes.py
from fastapi import APIRouter, HTTPException, Body, Query, Path, Depends
from typing import List, Optional, Any, Dict, Tuple
from datetime import datetime, timezone
from fastapi import status
from fastapi import Path, Query
from typing import Any, Optional
import logging

logger = logging.getLogger("uvicorn.error")

from app.payroll.schemas import (
    ComputeRequest,
    BonusCreate,
    PersistRequest,
    RunRequest,
    PayslipResponse,
    RunResultResponse,
)
from app.payroll import services
from app.supabase_client import supabase

router = APIRouter(prefix="/api/payroll", tags=["payroll"])


def admin_only():
    """Placeholder dependency for admin-only endpoints."""
    return True


# -------------------------
# Utility helpers
# -------------------------
def _extract_resp_info(obj: Any) -> Tuple[Optional[dict], str]:
    """
    Given a supabase response-like object or an Exception, return a tuple:
      (data_dict_or_none, textual_message)
    This helps detect structured errors (res.data contains message) or plain exceptions.
    """
    # structured response object (client returns object with .data)
    try:
        if hasattr(obj, "data"):
            return getattr(obj, "data", None), str(getattr(obj, "data", ""))
    except Exception:
        pass

    # dict-like (maybe returned directly)
    try:
        if isinstance(obj, dict):
            return obj, str(obj)
    except Exception:
        pass

    # exception-like
    try:
        return None, str(obj)
    except Exception:
        return None, ""


def _is_table_not_found(obj: Any) -> bool:
    data, txt = _extract_resp_info(obj)
    if isinstance(data, dict) and "message" in data:
        if "Could not find the table" in str(data["message"]):
            return True
    if "Could not find the table" in txt or "PGRST205" in txt:
        return True
    return False


def _is_column_missing(obj: Any) -> bool:
    """
    Detect Postgres / PostgREST column-missing errors, e.g.
    "column bonuses.is_paid does not exist" or similar.
    Checks both structured `res.data['message']` and exception text.
    """
    data, txt = _extract_resp_info(obj)
    if isinstance(data, dict) and "message" in data:
        m = str(data["message"]).lower()
        if "does not exist" in m and "column" in m:
            return True
    t = txt.lower()
    if "does not exist" in t and "column" in t:
        return True
    return False


def _execute_query_safe(builder_call_fn):
    """
    Execute a supabase builder call. `builder_call_fn` is a zero-arg function
    that performs something like `q.order(...).execute()` or `q.execute()` and
    returns the result. This wrapper catches exceptions and returns them,
    so callers can inspect them via _is_... helpers.
    """
    try:
        return builder_call_fn()
    except Exception as ex:
        return ex


# -------------------------
# Payroll endpoints
# -------------------------
@router.post("/compute", response_model=PayslipResponse)
def compute_preview(req: ComputeRequest = Body(...)):
    try:
        payslip = services.compute_payslip(req.employee_id, req.payroll_period_id, req.attendance or {}, req.regime)
        return {"success": True, "payslip": payslip}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/persist", response_model=PayslipResponse, dependencies=[Depends(admin_only)])
def persist_payslip_endpoint(req: PersistRequest = Body(...)):
    try:
        if req.payslip:
            ps = req.payslip
            if "employee_id" not in ps or "payroll_period_id" not in ps:
                raise ValueError("Provided payslip must include 'employee_id' and 'payroll_period_id'")
            persisted = services.persist_payslip(ps)
        else:
            if not req.employee_id or not req.payroll_period_id:
                raise ValueError("employee_id and payroll_period_id are required when not providing a payslip")
            payslip = services.compute_payslip(req.employee_id, req.payroll_period_id, req.attendance or {}, req.regime)
            persisted = services.persist_payslip(payslip)
        return {"success": True, "payslip": persisted}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/run", response_model=RunResultResponse, dependencies=[Depends(admin_only)])
def run_payroll_endpoint(req: RunRequest = Body(...)):
    try:
        result = services.run_payroll_for_period(req.payroll_period_id, run_by=req.run_by)
        return {"success": True, "result": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/runs/{run_id}")
def get_run(run_id: int = Path(..., description="Payroll run id")):
    try:
        res = supabase.table("payroll_runs").select("*").eq("id", run_id).single().execute()
        if not res or getattr(res, "status_code", None) != 200 or not getattr(res, "data", None):
            raise HTTPException(status_code=404, detail="Payroll run not found")
        return {"success": True, "run": res.data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/periods")
def list_periods():
    try:
        res = supabase.table("payroll_periods").select("*").order("period_start", desc=True).execute()
        if not res or getattr(res, "status_code", None) != 200:
            return {"success": True, "periods": []}
        return {"success": True, "periods": getattr(res, "data", [])}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/payslips/{employee_id}")
def list_payslips_for_employee(employee_id: str = Path(...), limit: Optional[int] = Query(50)):
    try:
        res = supabase.table("payslips").select("*").eq("employee_id", employee_id).order("id", desc=True).limit(limit).execute()
        if not res or getattr(res, "status_code", None) != 200:
            return {"success": True, "payslips": []}
        return {"success": True, "payslips": getattr(res, "data", [])}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/payslip/{employee_id}/{payroll_period_id}")
def get_payslip(employee_id: str = Path(...), payroll_period_id: int = Path(...)):
    try:
        # Try persisted payslip first (payslips table)
        res = supabase.table("payslips").select("*").eq("employee_id", employee_id).eq("payroll_period_id", payroll_period_id).limit(1).execute()
        if res and getattr(res, "status_code", None) == 200 and getattr(res, "data", None):
            data = res.data or []
            if data:
                return {"success": True, "payslip": data[0], "persisted": True}

        # Not persisted — compute preview (no attendance)
        payslip = services.compute_payslip(employee_id, payroll_period_id, {}, "new")
        return {"success": True, "payslip": payslip, "computed": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# -------------------------
# Bonuses endpoints (robust)
# -------------------------
@router.post("/bonuses", dependencies=[Depends(admin_only)])
def create_bonus(b: BonusCreate = Body(...)):
    payload = b.dict()
    if "is_percentage" not in payload:
        payload["is_percentage"] = False

    candidate_tables = ["bonuses", "employee_bonuses"]
    last_err = None

    for tbl in candidate_tables:
        try:
            res = _execute_query_safe(lambda: supabase.table(tbl).insert(payload).execute())
            # success
            if getattr(res, "status_code", None) in (200, 201):
                data = getattr(res, "data", None) or []
                return {"success": True, "bonus": data[0] if isinstance(data, list) and data else data}
            # table not found?
            if _is_table_not_found(res):
                last_err = _extract_resp_info(res)[1]
                continue
            # other error -> return
            last_err = _extract_resp_info(res)[1]
            raise HTTPException(status_code=400, detail=f"Failed to create bonus in {tbl}: {last_err}")
        except HTTPException:
            raise
        except Exception as ex:
            txt = str(ex).lower()
            last_err = txt
            if "could not find the table" in txt or "does not exist" in txt or "pgrst205" in txt:
                continue
            raise HTTPException(status_code=400, detail=str(ex))

    raise HTTPException(status_code=400, detail="Failed to persist bonus: no bonuses table found (tried 'bonuses' and 'employee_bonuses').")


# Replace only the list_bonuses function in app/payroll/routes.py with this implementation
# Replace the existing list_bonuses function with this exact implementation

@router.get("/bonuses/{employee_id}")
def list_bonuses(employee_id: str = Path(...), include_paid: Optional[bool] = Query(False)):
    tbl = "bonuses"

    def try_query(with_is_paid: bool):
        try:
            q = supabase.table(tbl).select("*").eq("employee_id", employee_id)
            if with_is_paid:
                q = q.eq("is_paid", False)
            res = q.order("created_at", desc=True).execute()
            return res
        except Exception as ex:
            return ex

    attempts = []
    if not include_paid:
        attempts.append(True)
    attempts.append(False)

    for with_is_paid in attempts:
        res = try_query(with_is_paid)
        if getattr(res, "status_code", None) == 200:
            data = getattr(res, "data", [])
            logger.info("list_bonuses: success (with_is_paid=%s) rows=%d", with_is_paid, len(data or []))
            return {"success": True, "bonuses": data or []}

        txt = str(getattr(res, "data", res))
        logger.debug("list_bonuses: attempt with_is_paid=%s produced: %s", with_is_paid, txt)

        # if is_paid doesn't exist, try without it
        if with_is_paid and "does not exist" in txt.lower() and "column" in txt.lower():
            continue

        # other errors -> return empty list but log
        logger.error("list_bonuses: error fetching from %s: %s", tbl, txt)
        return {"success": True, "bonuses": []}

    logger.warning("list_bonuses: exhausted attempts, returning empty list")
    return {"success": True, "bonuses": []}

# --- debug endpoint so you can confirm this file is loaded ---
@router.get("/debug/which-bonuses-version")
def debug_bonuses_version():
    return {"ok": True, "which": "bonuses-handler-v2", "ts": datetime.utcnow().isoformat()}
    

@router.post("/payslip/{payslip_id}/finalize", dependencies=[Depends(admin_only)])
def finalize_payslip(payslip_id: str = Path(...), finalized_by: Optional[str] = Body(None)):
    try:
        now_iso = datetime.utcnow().replace(tzinfo=timezone.utc).isoformat()
        update_payload = {
            "status": "FINALIZED",
            "finalized_by": finalized_by,
            "finalized_at": now_iso,
            "updated_at": now_iso,
        }
        res = supabase.table("payslips").update(update_payload).eq("id", payslip_id).execute()
        if not res or getattr(res, "status_code", None) not in (200, 201):
            raise HTTPException(status_code=400, detail=f"Failed to finalize payslip: {getattr(res, 'data', res)}")
        data = getattr(res, "data", None)
        return {"success": True, "payslip": data[0] if isinstance(data, list) and data else data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
