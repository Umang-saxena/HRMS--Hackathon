from pydantic import BaseModel
from typing import Optional, Any, Dict, List

class Job(BaseModel):
    id: Optional[str] = None
    title: Optional[str] = None
    department_id: Optional[str] = None
    location: Optional[str] = None
    employment_type: Optional[str] = None
    description: Optional[str] = None
    requirements: Optional[List[str]] = None
    responsibilities: Optional[List[str]] = None
    salary_range: Optional[str] = None
    status: Optional[str] = None
    created_by: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    experience_required: Optional[str] = None
    # Add other fields as needed, or use a generic dict for all fields
    additional_fields: Optional[Dict[str, Any]] = None
