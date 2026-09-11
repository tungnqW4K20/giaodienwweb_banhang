from django.urls import path
from .views import ProductReviewListView

urlpatterns = [
    path('products/<int:product_id>/', ProductReviewListView.as_view(), name='product_reviews'),
]
