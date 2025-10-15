# app/payroll/schemas.py
from pydantic import BaseModel
from typing import Optional, Dict
from datetime import date

class ComputeRequest(BaseModel):
    employee_id: int
    payroll_period_id: int
    attendance: Optional[Dict[str, int]] = None
    regime: Optional[str] = 'new'

class BonusCreate(BaseModel):
    employee_id: int
    code: Optional[str] = 'BONUS'
    amount: float
    is_percentage: Optional[bool] = False
    percent_of_component: Optional[str] = None
    bonus_type: Optional[str] = 'ONE_TIME'
    effective_from: Optional[date] = None
    effective_to: Optional[date] = None
    notes: Optional[str] = None
