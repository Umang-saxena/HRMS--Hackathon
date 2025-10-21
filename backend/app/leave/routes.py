# backend/app/leave/routes.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db import get_db
from app.leave import services

router = APIRouter(prefix="/api/leave", tags=["leave"])

@router.post("/apply", status_code=201)
def apply_leave(payload: dict, db: Session = Depends(get_db)):
    try:
        leave = services.apply_leave(db, payload)
        return leave
    except ValueError as ve:
        # missing required fields -> 422
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(ve))
    except Exception as e:
        # unexpected -> 500 (development: return message)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/_smoke_test_apply", status_code=201)
def smoke_apply(payload: dict, db: Session = Depends(get_db)):
    return apply_leave(payload, db)

@router.get("/list")
def list_leaves(db: Session = Depends(get_db)):
    return services.get_all_leaves(db)

@router.post("/approve")
def approve(payload: dict, db: Session = Depends(get_db)):
    leave_id = payload.get("leave_id")
    admin_id = payload.get("admin_id")
    if not leave_id or not admin_id:
        raise HTTPException(status_code=422, detail="leave_id and admin_id required")
    leave = services.approve_leave(db, leave_id, admin_id)
    if not leave:
        raise HTTPException(status_code=404, detail="Leave not found")
    return leave
