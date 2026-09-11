from rest_framework import views, status
from rest_framework.permissions import AllowAny
from django.utils import timezone
from apps.common.response import api_response, api_error
from .models import Voucher
from .serializers import VoucherSerializer, ApplyVoucherSerializer

class VoucherListView(views.APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        now = timezone.now()
        vouchers = Voucher.objects.filter(is_active=True, end_date__gte=now).order_by('-discount_value')
        serializer = VoucherSerializer(vouchers, many=True)
        return api_response(data=serializer.data, message="Lấy danh sách mã giảm giá thành công.")

class ApplyVoucherCheckView(views.APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ApplyVoucherSerializer(data=request.data)
        if not serializer.is_valid():
            return api_error(message="Dữ liệu kiểm tra không hợp lệ.", errors=serializer.errors)

        code = serializer.validated_data['code'].strip().upper()
        subtotal = float(serializer.validated_data['subtotal'])

        try:
            voucher = Voucher.objects.get(code=code)
        except Voucher.DoesNotExist:
            return api_error(message="Mã giảm giá không tồn tại.")

        is_valid, msg, discount_amount = voucher.is_valid_for_order(subtotal)
        if not is_valid:
            return api_error(message=msg)

        final_total = max(0, subtotal - discount_amount)
        return api_response(
            data={
                "code": voucher.code,
                "title": voucher.title,
                "discount_amount": int(discount_amount),
                "original_subtotal": int(subtotal),
                "final_total": int(final_total)
            },
            message=msg
        )
