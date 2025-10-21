# backend/app/leave/schemas.py
from pydantic import BaseModel, Field
from datetime import date, datetime
from typing import Optional
from uuid import UUID

class LeaveApplyIn(BaseModel):
    employee_id: UUID
    leave_type: str    # "Casual" or "Sick"
    start_date: date
    end_date: date
    reason: str

class LeaveOut(BaseModel):
    id: UUID
    employee_id: UUID
    approved_by: Optional[UUID]
    created_at: datetime
    updated_at: datetime
    start_date: date
    end_date: date
    leave_type: str
    reason: str
    status: str

    class Config:
        orm_mode = True

class UpdateStatusIn(BaseModel):
    status: str  # "Approved" | "Rejected" | "Pending"
    approved_by: Optional[UUID] = None
