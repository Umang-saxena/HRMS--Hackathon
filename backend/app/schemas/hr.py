from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class JobCreate(BaseModel):
    title: str
    department_id: str  # Department ID as string
    location: str  # Required location
    employment_type: str  # e.g., 'Full-Time', 'Part-Time', etc.
    description: str
    requirements: Optional[List[str]] = []
    responsibilities: Optional[List[str]] = []
    salary_range: Optional[str] = None
    experience_required: Optional[str] = None  # Text field as per DB schema

class JobResponse(BaseModel):
    id: str
    title: str
    department_id: str
    location: str
    employment_type: str
    description: str
    requirements: List[str]
    responsibilities: List[str]
    salary_range: Optional[str] = None
    status: str
    created_by: str
    created_at: datetime
    updated_at: datetime
    experience_required: Optional[str] = None

class DepartmentCreate(BaseModel):
    name: str

class DepartmentResponse(BaseModel):
    id: str
    name: str
    created_at: datetime
