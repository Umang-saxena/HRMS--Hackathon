
"""Robust Celery configuration and app factory.

This module validates and normalizes broker/result URLs (supports Upstash
connection strings) and ensures `rediss://` URLs include the required
`ssl_cert_reqs` parameter so Celery's Redis backend does not raise a
ValueError.
"""
import os
from urllib.parse import urlparse, urlunparse, parse_qs, urlencode

from dotenv import load_dotenv
from celery import Celery

load_dotenv()


def _ensure_rediss_and_ssl_params(url: str) -> str:
    """Normalize a redis-style URL for Celery.

    - Reject HTTP(S) (Upstash REST) URLs because Celery requires a Redis
      transport (redis:// or rediss://).
    - If the scheme is redis and host looks like Upstash, promote to rediss.
    - Ensure `ssl_cert_reqs` query parameter exists for rediss URLs. If
      missing, default to CERT_NONE (safe for testing; use CERT_REQUIRED in
      prod with proper CA certificates).
    """
    if not url:
        return url
    p = urlparse(url)
    scheme = p.scheme.lower()

    # REST endpoints (Upstash REST API) are not valid brokers for Celery
    if scheme in ("http", "https"):
        raise ValueError(
            "REST Redis URL detected (http/https). Celery requires a redis:// or rediss:// broker URL, not the Upstash REST endpoint."
        )

    netloc = p.netloc
    # Promote Upstash redis to rediss (TLS) by default
    if scheme == "redis" and "upstash.io" in netloc:
        scheme = "rediss"

    query = parse_qs(p.query)
    if scheme == "rediss" and "ssl_cert_reqs" not in query:
        # default to CERT_NONE to avoid Celery's ValueError; change to
        # CERT_REQUIRED in production when you provide certificate files
        query["ssl_cert_reqs"] = ["CERT_NONE"]

    new_query = urlencode(query, doseq=True)
    new_parts = (scheme, p.netloc, p.path, p.params, new_query, p.fragment)
    return urlunparse(new_parts)


# Candidate environment variables (look for commonly used names)
_candidates = [
    # os.getenv("CELERY_BROKER_URL"),
    # os.getenv("BROKER_URL"),
    # os.getenv("CELERY_REDIS_URL"),
    os.getenv("REDIS_URL"),
    os.getenv("UPSTASH_REDIS_URL"),
]

broker_url = next((u for u in _candidates if u), None)
if not broker_url:
    raise RuntimeError(
        "Redis broker URL not found. Set CELERY_BROKER_URL or REDIS_URL in your .env (use a redis:// or rediss:// URL)."
    )

try:
    broker_url = _ensure_rediss_and_ssl_params(broker_url)
except Exception as e:
    raise RuntimeError(f"Invalid broker URL: {e}") from e

# Result backend: explicit or fall back to broker
result_backend = os.getenv("CELERY_RESULT_BACKEND") or broker_url
try:
    result_backend = _ensure_rediss_and_ssl_params(result_backend)
except Exception as e:
    raise RuntimeError(f"Invalid result backend URL: {e}") from e

# Export normalized values so other parts of the app read the same strings
os.environ["CELERY_BROKER_URL"] = broker_url
os.environ["CELERY_RESULT_BACKEND"] = result_backend


# Create the Celery app
celery_app = Celery("tasks", broker=broker_url, backend=result_backend)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Kolkata",
    enable_utc=True,
    result_expires=86400,
)

# ai_video_interview/utils/queue_utils.py
import os
from celery import Celery
from dotenv import load_dotenv

load_dotenv() # Make sure this runs to load the root .env
REDIS_URL = os.getenv("REDIS_URL") 

if not REDIS_URL:
    raise ValueError("Redis URL not found. Set REDIS_URL in the root .env file.")

celery_app = Celery("tasks", broker=REDIS_URL, backend=REDIS_URL)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Kolkata", # Set to your timezone if needed
    enable_utc=True,
    result_expires=86400,
)