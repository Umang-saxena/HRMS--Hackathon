from functools import wraps
from typing import Any, Callable
from fastapi import Request
from datetime import datetime
import json
from app.redis_client import redis_client

def invalidate_cache(prefix: str):
    """
    Invalidate all cache keys with the given prefix.

    Args:
        prefix: The cache key prefix to invalidate (e.g., "hr_companies")
    """
    cursor = 0
    while True:
        cursor, keys = redis_client.scan(cursor, match=f"{prefix}:*")
        if keys:
            redis_client.delete(*keys)
        if cursor == 0:
            break

def cached_endpoint(cache_key_prefix: str, ttl: int = 300):
    """
    Decorator to cache API endpoint responses.

    Args:
        cache_key_prefix: Prefix for the cache key (e.g., "jobs")
        ttl: Time to live in seconds (default 5 minutes)
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Generate cache key from function name and arguments
            request = None
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                    break

            if request:
                # Use request URL and query params for cache key
                cache_key = f"{cache_key_prefix}:{request.url.path}"
                if request.query_params:
                    cache_key += f"?{request.query_params}"
            else:
                # Fallback to function name and kwargs
                cache_key = f"{cache_key_prefix}:{func.__name__}"
                if kwargs:
                    sorted_kwargs = sorted(kwargs.items())
                    cache_key += ":" + ":".join(f"{k}={v}" for k, v in sorted_kwargs)

            try:
                # Check cache first
                cached_data = redis_client.get(cache_key)
                if cached_data:
                    print(f"Cache hit for Cache Key: {cache_key}")
                    return cached_data

                # Execute the function
                result = await func(*args, **kwargs) if hasattr(func, '__call__') and hasattr(func, '__code__') and 'async' in str(func.__code__.co_flags) else func(*args, **kwargs)

                # Serialize result for caching (handle datetime objects)
                if isinstance(result, list):
                    serialized_result = []
                    for item in result:
                        if hasattr(item, 'dict'):
                            item_dict = item.dict()
                            # Convert datetime to ISO string
                            for key, value in item_dict.items():
                                if isinstance(value, datetime):
                                    item_dict[key] = value.isoformat()
                            serialized_result.append(item_dict)
                        else:
                            serialized_result.append(item)
                elif hasattr(result, 'dict'):
                    serialized_result = result.dict()
                    # Convert datetime to ISO string
                    for key, value in serialized_result.items():
                        if isinstance(value, datetime):
                            serialized_result[key] = value.isoformat()
                else:
                    serialized_result = result

                # Cache the result
                redis_client.set(cache_key, serialized_result, ex=ttl)
                print(f"Cache miss for Cache Key: {cache_key}")

                return result

            except Exception as e:
                print(f"Caching error: {e}")
                # If caching fails, just execute the function
                return await func(*args, **kwargs) if hasattr(func, '__call__') and hasattr(func, '__code__') and 'async' in str(func.__code__.co_flags) else func(*args, **kwargs)

        return wrapper
    return decorator
