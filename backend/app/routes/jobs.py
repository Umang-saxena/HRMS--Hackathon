from fastapi import APIRouter, HTTPException
from app.supabase_client import supabase
from app.schemas.job import Job

router = APIRouter(prefix="/jobs", tags=["jobs"])

@router.get("/{job_id}")
def get_job_details(job_id: str):
    try:
        response = supabase.table("jobs").select("*").eq("id", job_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Job not found")
        job_data = response.data[0]  # Assuming single record
        return job_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

