# app/payroll/routes.py
from fastapi import APIRouter, HTTPException, Body, Query
from app.payroll.schemas import ComputeRequest, BonusCreate
from app.payroll.services import compute_payslip, persist_payslip, run_payroll_for_period, get_active_bonuses_for_period
from app.supabase_client import supabase

router = APIRouter(prefix="/api/payroll")

@router.post("/compute")
def compute_preview(req: ComputeRequest):
    try:
        payslip = compute_payslip(req.employee_id, req.payroll_period_id, req.attendance or {}, req.regime)
        return {"success": True, "payslip": payslip}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ... add persist, admin/bonus, run, finalize, get etc (same logic as earlier)
