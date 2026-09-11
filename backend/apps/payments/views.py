import uuid
from rest_framework import views, status
from rest_framework.permissions import AllowAny
from django.shortcuts import redirect
from apps.common.response import api_response, api_error
from apps.orders.models import Order, OrderStatusLog
from .models import PaymentTransaction
from .services import VNPayService, VietQRService

class CreateVNPayPaymentView(views.APIView):
    permission_classes = [AllowAny]

    def post(self, request, order_code):
        try:
            order = Order.objects.get(order_code=order_code)
        except Order.DoesNotExist:
            return api_error(message="Không tìm thấy đơn hàng.", status_code=status.HTTP_404_NOT_FOUND)

        if order.payment_status == Order.PaymentStatus.PAID:
            return api_error(message="Đơn hàng này đã được thanh toán trước đó.")

        payment_url = VNPayService.generate_payment_url(order, request)
        return api_response(
            data={"payment_url": payment_url, "order_code": order.order_code, "amount": int(order.total_amount)},
            message="Tạo liên kết thanh toán VNPay thành công."
        )

class VNPayCallbackView(views.APIView):
    """Handles return redirect from VNPay Sandbox."""
    permission_classes = [AllowAny]

    def get(self, request):
        is_success, msg, data = VNPayService.validate_response(request.query_params)
        order_code = data.get('vnp_TxnRef')

        if not order_code:
            return api_error(message="Thiếu thông tin mã đơn hàng.")

        try:
            order = Order.objects.get(order_code=order_code)
        except Order.DoesNotExist:
            return api_error(message="Đơn hàng không tồn tại.")

        txn_id = data.get('vnp_TransactionNo', str(uuid.uuid4()))
        status_enum = PaymentTransaction.Status.SUCCESS if is_success else PaymentTransaction.Status.FAILED

        PaymentTransaction.objects.create(
            order=order,
            transaction_id=f"VNP-{txn_id}",
            gateway=PaymentTransaction.Gateway.VNPAY,
            amount=int(data.get('vnp_Amount', 0)) / 100,
            status=status_enum,
            vnp_transaction_no=txn_id,
            vnp_bank_code=data.get('vnp_BankCode', ''),
            vnp_card_type=data.get('vnp_CardType', ''),
            response_data=data
        )

        if is_success:
            order.payment_status = Order.PaymentStatus.PAID
            order.save()
            OrderStatusLog.objects.create(
                order=order,
                previous_status=order.order_status,
                new_status=order.order_status,
                note=f"Thanh toán VNPay thành công (Mã GD: {txn_id})",
                created_by="VNPAY_GATEWAY"
            )

        return api_response(
            data={
                "order_code": order.order_code,
                "is_success": is_success,
                "message": msg,
                "transaction_no": txn_id,
                "amount": int(order.total_amount)
            },
            message=msg
        )

class VietQRInfoView(views.APIView):
    permission_classes = [AllowAny]

    def get(self, request, order_code):
        try:
            order = Order.objects.get(order_code=order_code)
        except Order.DoesNotExist:
            return api_error(message="Không tìm thấy đơn hàng.", status_code=status.HTTP_404_NOT_FOUND)

        bank_id = "MB"
        account_no = "0335282828"
        account_name = "ECOFRUIT VIETNAM"
        qr_url = VietQRService.generate_vietqr_url(
            bank_id=bank_id,
            account_no=account_no,
            account_name=account_name,
            amount=int(order.total_amount),
            order_code=order.order_code
        )

        return api_response(
            data={
                "order_code": order.order_code,
                "amount": int(order.total_amount),
                "bank_name": "Ngân hàng Quân Đội (MB Bank)",
                "account_number": account_no,
                "account_name": account_name,
                "transfer_content": f"ECOFRUIT {order.order_code}",
                "qr_image_url": qr_url
            },
            message="Lấy thông tin VietQR thành công."
        )
