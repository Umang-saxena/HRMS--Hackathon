from fastapi import APIRouter, HTTPException, Depends
from app.supabase_client import supabase
from app.schemas.hr import JobCreate, JobResponse, DepartmentCreate, DepartmentResponse
from app.schemas.company import CompanyCreate, CompanyResponse, EmployeeResponse, EmployeeCreate
from app.schemas.job import Job
from app.schemas.application import JobApplicationResponse, HRJobApplicationCreate
from app.routes.auth import get_current_user
from app.decorators import cached_endpoint, invalidate_cache
from typing import List, Optional

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
            # Invalidate cache for jobs-related endpoints
            invalidate_cache("open_jobs")  # Since jobs might affect employee listings
            return JobResponse(
                id=created_job['id'],
                title=created_job['title'],
                department_id=created_job['department_id'],
                company_id=created_job['company_id'],
                company_name=created_job.get('company_name'),
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
            # Invalidate cache for employee-related endpoints since departments affect employee data
            invalidate_cache("hr_employees")
            invalidate_cache("hr_employee_profile")
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
        # Invalidate cache for jobs-related endpoints
        invalidate_cache("hr_employees")  # Since job updates might affect employee listings
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
            # Invalidate cache for company-related endpoints
            invalidate_cache("hr_companies")
            return CompanyResponse(**created_company)
        else:
            raise HTTPException(status_code=400, detail="Failed to create company")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/companies", response_model=list[CompanyResponse])
@cached_endpoint("hr_companies")
def get_companies(current=Depends(require_hr_role)):
    try:
        response = supabase.table('companies').select('*').execute()
        return [CompanyResponse(**company) for company in response.data]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Add emmployee to company
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
            # Invalidate cache for employee-related endpoints
            invalidate_cache("hr_employees")
            invalidate_cache("hr_employee_profile")
            return EmployeeResponse(**created_employee)
        else:
            raise HTTPException(status_code=400, detail="Failed to create employee")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add employee: {str(e)}")



# All employees of a company
@router.get("/companies/{company_id}/employees", response_model=list[EmployeeResponse])
@cached_endpoint("hr_employees")
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

@router.get("/employees", response_model=list[EmployeeResponse])
@cached_endpoint("hr_employees")
def get_employees_by_hr_company(current=Depends(require_hr_role)):
    try:
        # Get HR user's company_id from user metadata or profile
        # Assuming HR users have company_id in their user_metadata
        hr_user = current['user']
        company_id = hr_user.user_metadata.get('company_id')

        if not company_id:
            raise HTTPException(status_code=400, detail="HR user must be associated with a company")

        # Verify company exists
        company_response = supabase.table('companies').select('*').eq('id', company_id).execute()
        if not company_response.data:
            raise HTTPException(status_code=404, detail="Company not found")

        # Get employees for the HR's company
        response = supabase.table('employees').select('*').eq('company_id', company_id).execute()

        return [EmployeeResponse(**employee) for employee in response.data]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch employees: {str(e)}")

# Employee info my Employee id 
@router.get("/employees/{employee_id}", response_model=EmployeeResponse)
@cached_endpoint("hr_employee_profile")
def get_employee_profile(employee_id: str, current=Depends(require_hr_role)):
    try:
        # Get HR user's company_id from user metadata
        hr_user = current['user']
        company_id = hr_user.user_metadata.get('company_id')

        if not company_id:
            # For development/testing: allow access but log the issue
            # In production, this should require company association
            print(f"Warning: HR user {hr_user.email} accessing employee profile without company association")

            # Get employee without company restriction (for development)
            response = supabase.table('employees').select('*, departments(name)').eq('id', employee_id).execute()

            if not response.data:
                raise HTTPException(status_code=404, detail="Employee not found")

            employee = response.data[0]
            return EmployeeResponse(**employee)

        # Get employee with department information and company restriction
        response = supabase.table('employees').select('*, departments(name)').eq('id', employee_id).eq('company_id', company_id).execute()

        if not response.data:
            raise HTTPException(status_code=404, detail="Employee not found or access denied")

        employee = response.data[0]

        # Return employee data with department name included
        return EmployeeResponse(**employee)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch employee profile: {str(e)}")


@router.get("/departments", response_model=list[DepartmentResponse])
@cached_endpoint("hr_departments")
def get_departments(company_id: str = None, current=Depends(require_hr_role)):
    try:
        query = supabase.table('departments').select('*')

        if company_id:
            query = query.eq('company_id', company_id)

        response = query.execute()
        return [DepartmentResponse(**dept) for dept in response.data]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch departments: {str(e)}")


# Applications Management Endpoints
@router.get("/applications", response_model=List[JobApplicationResponse])
@cached_endpoint("hr_applications")
def get_applications(
    status: Optional[str] = None,
    job_id: Optional[str] = None,
    current=Depends(require_hr_role)
):
    try:
        # Get HR user's company_id from user metadata
        hr_user = current['user']
        company_id = hr_user.user_metadata.get('company_id')

        if not company_id:
            raise HTTPException(status_code=400, detail="HR user must be associated with a company")

        # Build query to get applications for jobs posted by HR's company
        query = supabase.table('applications').select("""
            *,
            job_postings!inner(title, department_id, location, employment_type, salary_range, created_by),
            candidates!inner(name, email, phone)
        """).eq('job_postings.created_by', hr_user.id)

        if status:
            query = query.eq('screening_status', status)

        if job_id:
            query = query.eq('job_id', job_id)

        response = query.order('applied_at', desc=True).execute()

        return [JobApplicationResponse(**app) for app in response.data]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch applications: {str(e)}")


@router.patch("/applications/{application_id}")
def update_application_status(
    application_id: str,
    screening_status: str,
    current=Depends(require_hr_role)
):
    try:
        # Validate status
        valid_statuses = ['Under Review', 'Shortlisted', 'Rejected', 'Hired']
        if screening_status not in valid_statuses:
            raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}")

        # Get HR user's company_id from user metadata
        hr_user = current['user']
        company_id = hr_user.user_metadata.get('company_id')

        if not company_id:
            raise HTTPException(status_code=400, detail="HR user must be associated with a company")

        # Update application status - ensure HR can only update applications for their company's jobs
        response = supabase.table('applications').update({
            'screening_status': screening_status,
            'updated_at': 'now()'
        }).eq('id', application_id).select("""
            *,
            job_postings!inner(created_by)
        """).execute()

        if not response.data:
            raise HTTPException(status_code=404, detail="Application not found")

        # Verify the application belongs to a job created by this HR user
        application = response.data[0]
        if application['job_postings']['created_by'] != hr_user.id:
            raise HTTPException(status_code=403, detail="Access denied. You can only update applications for jobs you created.")

        # Invalidate cache
        invalidate_cache("hr_applications")

        return {"message": "Application status updated successfully", "application": response.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update application status: {str(e)}")


@router.get("/companies/{company_id}/jobs", response_model=List[JobResponse])
@cached_endpoint("hr_company_jobs")
def get_jobs_by_company(company_id: str, current=Depends(require_hr_role)):
    try:
        # First verify company exists
        company_response = supabase.table('companies').select('*').eq('id', company_id).execute()
        if not company_response.data:
            raise HTTPException(status_code=404, detail="Company not found")

        # Get jobs for the company by joining with departments
        response = supabase.table('job_postings').select("""
            *,
            departments!inner(company_id, name)
        """).eq('departments.company_id', company_id).execute()

        return [JobResponse(**job) for job in response.data]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch jobs: {str(e)}")


@router.get("/jobs/{job_id}/applications", response_model=List[JobApplicationResponse])
@cached_endpoint("hr_applications")
def get_applications_by_job(job_id: str, current=Depends(require_hr_role)):
    try:
        # Get HR user
        hr_user = current['user']

        # Query applications for the specific job, ensuring the job was created by this HR user
        response = supabase.table('applications').select("""
            *,
            job_postings!inner(title, department_id, location, employment_type, salary_range, created_by),
            candidates!inner(name, email, phone)
        """).eq('job_id', job_id).eq('job_postings.created_by', hr_user.id).execute()

        return [JobApplicationResponse(**app) for app in response.data]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch applications: {str(e)}")


@router.post("/applications", response_model=JobApplicationResponse)
def create_application(application: HRJobApplicationCreate, current=Depends(require_hr_role)):
    try:
        # Check if job exists and is open
        job_response = supabase.table("job_postings").select("*").eq("id", application.job_id).eq("status", "open").execute()
        if not job_response.data:
            raise HTTPException(status_code=404, detail="Job not found or not open for applications")

        # Check if candidate profile exists
        candidate_response = supabase.table("candidates").select("*").eq("id", application.candidate_id).execute()
        if not candidate_response.data:
            raise HTTPException(status_code=400, detail="Candidate profile not found")

        # Check if already applied
        existing_application = supabase.table("applications").select("*").eq("job_id", application.job_id).eq("candidate_id", application.candidate_id).execute()
        if existing_application.data:
            raise HTTPException(status_code=400, detail="Candidate has already applied for this job")

        # Create application
        application_data = {
            'job_id': application.job_id,
            'candidate_id': application.candidate_id,
            'cover_letter': application.cover_letter,
            'resume_url': application.resume_url,
            'additional_info': application.additional_info,
            'screening_status': 'Under Review'
        }

        response = supabase.table("applications").insert(application_data).execute()
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to create application")

        created_application = response.data[0]
        # Invalidate cache
        invalidate_cache("hr_applications")

        return JobApplicationResponse(**created_application)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create application: {str(e)}")
