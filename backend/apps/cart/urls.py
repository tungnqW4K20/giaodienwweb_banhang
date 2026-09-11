from django.urls import path
from .views import CartView, CartItemDetailView, MergeCartView

urlpatterns = [
    path('', CartView.as_view(), name='cart_detail'),
    path('items/<int:item_id>/', CartItemDetailView.as_view(), name='cart_item_detail'),
    path('merge/', MergeCartView.as_view(), name='cart_merge'),
]
