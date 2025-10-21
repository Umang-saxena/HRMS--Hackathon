# backend/app/models/employee.py
from sqlalchemy import Column, String, Date, Numeric, TIMESTAMP, text
from sqlalchemy.dialects.postgresql import UUID
from app.db import Base
import uuid

class Employee(Base):
    __tablename__ = "employees"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    role = Column(String, nullable=True)
    department_id = Column(UUID(as_uuid=True), nullable=True)
    company_id = Column(UUID(as_uuid=True), nullable=True)
    date_of_joining = Column(Date, nullable=True)
    salary = Column(Numeric, nullable=True)
    employment_status = Column(String, nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=text("now()"))
