# celery_worker.py
import os
from dotenv import load_dotenv

# Load environment variables BEFORE importing the Celery app
# Make sure the .env file is in the root directory
load_dotenv() 

# Import the Celery app instance from your module
# The path is relative to the project root
from backend.ML_models.ai_video_interview.utils.queue_utils import celery_app

# This file is intentionally simple. Its job is just to make the Celery app instance
# available for the Celery CLI to run.