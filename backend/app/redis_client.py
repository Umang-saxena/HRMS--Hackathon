import os
from upstash_redis import Redis
from typing import Any, Optional
import json

class RedisClient:
    def __init__(self):
        self.redis = Redis(
            url=os.getenv("UPSTASH_REDIS_REST_URL"),
            token=os.getenv("UPSTASH_REDIS_REST_TOKEN")
        )

    def get(self, key: str) -> Optional[Any]:
        """Get value from Redis"""
        try:
            value = self.redis.get(key)
            if value:
                return json.loads(value)
            return None
        except Exception as e:
            print(f"Redis get error: {e}")
            return None

    def set(self, key: str, value: Any, ex: Optional[int] = None) -> bool:
        """Set value in Redis with optional expiration in seconds"""
        try:
            json_value = json.dumps(value)
            if ex:
                self.redis.set(key, json_value, ex=ex)
            else:
                self.redis.set(key, json_value)
            return True
        except Exception as e:
            print(f"Redis set error: {e}")
            return False

    def delete(self, key: str) -> bool:
        """Delete key from Redis"""
        try:
            self.redis.delete(key)
            return True
        except Exception as e:
            print(f"Redis delete error: {e}")
            return False

    def exists(self, key: str) -> bool:
        """Check if key exists in Redis"""
        try:
            return bool(self.redis.exists(key))
        except Exception as e:
            print(f"Redis exists error: {e}")
            return False

    def incr(self, key: str) -> int:
        """Increment value in Redis"""
        try:
            return self.redis.incr(key)
        except Exception as e:
            print(f"Redis incr error: {e}")
            return 0

    def expire(self, key: str, time: int) -> bool:
        """Set expiration time for key in seconds"""
        try:
            return bool(self.redis.expire(key, time))
        except Exception as e:
            print(f"Redis expire error: {e}")
            return False

# Global instance
redis_client = RedisClient()
