from fastapi import APIRouter, HTTPException, Depends
from app.supabase_client import supabase
from app.schemas.hr import JobCreate, JobResponse, DepartmentCreate, DepartmentResponse
from app.schemas.job import Job
from app.routes.auth import get_current_user

router = APIRouter(prefix="/hr", tags=["hr"])

def require_hr_role(current=Depends(get_current_user)):
    if current['role'] != 'hr':
        raise HTTPException(status_code=403, detail="HR access required")
    return current

@router.post("/jobs", response_model=JobResponse)
def create_job(job: JobCreate, current=Depends(require_hr_role)):
    try:
        data = job.dict()
        data['status'] = 'open'  # Changed to match schema default
        data['created_by'] = current['user'].id
        response = supabase.table('job_postings').insert(data).execute()
        if response.data and len(response.data) > 0:
            created_job = response.data[0]
            return JobResponse(
                id=created_job['id'],
                title=created_job['title'],
                department_id=created_job['department_id'],
                location=created_job['location'],
                employment_type=created_job['employment_type'],
                description=created_job['description'],
                requirements=created_job['requirements'],
                responsibilities=created_job['responsibilities'],
                salary_range=created_job.get('salary_range'),
                status=created_job['status'],
                created_by=created_job['created_by'],
                created_at=created_job['created_at'],
                updated_at=created_job['updated_at'],
                experience_required=created_job.get('experience_required')
            )
        else:
            raise HTTPException(status_code=400, detail="Failed to create job")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/departments", response_model=DepartmentResponse)
def create_department(dept: DepartmentCreate, current=Depends(require_hr_role)):
    try:
        data = dept.dict()
        response = supabase.table('departments').insert(data).execute()
        if response.data and len(response.data) > 0:
            created_dept = response.data[0]
            return DepartmentResponse(
                id=created_dept['id'],
                name=created_dept['name'],
                created_at=created_dept['created_at']
            )
        else:
            raise HTTPException(status_code=400, detail="Failed to create department")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Update Job By JobId
@router.patch("/jobs/{job_id}")
def update_job(job_id: str, job: Job, current=Depends(require_hr_role)):
    try:
        update_data = job.dict(exclude_unset=True)
        response = supabase.table("job_postings").update(update_data).eq("id", job_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Job not found")
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
