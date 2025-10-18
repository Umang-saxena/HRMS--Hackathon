from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer
from app.supabase_client import supabase
from app.schemas.hr import JobResponse
from app.schemas.application import JobApplicationCreate, JobApplicationResponse
from app.decorators import cached_endpoint
from typing import List

security = HTTPBearer()

router = APIRouter(prefix="/jobs", tags=["jobs"])


# Get all Jobs
@router.get("/", response_model=List[JobResponse])
@cached_endpoint("open_jobs", ttl=300)
def get_open_jobs(page: int = 1, limit: int = 10):
    try:
        # Fetch from database with company name using left join
        offset = (page - 1) * limit
        response = supabase.table('job_postings').select('*, companies!left(name)').eq('status', 'open').range(offset, offset + limit - 1).execute()
        jobs = response.data
        # Process the joined data to extract company_name and fetch department name separately
        for job in jobs:
            job['company_name'] = job.get('companies', {}).get('name')
            if 'companies' in job:
                del job['companies']
            # Fetch department name separately
            if job.get('department_id'):
                dept_response = supabase.table('departments').select('name').eq('id', job['department_id']).execute()
                if dept_response.data:
                    job['department_name'] = dept_response.data[0]['name'].strip()  # Remove trailing newline
                else:
                    job['department_name'] = 'Unknown Department'
            else:
                job['department_name'] = 'Unknown Department'
        return [JobResponse(**job) for job in jobs]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Get Job By JobId
@router.get("/{job_id}")
@cached_endpoint("job_details", ttl=300)
def get_job_details(job_id: str):
    try:
        # Fetch from database with company name using left join
        response = supabase.table("job_postings").select("*, companies!left(name)").eq("id", job_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Job not found")
        job = response.data[0]
        # Process the joined data to extract company_name and fetch department name separately
        job['company_name'] = job.get('companies', {}).get('name')
        if 'companies' in job:
            del job['companies']
        # Fetch department name separately
        if job.get('department_id'):
            dept_response = supabase.table('departments').select('name').eq('id', job['department_id']).execute()
            if dept_response.data:
                job['department_name'] = dept_response.data[0]['name'].strip()  # Remove trailing newline
            else:
                job['department_name'] = 'Unknown Department'
        else:
            job['department_name'] = 'Unknown Department'
        return job  # Assuming single record
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def get_current_candidate(token: str = Depends(security)):
    try:
        response = supabase.auth.get_user(token.credentials)
        user = response.user
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")
        role = user.user_metadata.get('role', 'employee')
        if role != 'candidate':
            raise HTTPException(status_code=403, detail="Access denied. Candidate role required.")
        return user
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid token")


# Apply for a Job
@router.post("/{job_id}/apply", response_model=JobApplicationResponse)
def apply_for_job(
    job_id: str,
    application: JobApplicationCreate,
    current_user = Depends(get_current_candidate)
):
    try:
        # Check if job exists and is open
        job_response = supabase.table("job_postings").select("*").eq("id", job_id).eq("status", "open").execute()
        if not job_response.data:
            raise HTTPException(status_code=404, detail="Job not found or not open for applications")

        # Check if candidate profile exists
        candidate_response = supabase.table("candidates").select("*").eq("email", current_user.email).execute()
        if not candidate_response.data:
            raise HTTPException(status_code=400, detail="Candidate profile not found. Please complete your profile first.")

        candidate_id = candidate_response.data[0]['id']

        # Check if already applied
        existing_application = supabase.table("applications").select("*").eq("job_id", job_id).eq("candidate_id", candidate_id).execute()
        if existing_application.data:
            raise HTTPException(status_code=400, detail="You have already applied for this job")

        # Extract candidate details from application
        first_name = application.first_name
        last_name = application.last_name
        email = application.email
        availability = application.availability

        # Create application
        application_data = {
            'job_id': job_id,
            'candidate_id': candidate_id,
            'first_name': first_name,
            'last_name': last_name,
            'email': email,
            'availability': availability,
            'cover_letter': application.cover_letter,
            'resume_url': application.resume_url,
            'additional_info': application.additional_info,
            'screening_status': 'Under Review'
        }

        response = supabase.table("applications").insert(application_data).execute()
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to submit application")

        created_application = response.data[0]
        return JobApplicationResponse(**created_application)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to apply for job: {str(e)}")


# Get Applications for Current Candidate
@router.get("/applications/me", response_model=List[JobApplicationResponse])
def get_my_applications(current_user = Depends(get_current_candidate)):
    try:
        # Get candidate ID
        candidate_response = supabase.table("candidates").select("*").eq("email", current_user.email).execute()
        if not candidate_response.data:
            return []

        candidate_id = candidate_response.data[0]['id']

        # Get applications with job details
        response = supabase.table("applications").select("""
            *,
            job_postings!inner(title, department_id, location, employment_type, salary_range)
        """).eq("candidate_id", candidate_id).execute()

        return [JobApplicationResponse(**app) for app in response.data]

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch applications: {str(e)}")
