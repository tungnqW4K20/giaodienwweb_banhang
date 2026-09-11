from django.urls import path
from .views import CreateVNPayPaymentView, VNPayCallbackView, VietQRInfoView

urlpatterns = [
    path('vnpay/create/<str:order_code>/', CreateVNPayPaymentView.as_view(), name='vnpay_create'),
    path('vnpay/callback/', VNPayCallbackView.as_view(), name='vnpay_callback'),
    path('vietqr/<str:order_code>/', VietQRInfoView.as_view(), name='vietqr_info'),
]
