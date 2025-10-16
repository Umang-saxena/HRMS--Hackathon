# backend/app/performance/routes.py
from fastapi import APIRouter, HTTPException, Body
from app.performance.schemas import TaskCreate, TaskUpdate, TaskConfirm, ComputeMetricsRequest, PredictRequest
from app.performance import services

router = APIRouter(prefix="/api/performance")

@router.post("/task")
def api_create_task(payload: TaskCreate):
    try:
        return services.create_task(payload.dict())
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/task/{employee_id}")
def api_list_tasks(employee_id: str):
    try:
        return services.list_tasks_for_employee(employee_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/task/{task_id}/update")
def api_task_update(task_id: str, payload: TaskUpdate):
    try:
        return services.add_task_update(task_id, payload)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/task/{task_id}/confirm")
def api_task_confirm(task_id: str, payload: TaskConfirm):
    try:
        return services.confirm_task(task_id, payload)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/compute-metrics")
def api_compute_metrics(payload: ComputeMetricsRequest = Body(...)):
    try:
        return services.compute_metrics_for_period(payload.start, payload.end)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/predict")
def api_predict(payload: PredictRequest):
    try:
        return services.predict_risk_for_employee(payload.employee_id, payload.start, payload.end)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
