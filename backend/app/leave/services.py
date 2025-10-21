# backend/app/leave/services.py
from sqlalchemy.orm import Session
from app.leave.models import Leave
from datetime import datetime
from typing import Any, Mapping

def _get(payload: Any, key: str, default=None):
    """
    Helper: read from dict-like or object-with-attributes.
    """
    try:
        # dict-like
        if isinstance(payload, Mapping):
            return payload.get(key, default)
        # object-like (pydantic model)
        return getattr(payload, key, default)
    except Exception:
        return default

def apply_leave(db: Session, payload: Any):
    """
    Create a Leave row. payload may be a dict or a Pydantic model.
    """
    employee_id = _get(payload, "employee_id")
    leave_type = _get(payload, "leave_type")
    start_date = _get(payload, "start_date")
    end_date = _get(payload, "end_date")
    reason = _get(payload, "reason")

    if not all([employee_id, leave_type, start_date, end_date, reason]):
        raise ValueError("Missing required fields: employee_id, leave_type, start_date, end_date, reason")

    # If start_date/end_date are strings, you may want to coerce to date here.
    leave = Leave(
        employee_id=employee_id,
        leave_type=leave_type,
        start_date=start_date,
        end_date=end_date,
        reason=reason,
        status="Pending",
    )
    db.add(leave)
    db.commit()
    db.refresh(leave)
    return leave

def get_all_leaves(db: Session):
    return db.query(Leave).order_by(Leave.created_at.desc()).all()

def get_pending_leaves(db: Session):
    return db.query(Leave).filter(Leave.status == "Pending").order_by(Leave.created_at.desc()).all()

def approve_leave(db: Session, leave_id: str, admin_id: str):
    leave = db.query(Leave).filter(Leave.id == leave_id).first()
    if not leave:
        return None
    leave.status = "Approved"
    leave.approved_by = admin_id
    leave.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(leave)
    return leave

def reject_leave(db: Session, leave_id: str, admin_id: str):
    leave = db.query(Leave).filter(Leave.id == leave_id).first()
    if not leave:
        return None
    leave.status = "Rejected"
    leave.approved_by = admin_id
    leave.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(leave)
    return leave
