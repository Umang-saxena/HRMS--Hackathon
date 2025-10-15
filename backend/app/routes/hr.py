from fastapi import APIRouter, HTTPException, Depends
from app.supabase_client import supabase
from app.schemas.hr import JobCreate, JobResponse, DepartmentCreate, DepartmentResponse
from app.schemas.company import CompanyCreate, CompanyResponse, EmployeeResponse, EmployeeCreate
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
                company_id=created_dept['company_id'],
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

# Company Management Endpoints
@router.post("/companies", response_model=CompanyResponse)
def create_company(company: CompanyCreate, current=Depends(require_hr_role)):
    try:
        data = company.dict()
        response = supabase.table('companies').insert(data).execute()
        if response.data and len(response.data) > 0:
            created_company = response.data[0]
            return CompanyResponse(**created_company)
        else:
            raise HTTPException(status_code=400, detail="Failed to create company")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/companies", response_model=list[CompanyResponse])
def get_companies(current=Depends(require_hr_role)):
    try:
        response = supabase.table('companies').select('*').execute()
        return [CompanyResponse(**company) for company in response.data]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/companies/{company_id}/employees", response_model=EmployeeResponse)
def add_employee_to_company(company_id: str, employee: EmployeeCreate, current=Depends(require_hr_role)):
    try:
        # First verify company exists
        company_response = supabase.table('companies').select('*').eq('id', company_id).execute()
        if not company_response.data:
            raise HTTPException(status_code=404, detail="Company not found")

        # Verify department exists and belongs to the company
        dept_response = supabase.table('departments').select('*').eq('id', employee.department_id).eq('company_id', company_id).execute()
        if not dept_response.data:
            raise HTTPException(status_code=400, detail="Department not found or does not belong to this company")

        # Verify company_id matches the URL parameter
        if employee.company_id != company_id:
            raise HTTPException(status_code=400, detail="Company ID in request body must match the company ID in URL")

        # Check if employee with this email already exists
        existing_employee = supabase.table('employees').select('*').eq('email', employee.email).execute()
        if existing_employee.data:
            raise HTTPException(status_code=400, detail="Employee with this email already exists")

        # Create employee
        employee_data = employee.dict()
        # Set date_of_joining to current date if not provided
        if not employee_data.get('date_of_joining'):
            from datetime import datetime
            employee_data['date_of_joining'] = datetime.now().date().isoformat()
        response = supabase.table('employees').insert(employee_data).execute()
        if response.data and len(response.data) > 0:
            created_employee = response.data[0]
            return EmployeeResponse(**created_employee)
        else:
            raise HTTPException(status_code=400, detail="Failed to create employee")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add employee: {str(e)}")

@router.get("/companies/{company_id}/employees", response_model=list[EmployeeResponse])
def get_employees_by_company(company_id: str, current=Depends(require_hr_role)):
    try:
        # First verify company exists
        company_response = supabase.table('companies').select('*').eq('id', company_id).execute()
        if not company_response.data:
            raise HTTPException(status_code=404, detail="Company not found")

        # Get employees directly by company_id
        response = supabase.table('employees').select('*').eq('company_id', company_id).execute()

        return [EmployeeResponse(**employee) for employee in response.data]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch employees: {str(e)}")


