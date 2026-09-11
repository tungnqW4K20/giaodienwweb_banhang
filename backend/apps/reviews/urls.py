from django.urls import path
from .views import ProductReviewListView, ReviewEligibilityView

urlpatterns = [
    path('products/<int:product_id>/', ProductReviewListView.as_view(), name='product_reviews'),
    path('products/<int:product_id>/eligibility/', ReviewEligibilityView.as_view(), name='review_eligibility'),
]
