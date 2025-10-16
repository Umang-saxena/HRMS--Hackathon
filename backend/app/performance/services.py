# backend/app/performance/services.py
from datetime import datetime, date
from typing import Dict, Any, List
from app.supabase_client import supabase
from app.performance.utils import extract_data
from app.performance.ml_model import load_model, predict_risk
import math

def _serialize_dates(obj: Dict[str, Any]) -> Dict[str, Any]:
    from datetime import datetime as _dt, date as _date
    def conv(v):
        if isinstance(v, (_dt, _date)):
            return v.isoformat()
        if isinstance(v, dict):
            return {k: conv(vv) for k, vv in v.items()}
        if isinstance(v, list):
            return [conv(ii) for ii in v]
        return v
    return {k: conv(v) for k, v in obj.items()}


def create_task(payload: Dict[str, Any]):
    """Insert a new task and return the created record"""
    obj = payload.copy() if isinstance(payload, dict) else payload.dict()
    obj["assigned_at"] = datetime.utcnow().isoformat()

    # Convert all date/datetime fields to strings
    obj = _serialize_dates(obj)

    res = supabase.table("tasks").insert(obj).execute()
    data = extract_data(res)

    if isinstance(data, list) and len(data) > 0:
        task = data[0]
    else:
        task = data

    return {"success": True, "task": task}

# List tasks for employee
def list_tasks_for_employee(employee_id: str):
    res = supabase.table("tasks").select("*").eq("assigned_to", employee_id).order("created_at", desc=True).execute()
    data = extract_data(res) or []
    return {"tasks": data}

# Add task update
def add_task_update(task_id: str, payload):
    obj = payload.copy() if isinstance(payload, dict) else payload.dict()
    obj["task_id"] = task_id
    obj["created_at"] = datetime.utcnow().isoformat()
    res = supabase.table("task_updates").insert(obj).execute()
    data = extract_data(res)
    return {"success": True, "update": (data[0] if data and isinstance(data, list) else data)}

# Confirm task
def confirm_task(task_id: str, payload):
    """
    payload: object with keys: confirmed_by(str), confirmed(bool), comment(opt)
    Maps confirmed -> DB status ('completed'|'cancelled') and updates task.
    """
    obj = payload.copy() if isinstance(payload, dict) else payload.dict()
    # Map to DB canonical statuses (lowercase)
    status = "completed" if obj.get("confirmed") else "cancelled"

    # create confirmation record
    conf = {
        "task_id": task_id,
        "confirmed_by": obj.get("confirmed_by"),
        "confirmed": bool(obj.get("confirmed")),
        "comment": obj.get("comment"),
        "created_at": datetime.utcnow().isoformat()
    }
    # insert confirmation
    res_conf = supabase.table("task_confirmations").insert(_serialize_dates(conf)).execute()
    # update task row (status + updated_at)
    upd = {"status": status, "updated_at": datetime.utcnow().isoformat()}
    res_upd = supabase.table("tasks").update(_serialize_dates(upd)).eq("id", task_id).execute()

    data_conf = extract_data(res_conf)
    data_upd = extract_data(res_upd)
    return {"success": True, "status": status, "confirmation": (data_conf[0] if isinstance(data_conf, list) and data_conf else data_conf)}

# Compute metrics for period (simple aggregator)
def compute_metrics_for_period(start: str, end: str):
    # get all active employees
    res = supabase.table("employees").select("id").execute()
    emps = extract_data(res) or []
    results = []
    for e in emps:
        emp_id = e["id"]
        # tasks assigned in period
        tas = extract_data(supabase.table("tasks").select("id,assigned_at").eq("assigned_to", emp_id).gte("assigned_at", start).lte("assigned_at", end).execute()) or []
        assigned_n = len(tas)
        # task confirmations (confirmed) in period
        confs = extract_data(supabase.table("task_confirmations").select("task_id,created_at").gte("created_at", start).lte("created_at", end).eq("confirmed", True).execute()) or []
        completed_ids = {c["task_id"] for c in confs}
        completed_n = len(completed_ids)
        # avg completion days
        total_days = 0
        for t in tas:
            task_row = extract_data(supabase.table("tasks").select("assigned_at").eq("id", t["id"]).execute())
            conf_row = extract_data(supabase.table("task_confirmations").select("created_at").eq("task_id", t["id"]).execute())
            if task_row and conf_row:
                # normalize shapes
                ta = task_row[0] if isinstance(task_row, list) else task_row
                cf = conf_row[0] if isinstance(conf_row, list) else conf_row
                try:
                    d1 = datetime.fromisoformat(ta["assigned_at"][:19])
                    d2 = datetime.fromisoformat(cf["created_at"][:19])
                    total_days += (d2 - d1).days
                except Exception:
                    pass
        avg_completion_days = (total_days / completed_n) if completed_n > 0 else 0
        # attendance rate
        att_rows = extract_data(supabase.table("attendance").select("status").eq("employee_id", emp_id).gte("date", start).lte("date", end).execute()) or []
        present = sum(1 for a in att_rows if a.get("status") in ("PRESENT", "HALF_DAY"))
        total_days_att = len(att_rows) if att_rows else 0
        attendance_rate = (present / total_days_att) if total_days_att > 0 else 0.0
        metric = {
            "employee_id": emp_id,
            "period_start": start,
            "period_end": end,
            "tasks_assigned": assigned_n,
            "tasks_completed": completed_n,
            "avg_task_completion_days": float(avg_completion_days),
            "avg_progress_percent": 0.0,
            "attendance_rate": float(round(attendance_rate, 4)),
            "last_updated": datetime.utcnow().isoformat()
        }
        supabase.table("performance_metrics").insert(metric).execute()
        results.append(metric)
    return {"success": True, "results": results}

