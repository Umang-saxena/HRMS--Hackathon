from pydantic import BaseModel
from typing import Optional

class UserLogin(BaseModel):
    email: str
    password: str

class UserSignup(BaseModel):
    email: str
    password: str

class AuthResponse(BaseModel):
    user: dict
    session: Optional[dict] = None
