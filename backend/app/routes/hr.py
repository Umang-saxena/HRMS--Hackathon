from fastapi import APIRouter, HTTPException, Depends
from app.supabase_client import supabase
from app.schemas.hr import JobCreate, JobResponse, DepartmentCreate, DepartmentResponse
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
        data['status'] = 'Open'
        response = supabase.table('jobs').insert(data).execute()
        if response.data and len(response.data) > 0:
            created_job = response.data[0]
            return JobResponse(
                id=created_job['id'],
                title=created_job['title'],
                department_id=created_job['department_id'],
                created_by=current['user'].id,
                description=created_job['description'],
                location=created_job.get('location'),
                job_type=created_job['job_type'],
                experience_required=created_job.get('experience_required'),
                skills_required=created_job.get('skills_required'),
                salary_range=created_job.get('salary_range'),
                openings=created_job['openings'],
                status=created_job['status'],
                created_at=created_job['created_at'],
                updated_at=created_job['updated_at']
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
