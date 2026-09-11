import json
import logging
from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)

class RedisService:
    """Helper service for Redis caching, pub/sub and real-time event broadcasting."""

    @staticmethod
    def set(key: str, value, timeout: int = 300):
        try:
            cache.set(key, value, timeout=timeout)
            return True
        except Exception as e:
            logger.warning(f"Redis set failed for {key}: {e}")
            return False

    @staticmethod
    def get(key: str, default=None):
        try:
            return cache.get(key, default)
        except Exception as e:
            logger.warning(f"Redis get failed for {key}: {e}")
            return default

    @staticmethod
    def delete(key: str):
        try:
            cache.delete(key)
            return True
        except Exception as e:
            logger.warning(f"Redis delete failed for {key}: {e}")
            return False

    @staticmethod
    def publish_notification(channel: str, message_data: dict):
        """Publish event for SSE / WebSockets stream."""
        try:
            import redis
            r = redis.from_url(settings.REDIS_URL)
            r.publish(channel, json.dumps(message_data))
            return True
        except Exception as e:
            logger.info(f"Broadcast event fallback (in-process/log): {e}")
            return False
