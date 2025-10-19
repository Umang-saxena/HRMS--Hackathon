# backend/app/performance/routes.py
import logging
import uuid
import math
import base64
import json
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Optional, Any, Dict, List

from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel

from app.supabase_client import supabase  # your Supabase client

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/performance", tags=["performance"])


# ---------------------------
# Request / helper models
# ---------------------------
class ComputeRequest(BaseModel):
    employee_id: str
    start: Optional[str] = None        # ISO date "YYYY-MM-DD"
    end: Optional[str] = None
    review_period: Optional[str] = None


def numeric_to_float(v: Any) -> float:
    if v is None:
        return 0.0
    if isinstance(v, Decimal):
        return float(v)
    try:
        return float(v)
    except Exception:
        return 0.0


# ---------------------------
# Response parsing helper
# ---------------------------
def _extract_resp(resp: Any) -> Dict[str, Any]:
    """
    Given a Supabase client response, return a dict with keys:
      - data: the data array or None
      - error: error object or None
      - status: status code or None
    Works for attribute-style or dict-like responses.
    """
    data = None
    error = None
    status = None

    if hasattr(resp, "data"):
        data = getattr(resp, "data")
    if hasattr(resp, "error"):
        error = getattr(resp, "error")
    if hasattr(resp, "status_code"):
        status = getattr(resp, "status_code")

    # dict-like fallback
    if data is None:
        try:
            resp_dict = dict(resp)
            data = resp_dict.get("data", data)
            error = error or resp_dict.get("error", None)
            status = status or resp_dict.get("status_code", resp_dict.get("status", None))
        except Exception:
            pass

    return {"data": data, "error": error, "status": status}


# ---------------------------
# Scoring logic (component -> scaled 0-25)
# ---------------------------
def compute_scores_from_metrics(metrics: List[Dict[str, Any]]) -> Dict[str, int]:
    """
    Compute component scores in 0-100, then scale them to 0-25 to satisfy DB CHECK.
    Returns component scores already scaled to 0-25.
    """
    if not metrics:
        return {"quality_score": 0, "productivity_score": 0, "teamwork_score": 0, "communication_score": 0}

    total_progress = 0.0
    total_attendance = 0.0
    total_task_days = 0.0
    total_tasks_assigned = 0
    total_tasks_completed = 0
    count = 0

    for m in metrics:
        total_progress += numeric_to_float(m.get("avg_progress_percent"))
        total_attendance += numeric_to_float(m.get("attendance_rate"))
        total_task_days += numeric_to_float(m.get("avg_task_completion_days"))
        total_tasks_assigned += int(m.get("tasks_assigned") or 0)
        total_tasks_completed += int(m.get("tasks_completed") or 0)
        count += 1

    avg_progress = (total_progress / count) if count else 0.0      # 0-100
    avg_attendance = (total_attendance / count) if count else 0.0  # 0-100
    avg_completion_days = (total_task_days / count) if count else 0.0
    productivity_pct = (total_tasks_completed / total_tasks_assigned * 100) if total_tasks_assigned else 0.0

    # compute components on 0-100 scale
    quality_100 = round(0.8 * avg_progress + 0.2 * avg_attendance)

    speed_score = 0
    if avg_completion_days > 0:
        speed_score = max(0, min(100, round((1 - min(avg_completion_days, 20) / 20) * 100)))
    productivity_100 = round(0.7 * productivity_pct + 0.3 * speed_score)

    teamwork_100 = round(0.6 * avg_attendance + 0.4 * (avg_progress * 0.8))
    communication_100 = round(0.5 * avg_progress + 0.5 * avg_attendance)

    def clamp_0_100(x):
        return int(max(0, min(100, round(x or 0))))

    quality_100 = clamp_0_100(quality_100)
    productivity_100 = clamp_0_100(productivity_100)
    teamwork_100 = clamp_0_100(teamwork_100)
    communication_100 = clamp_0_100(communication_100)

    # SCALE to 0-25 for DB constraint (linear mapping)
    def scale_to_25(x100: int) -> int:
        return int(max(0, min(25, round(x100 * 0.25))))

    quality_25 = scale_to_25(quality_100)
    productivity_25 = scale_to_25(productivity_100)
    teamwork_25 = scale_to_25(teamwork_100)
    communication_25 = scale_to_25(communication_100)

    return {
        "quality_score": quality_25,
        "productivity_score": productivity_25,
        "teamwork_score": teamwork_25,
        "communication_score": communication_25,
    }


