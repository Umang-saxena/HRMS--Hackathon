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

class UserSignup(BaseModel):
    email: str
    password: str
    role: Optional[Role] = Role.employee

class AuthResponse(BaseModel):
    user: dict
    session: Optional[dict] = None
    role: Optional[str] = None
