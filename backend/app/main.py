# backend/app/main.py

from dotenv import load_dotenv
load_dotenv()
import os
import traceback


from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.requests import Request

# load environment variables early


# ensure model modules are imported early so SQLAlchemy registers mappers
# adjust these if your models live elsewhere (e.g. app.models.user contains Employee)
import app.models.user      # registers User / Employee if defined here
   # registers Employee if you have a separate module
from app.models import performance
# db and middleware
from app.db import Base, engine
from app.middleware import RateLimitMiddleware, CacheMiddleware

# routers (core + feature)
from app.routes import auth, hr, public, jobs, candidate
from app.payroll import routes as payroll_routes
from app.leave.routes import router as leave_router
from app.performance import routes as performance_routes
app = FastAPI(title="Your HRMS")

# CORS must be registered before custom middlewares that may short-circuit requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# custom middlewares
app.add_middleware(RateLimitMiddleware, requests_per_minute=100)
app.add_middleware(CacheMiddleware, cache_ttl=300)

# Root & health endpoints
@app.get("/")
def read_root():
    return {"message": "Welcome to the HRMS API"}

@app.get("/test-supabase")
def test_supabase():
    return {"message": "Supabase client is set up correctly"}

# Include routers (order doesn't matter now that models are imported)
app.include_router(auth.router)
app.include_router(hr.router)
app.include_router(public.router)
app.include_router(jobs.router)
app.include_router(candidate.router)
app.include_router(payroll_routes.router)
app.include_router(leave_router)
app.include_router(performance_routes.router, prefix="/api/performance")

# DEV-only: detailed exception handler (temporary — remove in prod)
@app.exception_handler(Exception)
async def dev_exception_handler(request: Request, exc: Exception):
    tb = traceback.format_exc()
    print("=== DEV EXCEPTION TRACEBACK START ===")
    print(tb)
    print("=== DEV EXCEPTION TRACEBACK END ===")
    return JSONResponse(status_code=500, content={"error": str(exc), "traceback": tb})
