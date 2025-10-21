import os
from urllib.parse import urlparse, urlunparse, parse_qs, urlencode
from dotenv import load_dotenv
from celery import Celery

load_dotenv()

def _ensure_rediss_and_ssl_params(url: str) -> str:
    if not url:
        return url
    p = urlparse(url)
    scheme = p.scheme.lower()
    if scheme in ("http", "https"):
        raise ValueError("Celery requires redis:// or rediss://, not REST endpoints.")
    if scheme == "redis" and "upstash.io" in p.netloc:
        scheme = "rediss"
    query = parse_qs(p.query)
    if scheme == "rediss" and "ssl_cert_reqs" not in query:
        query["ssl_cert_reqs"] = ["CERT_NONE"]
    new_query = urlencode(query, doseq=True)
    new_parts = (scheme, p.netloc, p.path, p.params, new_query, p.fragment)
    return urlunparse(new_parts)

_candidates = [os.getenv("REDIS_URL"), os.getenv("UPSTASH_REDIS_URL")]
broker_url = next((u for u in _candidates if u), None)
if not broker_url:
    raise RuntimeError("Redis broker URL not found.")

broker_url = _ensure_rediss_and_ssl_params(broker_url)
result_backend = os.getenv("CELERY_RESULT_BACKEND") or broker_url
result_backend = _ensure_rediss_and_ssl_params(result_backend)

os.environ["CELERY_BROKER_URL"] = broker_url
os.environ["CELERY_RESULT_BACKEND"] = result_backend

celery_app = Celery("ai_interview", broker=broker_url, backend=result_backend)
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Kolkata",
    enable_utc=True,
    result_expires=86400,
)

# 👇 make sure the task module is imported and registered
celery_app.autodiscover_tasks(["ML_models.ai_video_interview"])
import ML_models.ai_video_interview.pipeline 
