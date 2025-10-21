# celery_worker.py
import os
from dotenv import load_dotenv

load_dotenv()

# Import the Celery app instance from your module
# When this file lives at backend/, the ML_models package is importable as a top-level module
from ML_models.ai_video_interview.utils.queue_utils import celery_app

# This file is intentionally simple. Its job is just to make the Celery app instance
# available for the Celery CLI to run.
