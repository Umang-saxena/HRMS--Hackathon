from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class JobCreate(BaseModel):
    title: str
    department_id: str  # UUID as string
    description: str
    location: Optional[str] = None
    job_type: str  # e.g., 'Full-Time'
    experience_required: Optional[float] = None
    skills_required: Optional[List[str]] = None
    salary_range: Optional[str] = None
    openings: Optional[int] = 1

class JobResponse(BaseModel):
    id: str
    title: str
    department_id: str
    created_by: Optional[str] = None
    description: str
    location: Optional[str] = None
    job_type: str
    experience_required: Optional[float] = None
    skills_required: Optional[List[str]] = None
    salary_range: Optional[str] = None
    openings: int
    status: str
    created_at: datetime
    updated_at: datetime

class DepartmentCreate(BaseModel):
    name: str

class DepartmentResponse(BaseModel):
    id: str
    name: str
    created_at: datetime
