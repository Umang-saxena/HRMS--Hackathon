# backend/app/leave/models.py
import enum
import uuid
from sqlalchemy import Column, Date, DateTime, Text, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from app.db import Base

# ENUM types for leave type and status
class LeaveType(str, enum.Enum):
    CASUAL = "Casual"
    SICK = "Sick"

class LeaveStatus(str, enum.Enum):
    PENDING = "Pending"
    APPROVED = "Approved"
    REJECTED = "Rejected"


# === MAIN LEAVE TABLE ===
class Leave(Base):
    __tablename__ = "leaves"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False)
    employee_id = Column(PG_UUID(as_uuid=True), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    approved_by = Column(PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    leave_type = Column(Text, nullable=False)
    reason = Column(Text, nullable=False)
    status = Column(Text, nullable=False, default=LeaveStatus.PENDING.value)

    # 🚫 Relationships intentionally removed to avoid mapper initialization errors
    # (You can re-enable them later once everything works)


# === WARNING TABLE (for exceeded leave limits) ===
class LeaveWarning(Base):
    __tablename__ = "leave_warnings"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False)
    employee_id = Column(PG_UUID(as_uuid=True), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
