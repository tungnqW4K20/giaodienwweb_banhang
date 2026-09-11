from django.urls import path
from .views import VoucherListView, ApplyVoucherCheckView

urlpatterns = [
    path('', VoucherListView.as_view(), name='voucher_list'),
    path('apply/', ApplyVoucherCheckView.as_view(), name='voucher_apply_check'),
]
