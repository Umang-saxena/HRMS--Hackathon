# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware # Keep only one import
from dotenv import load_dotenv
# --- Remove unused DB imports if not needed directly here ---
# from app.db import Base, engine
# from app.models import user, performance
import os

# Load .env file from the 'backend' directory
# Ensure this is called before other modules that might need env vars
load_dotenv()

# --- Import ALL your routers ---
from app.routes import auth, hr, public, jobs, candidate
from app.payroll.routes import router as payroll_router
from app.performance.routes import router as perf_router
# *** ADD IMPORT FOR THE NEW AI INTERVIEW ROUTER ***
from app.routes import ai_interview # Import the new AI interview router file

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