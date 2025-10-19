# app/models/performance.py
from pydantic import BaseModel, Field
from typing import Optional
from datetime import date

class PerformanceMetricRow(BaseModel):
    id: Optional[str]
    employee_id: Optional[str]
    period_start: date
    period_end: date
    tasks_assigned: Optional[int] = 0
    tasks_completed: Optional[int] = 0
    avg_task_completion_days: Optional[float] = 0.0
    avg_progress_percent: Optional[float] = 0.0
    attendance_rate: Optional[float] = 0.0

class PerformanceScoreIn(BaseModel):
    employee_id: str
    reviewer_id: str
    review_period: date
    quality_score: int
    productivity_score: int
    teamwork_score: int
    communication_score: int
    overall_score: int
    comments: Optional[str] = None
