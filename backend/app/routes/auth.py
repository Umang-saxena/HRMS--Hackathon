from fastapi import APIRouter, Request, HTTPException
from app.supabase_client import supabase
from app.schemas.user import UserLogin, UserSignup, AuthResponse
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/auth", tags=["auth"])

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
        return AuthResponse(user=response.user.__dict__, session=response.session.__dict__ if response.session else None)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/signup")
def signup(user: UserSignup):
    try:
        response = supabase.auth.sign_up({
            "email": user.email,
            "password": user.password
        })
        if response.user is None:
            raise HTTPException(status_code=400, detail="Signup failed")
        return AuthResponse(user=response.user.__dict__, session=response.session.__dict__ if response.session else None)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