# ---------------------------
# Auth dependency: get current user from Authorization header
# ---------------------------
def _decode_jwt_payload(token: str) -> dict:
    """
    Decode JWT payload without verifying signature.
    Returns payload as dict. Safe for extracting 'sub' or 'user' claim.
    """
    try:
        parts = token.split(".")
        if len(parts) < 2:
            return {}
        payload_b64 = parts[1]
        # Fix padding
        padding = '=' * (-len(payload_b64) % 4)
        payload_b64 += padding
        payload_bytes = base64.urlsafe_b64decode(payload_b64)
        payload = json.loads(payload_bytes.decode("utf-8"))
        return payload
    except Exception:
        return {}

def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """
    Robust auth helper:
      - Accepts "Authorization: Bearer <token>"
      - Decodes JWT payload to find user id (sub)
      - Verifies the user id exists in users table
      - Returns a minimal user dict {"id": "<uuid>"} if found
    Note: This function DOES NOT verify token signature. For production,
    verify the token using Supabase public key or supabase.auth methods.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    parts = authorization.split()
    if len(parts) != 2:
        raise HTTPException(status_code=401, detail="Invalid Authorization header")
    scheme, token = parts
    if scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Authorization header must be Bearer token")

    # decode payload and extract 'sub' or 'user' fields
    payload = _decode_jwt_payload(token)
    user_id = None
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    # common places for user id: 'sub' or 'user'->'id' or 'user_id'
    if "sub" in payload:
        user_id = payload.get("sub")
    elif "user_id" in payload:
        user_id = payload.get("user_id")
    elif "user" in payload and isinstance(payload["user"], dict):
        user_id = payload["user"].get("id") or payload["user"].get("sub")

    if not user_id:
        raise HTTPException(status_code=401, detail="Authenticated user id not found in token payload")

    # verify user exists in Supabase users table
    user_resp = supabase.from_("users").select("id, email").eq("id", user_id).limit(1).execute()
    parsed = _extract_resp(user_resp)
    if parsed["status"] is not None and int(parsed["status"]) >= 400:
        logger.error("Supabase users lookup failed: %s", parsed)
        raise HTTPException(status_code=500, detail="User lookup failed")
    if not (parsed["data"]):
        # no user record — token might be valid but user not present; reject
        raise HTTPException(status_code=401, detail="Authenticated user id not found")

    # return minimal user dict (you can expand if needed)
    return {"id": user_id, "email": parsed["data"][0].get("email")}


# ---------------------------
# Endpoint
# ---------------------------
@router.post("/compute-metrics")
def compute_metrics(req: ComputeRequest, current_user: Dict[str, Any] = Depends(get_current_user)):
    try:
        # parse dates
        if req.start:
            start_date = datetime.fromisoformat(req.start).date()
        else:
            start_date = (datetime.utcnow().date() - timedelta(days=30))
        if req.end:
            end_date = datetime.fromisoformat(req.end).date()
        else:
            end_date = datetime.utcnow().date()

        review_period = (
            datetime.fromisoformat(req.review_period).date() if req.review_period else start_date
        )

        # Query Supabase for metrics overlapping the requested period:
        raw_resp = (
            supabase
            .from_("performance_metrics")
            .select("*")
            .eq("employee_id", req.employee_id)
            .lte("period_start", str(end_date))
            .gte("period_end", str(start_date))
            .execute()
        )

        logger.debug("Raw supabase metrics response: %s", getattr(raw_resp, "__dict__", str(raw_resp)))
        parsed = _extract_resp(raw_resp)
        if parsed["status"] is not None and int(parsed["status"]) >= 400:
            logger.error("Supabase metrics query bad status %s: %s", parsed["status"], parsed)
            raise HTTPException(status_code=500, detail="DB query failed with status " + str(parsed["status"]))
        if parsed["error"]:
            logger.error("Supabase metrics query error: %s", parsed["error"])
            raise HTTPException(status_code=500, detail="DB query failed: " + str(parsed["error"]))

        metrics = parsed["data"] or []
        logger.info("compute-metrics: emp=%s metrics_found=%d period=%s..%s", req.employee_id, len(metrics), start_date, end_date)

        # compute component scores (0-25) and overall (sum -> 0-100)
        comps = compute_scores_from_metrics(metrics)
        overall_int = int(comps["quality_score"] + comps["productivity_score"] + comps["teamwork_score"] + comps["communication_score"])

        # Reviewer is the authenticated user
        reviewer_id = current_user.get("id")
        if not reviewer_id:
            raise HTTPException(status_code=401, detail="Authenticated user id missing")

        # Ensure employee exists in users table (prevent FK error)
        # Ensure employee exists in users table (prevent FK error)
        emp_check = (
            supabase
            .from_("employees")
            .select("id")
            .eq("id", req.employee_id)
            .limit(1)
            .execute()
        )

        parsed_emp = _extract_resp(emp_check)
        if parsed_emp["status"] is not None and int(parsed_emp["status"]) >= 400:
            logger.error("Supabase employees lookup failed: %s", parsed_emp)
            raise HTTPException(status_code=500, detail="Employee lookup failed")
        if not (parsed_emp["data"]):
            raise HTTPException(status_code=400, detail=f"employee_id {req.employee_id} not found in employees table")


        # Ensure reviewer exists in users table (defensive; auth should guarantee this)
        rev_check = supabase.from_("users").select("id").eq("id", reviewer_id).limit(1).execute()
        parsed_rev = _extract_resp(rev_check)
        if parsed_rev["status"] is not None and int(parsed_rev["status"]) >= 400:
            logger.error("Supabase reviewer lookup failed: %s", parsed_rev)
            raise HTTPException(status_code=500, detail="Reviewer lookup failed")
        if not (parsed_rev["data"]):
            # This is unlikely if the token was valid, but better to be explicit
            raise HTTPException(status_code=400, detail=f"authenticated reviewer_id {reviewer_id} not present in users table")

        # Build the row to insert (matches performance_scores schema)
        row = {
            "id": str(uuid.uuid4()),
            "employee_id": req.employee_id,
            "reviewer_id": reviewer_id,
            "review_period": str(review_period),
            "quality_score": comps["quality_score"],
            "productivity_score": comps["productivity_score"],
            "teamwork_score": comps["teamwork_score"],
            "communication_score": comps["communication_score"],
            "overall_score": overall_int,
            "comments": None,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        }

        # Insert into plural table name
        insert_resp = supabase.from_("performance_scores").insert(row).execute()
        logger.debug("Raw supabase insert response: %s", getattr(insert_resp, "__dict__", str(insert_resp)))
        parsed_insert = _extract_resp(insert_resp)
        if parsed_insert["status"] is not None and int(parsed_insert["status"]) >= 400:
            logger.exception("Supabase insert bad status %s: %s", parsed_insert["status"], parsed_insert)
            raise HTTPException(status_code=500, detail="DB insert failed with status " + str(parsed_insert["status"]))
        if parsed_insert["error"]:
            logger.exception("Supabase insert error: %s", parsed_insert["error"])
            raise HTTPException(status_code=500, detail="DB insert failed: " + str(parsed_insert["error"]))

        inserted = parsed_insert["data"][0] if parsed_insert["data"] else row
        return {"success": True, "results": [inserted]}

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("compute-metrics failed unexpectedly")
        raise HTTPException(status_code=500, detail=str(e))
