# backend/app/leave/routes.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.db import get_db
from app.leave import services
from app.leave.schemas import LeaveApplyIn

router = APIRouter(prefix="/api/leave", tags=["leave"])


@router.post("/apply", status_code=status.HTTP_201_CREATED)
def apply_leave(payload: LeaveApplyIn, db: Session = Depends(get_db)):
    """
    Employee applies for leave. Returns a JSON with message and leave_id.
    """
    result = services.apply_leave(db, payload)
    return result


@router.post("/approve", status_code=status.HTTP_200_OK)
def approve_leave(leave_id: UUID, admin_id: UUID, db: Session = Depends(get_db)):
    """
    Admin approves leave. Provide leave_id and admin_id in request body or query.
    Example body: { "leave_id": "...", "admin_id": "..." }
    """
    return services.approve_leave(db, leave_id, admin_id)


@router.post("/reject", status_code=status.HTTP_200_OK)
def reject_leave(leave_id: UUID, admin_id: UUID, db: Session = Depends(get_db)):
    """
    Admin rejects leave.
    """
    return services.reject_leave(db, leave_id, admin_id)


@router.get("/employee/{employee_id}")
def get_employee_leaves(employee_id: UUID, db: Session = Depends(get_db)):
    return services.get_employee_leaves(db, employee_id)


@router.get("/pending")
def get_pending_leaves(db: Session = Depends(get_db)):
    return services.get_pending_leaves(db)
