from pydantic import BaseModel
from typing import Optional, Any, Dict

class Job(BaseModel):
    id: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    salary: Optional[str] = None
    requirements: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    # Add other fields as needed, or use a generic dict for all fields
    additional_fields: Optional[Dict[str, Any]] = None
