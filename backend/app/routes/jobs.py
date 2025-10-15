from fastapi import APIRouter, HTTPException
from app.supabase_client import supabase
from app.schemas.job import Job
from app.schemas.hr import JobResponse
from app.decorators import cached_endpoint
from typing import List

router = APIRouter(prefix="/jobs", tags=["jobs"])


# Get all Jobs
@router.get("/", response_model=List[JobResponse])
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
    

# Get Job By JobId    
@router.get("/{job_id}")
@cached_endpoint("job_details", ttl=300)
def get_job_details(job_id: str):
    try:
        # Fetch from database
        response = supabase.table("jobs").select("*").eq("id", job_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Job not found")
        return response.data[0]  # Assuming single record
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

