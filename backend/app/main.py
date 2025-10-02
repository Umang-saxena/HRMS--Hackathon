from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import auth  # import the auth router

app = FastAPI()

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
