from fastapi import APIRouter, Request
from app.supabase_client import supabase

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
