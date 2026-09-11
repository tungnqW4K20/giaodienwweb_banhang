"""
URL configuration for EcoFruit project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
import time

def health_check(request):
    """Production health check endpoint for Render / Uptime monitors."""
    from django.db import connection
    db_ok = False
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            row = cursor.fetchone()
            db_ok = (row[0] == 1)
    except Exception as e:
        db_err = str(e)
    else:
        db_err = None

    return JsonResponse({
        "status": "online" if db_ok else "degraded",
        "service": "EcoFruit High-Performance Backend",
        "version": "1.0.0",
        "timestamp": int(time.time()),
        "database": "connected" if db_ok else f"error: {db_err}",
        "architecture": "Layered DRF + MySQL ORM + Redis Cache + Celery + SSE",
    })

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/health/', health_check, name='health_check'),

    # Modular API endpoints
    path('api/v1/auth/', include('apps.authentication.urls')),
    path('api/v1/products/', include('apps.products.urls')),
    path('api/v1/cart/', include('apps.cart.urls')),
    path('api/v1/orders/', include('apps.orders.urls')),
    path('api/v1/payments/', include('apps.payments.urls')),
    path('api/v1/vouchers/', include('apps.vouchers.urls')),
    path('api/v1/reviews/', include('apps.reviews.urls')),
    path('api/v1/notifications/', include('apps.notifications.urls')),
    path('api/v1/ai/', include('apps.ai_assistant.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
