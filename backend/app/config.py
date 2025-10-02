import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    PROJECT_NAME = "Hackathon FastAPI"
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./hackathon.db")
    SECRET_KEY = os.getenv("SECRET_KEY", "supersecretkey")

settings = Settings()
