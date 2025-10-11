from fastapi import APIRouter, HTTPException
from typing import List
from app.supabase_client import supabase
from app.schemas.hr import JobResponse

router = APIRouter(prefix="", tags=["public"])

@router.get("/jobs", response_model=List[JobResponse])
def get_open_jobs(page: int = 1, limit: int = 10):
    try:
        offset = (page - 1) * limit
        response = supabase.table('jobs').select('*').eq('status', 'Open').range(offset, offset + limit - 1).execute()
        jobs = response.data
        return [JobResponse(**job) for job in jobs]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
