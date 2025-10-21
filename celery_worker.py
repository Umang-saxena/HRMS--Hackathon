# celery_worker.py
import os
from dotenv import load_dotenv


load_dotenv() 

# Import the Celery app instance from your module
# The path is relative to the project root
from backend.ML_models.ai_video_interview.utils.queue_utils import celery_app

