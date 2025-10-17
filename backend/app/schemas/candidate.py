from pydantic import BaseModel
from typing import Optional, List

class CandidateSettings(BaseModel):
    first_name: str
    last_name: str
    email: str
    phone_number: Optional[str] = None
    address: Optional[str] = None
    resume_url: str

    # Profile Preferences
    display_name: Optional[str] = None
    bio: Optional[str] = None
    profile_picture_url: Optional[str] = None
    cover_photo_url: Optional[str] = None
    education: str = []
    work_experience: Optional[List[str]] = []
    certifications: Optional[List[str]] = []
    languages_known: Optional[List[str]] = []
    location: Optional[str] = None
    website: Optional[str] = None
    linkedin: str
    github:str

    # Notification Settings
    email_job_alerts: Optional[bool] = True
    email_application_updates: Optional[bool] = True
    email_offer_updates: Optional[bool] = True
    email_newsletter: Optional[bool] = False

class CandidateSettingsUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone_number: Optional[str] = None
    address: Optional[str] = None
    resume_url: Optional[str] = None

    # Profile Preferences
    display_name: Optional[str] = None
    bio: Optional[str] = None
    profile_picture_url: Optional[str] = None
    cover_photo_url: Optional[str] = None
    education: Optional[List[str]] = None
    work_experience: Optional[List[str]] = None
    certifications: Optional[List[str]] = None
    languages_known: Optional[List[str]] = None
    location: Optional[str] = None
    website: Optional[str] = None
    linkedin: Optional[str] = None
    github: Optional[str] = None

    # Notification Settings
    email_job_alerts: Optional[bool] = None
    email_application_updates: Optional[bool] = None
    email_offer_updates: Optional[bool] = None
    email_newsletter: Optional[bool] = None

class CandidateSettingsResponse(BaseModel):
    user_id: str
    settings: CandidateSettings
    updated_at: Optional[str] = None
