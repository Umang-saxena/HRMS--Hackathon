import os
from celery import Celery
from dotenv import load_dotenv

load_dotenv()
REDIS_URL = os.getenv("UPSTASH_REDIS_URL")

celery_app = Celery("tasks", broker=REDIS_URL, backend=REDIS_URL)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Kolkata",
    enable_utc=True,
    result_expires=86400,  # Auto-delete results after 24 hours (in seconds)
)