# Predict risk for employee based on metrics
def predict_risk_for_employee(employee_id: str, start: str, end: str):
    """
    Predict risk for an employee for a given period.
    Persists prediction into performance_predictions.model_id using the actual ml_models.id (uuid)
    if available. Returns helpful error messages for debugging.
    """
    from app.performance.ml_model import load_model, predict_risk
    from app.performance.utils import extract_data

    # 1) fetch computed metrics
    try:
        res = supabase.table("performance_metrics")\
            .select("*")\
            .eq("employee_id", employee_id)\
            .eq("period_start", start)\
            .eq("period_end", end)\
            .single()\
            .execute()
        m = extract_data(res)
    except Exception as e:
        return {"error": "supabase_fetch_metrics_failed", "detail": str(e)}

    if not m:
        return {"error": "metrics_not_found", "detail": f"No performance_metrics for {employee_id} {start}->{end}"}
    metric = m if isinstance(m, dict) else (m[0] if isinstance(m, list) and m else None)
    if not metric:
        return {"error": "metrics_parsing_failed", "detail": repr(m)}

    # 2) load model bundle
    try:
        model_bundle = load_model()
    except Exception as e:
        return {"error": "model_load_failed", "detail": str(e)}

    # 3) build features (ensure numeric types)
    try:
        features = {
            "tasks_assigned": int(metric.get("tasks_assigned", 0) or 0),
            "tasks_completed": int(metric.get("tasks_completed", 0) or 0),
            "avg_task_completion_days": float(metric.get("avg_task_completion_days", 0.0) or 0.0),
            "attendance_rate": float(metric.get("attendance_rate", 0.0) or 0.0)
        }
    except Exception as e:
        return {"error": "feature_build_failed", "detail": str(e), "metric": metric}

    # 4) predict
    try:
        score, label = predict_risk(model_bundle, features)
    except Exception as e:
        import traceback
        return {"error": "prediction_failed", "detail": str(e), "trace": traceback.format_exc(), "features": features}

    # 5) determine model_id (uuid) to persist: prefer latest ml_models.id
    model_id_to_save = None
    try:
        # try to get the most recent ml_models row id (uuid)
        mm = supabase.table("ml_models").select("id").order("created_at", desc=True).limit(1).execute()
        mm_data = extract_data(mm)
        if mm_data:
            # mm_data may be a list or dict depending on client - normalize
            rec = mm_data[0] if isinstance(mm_data, list) else mm_data
            model_id_to_save = rec.get("id")
    except Exception:
        # ignore and leave model_id_to_save as None
        model_id_to_save = None

    # 6) persist prediction (use None for model_id if not available)
    try:
        payload = {
            "employee_id": employee_id,
            "period_start": start,
            "period_end": end,
            "risk_score": float(score),
            "risk_label": label,
            "model_id": model_id_to_save,
            "created_at": datetime.utcnow().isoformat()
        }
        # remove model_id if None so supabase will insert null
        if model_id_to_save is None:
            payload.pop("model_id", None)

        supabase.table("performance_predictions").insert(payload).execute()
    except Exception as e:
        # still return the prediction, but surface persist error
        return {"warning": "prediction_saved_failed", "detail": str(e), "score": float(score), "label": label}

    return {"employee_id": employee_id, "risk_score": float(score), "risk_label": label, "model_id": model_id_to_save}
