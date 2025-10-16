# backend/app/performance/schemas.py
from pydantic import BaseModel
from typing import Optional
from datetime import date

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    assigned_to: str  # uuid
    assigned_by: Optional[str] = None
    due_date: Optional[date] = None
    priority: Optional[str] = "medium"

class TaskUpdate(BaseModel):
    updated_by: str
    update_text: Optional[str] = None
    progress_percent: Optional[int] = None
    attached_url: Optional[str] = None

class TaskConfirm(BaseModel):
    confirmed_by: str
    confirmed: bool
    comment: Optional[str] = None

class ComputeMetricsRequest(BaseModel):
    start: str  # 'YYYY-MM-DD'
    end: str

class PredictRequest(BaseModel):
    employee_id: str
    start: str
    end: str
