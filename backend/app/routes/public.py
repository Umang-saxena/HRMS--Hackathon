from fastapi import APIRouter, HTTPException
from typing import List
from app.supabase_client import supabase
from app.schemas.hr import JobResponse
from app.decorators import cached_endpoint

router = APIRouter(prefix="", tags=["public"])

@router.get("/jobs", response_model=List[JobResponse])
@cached_endpoint("open_jobs", ttl=300)
def get_open_jobs(page: int = 1, limit: int = 10):
    try:
        # Fetch from database
        offset = (page - 1) * limit
        response = supabase.table('jobs').select('*').eq('status', 'Open').range(offset, offset + limit - 1).execute()
        jobs = response.data
        return [JobResponse(**job) for job in jobs]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



@router.get("/departments")
@cached_endpoint("departments", ttl=300)
def get_departments():
    try:
        response = supabase.table('departments').select('name').execute()
        departments = response.data
        department_names = [dept['name'] for dept in departments]
        return {"departments": department_names}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
