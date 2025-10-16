from pydantic import BaseModel
from typing import Optional
from enum import Enum

class UserLogin(BaseModel):
    email: str
    password: str

class Role(str, Enum):
    employee = "employee"
    hr = "hr"
    admin = "admin"
    candidate = "candidate"

class UserSignup(BaseModel):
    email: str
    password: str
    role: Optional[Role] = Role.candidate
    company_id: Optional[str] = None
    company_name: Optional[str] = None

class AuthResponse(BaseModel):
    user: dict
    session: Optional[dict] = None
    role: Optional[str] = None
