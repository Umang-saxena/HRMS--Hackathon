from fastapi import APIRouter, HTTPException
from app.supabase_client import supabase
from app.schemas.job import Job
from app.decorators import cached_endpoint

router = APIRouter(prefix="/jobs", tags=["jobs"])

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
    

