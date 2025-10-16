import json
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import time
from app.redis_client import redis_client

class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, requests_per_minute: int = 100):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute

    async def dispatch(self, request: Request, call_next):
        # Get client IP
        client_ip = request.client.host if request.client else "unknown"

        # Create rate limit key
        rate_limit_key = f"rate_limit:{client_ip}:{int(time.time() // 60)}"

        # Check current requests count
        current_count = redis_client.get(rate_limit_key) or 0

        if current_count >= self.requests_per_minute:
            return JSONResponse(
                status_code=429,
                content={"error": "Rate limit exceeded. Try again later."}
            )

        # Increment counter
        redis_client.incr(rate_limit_key)

        # Set expiration for the key (1 minute)
        redis_client.expire(rate_limit_key, 60)

        # Proceed with request
        response = await call_next(request)
        return response

class CacheMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, cache_ttl: int = 300):  # 5 minutes default
        super().__init__(app)
        self.cache_ttl = cache_ttl

    async def dispatch(self, request: Request, call_next):
        # Only cache GET requests
        if request.method != "GET":
            return await call_next(request)

        # Create cache key from URL and query params
        query_params = str(request.query_params)
        cache_key = f"cache:{request.url.path}?{query_params}"

        # Check cache
        cached_response = redis_client.get(cache_key)
        if cached_response:
            return JSONResponse(
                status_code=200,
                content=cached_response
            )

        # Proceed with request
        response = await call_next(request)

        # Cache the response if it's successful
        if response.status_code == 200:
            try:
                response_body = response.body
                if response_body:
                    data = response_body.decode('utf-8')
                    json_data = json.loads(data)
                    redis_client.set(cache_key, json_data, ex=self.cache_ttl)
            except:
                pass  # Skip caching if response is not JSON

        return response
