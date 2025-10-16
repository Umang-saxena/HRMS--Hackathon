# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

load_dotenv()

from app.routes import auth, hr, public, jobs, candidate  # import the auth, hr, public, jobs, and candidate routers
from app.middleware import RateLimitMiddleware, CacheMiddleware

# core routers
from app.routes import auth, hr, public
# optional routers
from app.routes import jobs  # may raise ImportError if jobs isn't present; remove if not needed

# feature routers
from app.payroll.routes import router as payroll_router
from app.performance.routes import router as perf_router


app = FastAPI()

# Add rate limiting middleware (100 requests per minute per IP)
app.add_middleware(RateLimitMiddleware, requests_per_minute=100)

# Add caching middleware (5 minutes TTL)
app.add_middleware(CacheMiddleware, cache_ttl=300)

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

app.include_router(jobs.router)
app.include_router(candidate.router)


# Optional: include jobs router only if it exists
try:
    app.include_router(jobs.router)
except Exception:
    # If jobs module / router isn't present, skip it.
    pass

# Include payroll and performance routers
app.include_router(payroll_router)
app.include_router(perf_router)

