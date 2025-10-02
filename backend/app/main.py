from fastapi import FastAPI
from .supabase_client import supabase


app = FastAPI(title="HRMS backend", version="1.0.0")

# Include routers
# app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
# app.include_router(user.router, prefix="/api/v1/users", tags=["users"])

@app.get("/")
def root():
    return {"message": "Hello from FastAPI Server"}


@app.get("/test-supabase")
def test_supabase():
    # response = supabase.table("users").select("*").limit(5).execute()
    # if response.error:
    #     return {"error": response.error.message}
    # return {"data": response.data}
    return {"message": "Supabase client is set up correctly"}
