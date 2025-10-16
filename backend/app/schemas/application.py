from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class JobApplicationCreate(BaseModel):
    cover_letter: Optional[str] = None
    resume_url: Optional[str] = None
    additional_info: Optional[str] = None

class JobApplicationResponse(BaseModel):
    id: str
    job_id: str
    candidate_id: str
    ai_score: Optional[float] = None
    match_reason: Optional[str] = None
    screening_status: str
    applied_at: datetime
    updated_at: datetime
    cover_letter: Optional[str] = None
    resume_url: Optional[str] = None
    additional_info: Optional[str] = None
