from fastapi import APIRouter, HTTPException
from typing import List
from app.supabase_client import supabase
from app.schemas.hr import JobResponse
from app.decorators import cached_endpoint

router = APIRouter(prefix="", tags=["public"])

# Get All Jobs




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
