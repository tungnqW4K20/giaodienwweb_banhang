import json
import time
from django.http import StreamingHttpResponse
from django.conf import settings
from rest_framework import views, status
from rest_framework.permissions import AllowAny
from apps.common.response import api_response, api_error
from apps.common.redis_helper import RedisService

def event_stream():
    """
    Generator for Server-Sent Events (SSE).
    Uses Redis Pub/Sub if available, with graceful heartbeat fallback.
    """
    yield f"data: {json.dumps({'type': 'CONNECTED', 'message': 'Đã kết nối luồng thông báo EcoFruit Real-time'})}\n\n"
    
    redis_client = None
    pubsub = None
    try:
        import redis
        redis_client = redis.from_url(settings.REDIS_URL, socket_timeout=2)
        pubsub = redis_client.pubsub()
        pubsub.subscribe('orders:channel', 'system:channel')
    except Exception:
        redis_client = None

    start_time = time.time()
    # Stream for max 60 seconds per connection then client reconnects automatically
    while time.time() - start_time < 60:
        if pubsub:
            try:
                message = pubsub.get_message(ignore_subscribe_messages=True, timeout=2.0)
                if message and message.get('data'):
                    raw_data = message['data']
                    if isinstance(raw_data, bytes):
                        raw_data = raw_data.decode('utf-8')
                    yield f"data: {raw_data}\n\n"
            except Exception:
                time.sleep(2)
        else:
            time.sleep(3)

        # Heartbeat ping
        yield f": ping {int(time.time())}\n\n"

class NotificationStreamView(views.APIView):
    """
    SSE Endpoint for real-time order alerts and store broadcast events.
    Connect from frontend via: const es = new EventSource('/api/v1/notifications/stream/');
    """
    permission_classes = [AllowAny]

    def get(self, request):
        response = StreamingHttpResponse(event_stream(), content_type='text/event-stream')
        response['Cache-Control'] = 'no-cache'
        response['X-Accel-Buffering'] = 'no'
        response['Access-Control-Allow-Origin'] = '*'
        return response

class BroadcastNotificationView(views.APIView):
    """Manual/System trigger to broadcast a notification to all connected clients."""
    permission_classes = [AllowAny]

    def post(self, request):
        title = request.data.get('title', 'Thông báo từ EcoFruit')
        message = request.data.get('message', '')
        event_type = request.data.get('type', 'GENERAL_NOTIFICATION')

        payload = {
            "type": event_type,
            "title": title,
            "message": message,
            "timestamp": int(time.time())
        }

        RedisService.publish_notification("orders:channel", payload)
        return api_response(data=payload, message="Đã phát sóng thông báo thành công!")
