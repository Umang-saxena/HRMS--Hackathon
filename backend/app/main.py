from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

load_dotenv()

from app.routes import auth, hr, public, jobs  # import the auth, hr, public, and jobs routers
from app.middleware import RateLimitMiddleware, CacheMiddleware

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

# Include routers

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


app.include_router(auth.router)
app.include_router(hr.router)
app.include_router(public.router)
app.include_router(jobs.router)
