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
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware # Keep only one import
from dotenv import load_dotenv
# --- Remove unused DB imports if not needed directly here ---
# from app.db import Base, engine
# from app.models import user, performance
import os

# Import Celery
# from backend.ML_models.ai_video_interview.utils.queue_utils import celery_app

# Load .env file from the 'backend' directory
# Ensure this is called before other modules that might need env vars
load_dotenv()

# --- Import ALL your routers ---
from app.routes import ai_interview # Import the new AI interview router file
from app.routes import auth, hr, public, jobs, candidate
from app.payroll.routes import router as payroll_router
from app.performance.routes import router as perf_router
# *** ADD IMPORT FOR THE NEW AI INTERVIEW ROUTER ***

# --- Import Middleware ---
# Ensure these middleware files/classes exist in app/middleware.py or comment out
# from app.middleware import RateLimitMiddleware, CacheMiddleware

# --- Create the main FastAPI app instance ---
app = FastAPI(title="HRMS Main API")

# --- Configure Middleware (Apply only ONCE) ---
# Define allowed origins (adjust as needed for deployment)
origins = [
    "http://localhost:3000",  # Your frontend dev origin
    # Add your deployed frontend URL(s) here later (e.g., "https://your-frontend.vercel.app")
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"], # Allows GET, POST, PUT, DELETE, OPTIONS etc.
    allow_headers=["*"], # Allows all standard headers
)

# Add your other middleware *after* CORS if you have implemented them
# app.add_middleware(RateLimitMiddleware, requests_per_minute=100)
# app.add_middleware(CacheMiddleware, cache_ttl=300)

# --- Root & health endpoints ---
@app.get("/")
def read_root():
    """Provides a welcome message for the API root."""
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
@app.get("/health") # Standard health check endpoint
def health_check():
    """Checks if the API server is running."""
    return {"status": "ok"}

# @app.get("/test-supabase") # Keep or remove the Supabase test endpoint as needed
# def test_supabase():
#     # Add actual Supabase test logic here if desired
#     return {"message": "Supabase client connectivity needs implementation."}

# --- Include ALL Routers ---
# Include core routers
app.include_router(auth.router)
app.include_router(hr.router)
app.include_router(public.router)

# Include optional routers (using try/except is fine if truly optional)
try:
    app.include_router(jobs.router)
except AttributeError: # More specific exception if jobs.router might not exist
    print("Optional 'jobs' router not found or not loaded.")
    pass
app.include_router(candidate.router)

# Include feature routers
app.include_router(payroll_router)
app.include_router(perf_router)

# *** INCLUDE THE NEW AI INTERVIEW ROUTER ***
app.include_router(ai_interview.router) # This adds the /ai-interview/* routes

# --- Optional database initialization ---
# Uncomment and implement if you need tables created on startup via SQLAlchemy
# @app.on_event("startup")
# async def startup_event():
#     # Example: Base.metadata.create_all(bind=engine)
#     print("Application startup complete.")

# --- Optional: Add a simple check for required environment variables ---
# Example check (add others as needed)
# required_env_vars = ["SUPABASE_URL", "SUPABASE_SERVICE_KEY", "GROQ_API_KEY"]
# missing_vars = [var for var in required_env_vars if not os.getenv(var)]
# if missing_vars:
#     print(f"⚠️ WARNING: Missing environment variables: {', '.join(missing_vars)}")
