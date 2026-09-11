from django.urls import path
from .views import AIChatView, AISuggestionsView

urlpatterns = [
    path('chat/', AIChatView.as_view(), name='ai_chat'),
    path('suggestions/', AISuggestionsView.as_view(), name='ai_suggestions'),
]
