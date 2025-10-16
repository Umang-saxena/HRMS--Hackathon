from fastapi import APIRouter, Request, HTTPException, Depends
from fastapi.security import HTTPBearer
from app.supabase_client import supabase
from app.schemas.user import UserLogin, UserSignup, AuthResponse, Role

security = HTTPBearer()
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/auth", tags=["auth"])

def get_current_user(token: str = Depends(security)):
    try:
        response = supabase.auth.get_user(token.credentials)
        user = response.user
        role = user.user_metadata.get('role', 'employee') if user else 'employee'
        return {"user": user, "role": role}
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid token")

@router.get("/google")
def google_oauth():
    try:
        response = supabase.auth.sign_in_with_oauth(
            {"provider": "google", "options": {"redirect_to": "http://localhost:3000/callback"}}
        )
        return {"url": response.url}
    except Exception as e:
        return {"error": str(e)}

@router.get("/callback")
def oauth_callback(request: Request):
    query_params = request.query_params
    return {"query_params": dict(query_params)}

@router.post("/login")
def login(user: UserLogin):
    try:
        response = supabase.auth.sign_in_with_password({
            "email": user.email,
            "password": user.password
        })
        if response.user is None:
            raise HTTPException(status_code=400, detail="Invalid login credentials")
        role = response.user.user_metadata.get('role', 'employee')
        return AuthResponse(user=response.user.__dict__, session=response.session.__dict__ if response.session else None, role=role)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/admin-only")
def admin_only(current = Depends(get_current_user)):
    if current['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Not authorized")
    return {"message": "Admin access"}

@router.get("/hr-only")
def hr_only(current = Depends(get_current_user)):
    if current['role'] not in ['hr', 'admin']:
        raise HTTPException(status_code=403, detail="Not authorized")
    return {"message": "HR access"}

@router.get("/employee-only")
def employee_only(current = Depends(get_current_user)):
    return {"message": "Employee access", "role": current['role']}

@router.get("/candidate-only")
def candidate_only(current = Depends(get_current_user)):
    if current['role'] != 'candidate':
        raise HTTPException(status_code=403, detail="Not authorized")
    return {"message": "Candidate access"}


@router.post("/signup")
def signup(user: UserSignup):
    try:
        # Prepare user metadata including company information if provided
        user_metadata = {"role": user.role.value}
        if user.company_id:
            user_metadata["company_id"] = user.company_id
        if user.company_name:
            user_metadata["company_name"] = user.company_name

        response = supabase.auth.sign_up({
            "email": user.email,
            "password": user.password,
            "options": {"data": user_metadata}
        })
        if response.user is None:
            raise HTTPException(status_code=400, detail="Signup failed")
        role = user.role.value
        return AuthResponse(user=response.user.__dict__, session=response.session.__dict__ if response.session else None, role=role)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
