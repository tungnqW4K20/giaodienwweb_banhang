from django.urls import path
from .views import (
    CheckoutView, OrderListView, OrderDetailView, CancelOrderView, UpdateOrderAddressView
)

urlpatterns = [
    path('checkout/', CheckoutView.as_view(), name='order_checkout'),
    path('', OrderListView.as_view(), name='order_list'),
    path('<str:order_code>/', OrderDetailView.as_view(), name='order_detail'),
    path('<str:order_code>/cancel/', CancelOrderView.as_view(), name='order_cancel'),
    path('<str:order_code>/address/', UpdateOrderAddressView.as_view(), name='order_update_address'),
]
