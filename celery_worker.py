# celery_worker.py (shim)
"""Shim at repository root to preserve legacy imports/CLI usage.

It delegates to the real worker module under backend/ so external tools
that rely on `celery_worker` at project root keep working.
"""
from backend.celery_worker import celery_app  # re-export

# Expose name expected by Celery when used as `-A celery_worker`
__all__ = ["celery_app"]