from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class CompanyCreate(BaseModel):
    name: str
    description: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None

class CompanyResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class EmployeeCreate(BaseModel):
    first_name: str
    last_name: str
    email: str
    phone: Optional[str] = None
    department_id: str
    company_id: str
    role: Optional[str] = None
    date_of_joining: Optional[str] = None
    salary: Optional[float] = None
    employment_status: Optional[str] = "active"

class EmployeeResponse(BaseModel):
    id: str
    first_name: str
    last_name: str
    email: str
    phone: Optional[str] = None
    department_id: Optional[str] = None
    company_id: Optional[str] = None
    role: Optional[str] = None
    date_of_joining: Optional[str] = None
    salary: Optional[float] = None
    employment_status: str
    created_at: datetime
