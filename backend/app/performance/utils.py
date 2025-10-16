# backend/app/performance/utils.py
from typing import Any

def extract_data(res: Any):
    """
    Normalize various supabase client return shapes. Return .data or [].
    """
    if res is None:
        return None
    # object with .data
    if hasattr(res, "data"):
        return res.data
    # dict-like
    try:
        if isinstance(res, dict) and "data" in res:
            return res.get("data")
    except Exception:
        pass
    # fallback to json() returning dict with data key
    try:
        if hasattr(res, "json"):
            j = res.json()
            if isinstance(j, dict) and "data" in j:
                return j["data"]
    except Exception:
        pass
    return None
