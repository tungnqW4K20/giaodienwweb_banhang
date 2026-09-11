from django.urls import path
from .views import NotificationStreamView, BroadcastNotificationView

urlpatterns = [
    path('stream/', NotificationStreamView.as_view(), name='notification_stream'),
    path('broadcast/', BroadcastNotificationView.as_view(), name='notification_broadcast'),
]
