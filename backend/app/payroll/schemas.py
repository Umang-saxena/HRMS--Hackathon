# app/payroll/schemas.py
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import date, datetime

# --- Request models ---

class ComputeRequest(BaseModel):
    """
    Request to compute a payslip preview.
    employee_id should be a UUID string.
    payroll_period_id corresponds to payroll_periods.id (bigint).
    """
    employee_id: str = Field(..., description="Employee UUID")
    payroll_period_id: int = Field(..., description="Payroll period id (bigint)")
    attendance: Optional[Dict[str, int]] = Field(None, description="Attendance info: {working_days, present_days}")
    regime: Optional[str] = Field('new', description="Tax regime name or identifier")


class BonusCreate(BaseModel):
    """
    Create a bonus for an employee. employee_id is UUID string.
    """
    employee_id: str = Field(..., description="Employee UUID")
    code: Optional[str] = Field('BONUS', description="Bonus code")
    amount: float = Field(..., description="Amount or percent value (depending on is_percentage)")
    is_percentage: Optional[bool] = Field(False, description="If true, amount is percentage of percent_of_component")
    percent_of_component: Optional[str] = Field(None, description="Component code (eg. BASIC) if is_percentage")
    bonus_type: Optional[str] = Field('ONE_TIME', description="ONE_TIME | RECURRING_MONTHLY | RECURRING_YEARLY")
    effective_from: Optional[date] = Field(None)
    effective_to: Optional[date] = Field(None)
    notes: Optional[str] = None


class PersistRequest(BaseModel):
    """
    Persist a payslip. You can either provide `payslip` (full dictionary) or provide
    employee_id + payroll_period_id (the server will compute then persist).
    """
    employee_id: Optional[str] = Field(None, description="Employee UUID (required if payslip not provided)")
    payroll_period_id: Optional[int] = Field(None, description="Payroll period id (required if payslip not provided)")
    attendance: Optional[Dict[str, int]] = None
    regime: Optional[str] = 'new'
    payslip: Optional[Dict[str, Any]] = Field(None, description="Full payslip dict (if you already computed it client-side)")


class RunRequest(BaseModel):
    """
    Run payroll for an entire payroll period (bulk).
    """
    payroll_period_id: int = Field(..., description="Payroll period id (bigint)")
    run_by: Optional[str] = Field(None, description="Identifier/email of the user running payroll (for audit)")


# --- Response models / helpers ---

class PayslipBreakdownItem(BaseModel):
    amount: float
    type: Optional[str] = None
    is_taxable: Optional[bool] = True


class PayslipModel(BaseModel):
    employee_id: str
    payroll_period_id: int
    gross_salary: float
    total_deductions: float
    net_salary: float
    total_employer_cost: Optional[float] = None
    breakdown: Dict[str, PayslipBreakdownItem]
    computed_at: Optional[str] = None  # ISO timestamp


class PayslipResponse(BaseModel):
    success: bool
    payslip: Dict[str, Any]


class RunResultResponse(BaseModel):
    success: bool
    result: Dict[str, Any]


# --- Convenience / list responses ---

class BonusResponse(BaseModel):
    success: bool
    bonus: Optional[Dict[str, Any]] = None


class BonusesListResponse(BaseModel):
    success: bool
    bonuses: List[Dict[str, Any]] = []
