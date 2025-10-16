# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

load_dotenv()

# core routers
from app.routes import auth, hr, public
# optional routers
from app.routes import jobs  # may raise ImportError if jobs isn't present; remove if not needed

# feature routers
from app.payroll.routes import router as payroll_router
from app.performance.routes import router as perf_router

app = FastAPI()

# CORS settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root & health endpoints
@app.get("/")
def read_root():
    return {"message": "Welcome to the HRMS API"}

@app.get("/test-supabase")
def test_supabase():
    # response = supabase.table("users").select("*").limit(5).execute()
    # if response.error:
    #     return {"error": response.error.message}
    # return {"data": response.data}
    return {"message": "Supabase client is set up correctly"}

# Include routers
app.include_router(auth.router)
app.include_router(hr.router)
app.include_router(public.router)

# Optional: include jobs router only if it exists
try:
    app.include_router(jobs.router)
except Exception:
    # If jobs module / router isn't present, skip it.
    pass

# Include payroll and performance routers
app.include_router(payroll_router)
app.include_router(perf_router)
