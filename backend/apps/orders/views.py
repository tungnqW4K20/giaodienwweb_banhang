from rest_framework import views, status, generics
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.db import transaction
from apps.common.response import api_response, api_error
from apps.common.pagination import StandardResultsSetPagination
from .models import Order, OrderStatusLog
from .serializers import (
    CheckoutInputSerializer, OrderListSerializer, OrderDetailSerializer
)
from .services import CheckoutService

class CheckoutView(views.APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = CheckoutInputSerializer(data=request.data)
        if not serializer.is_valid():
            return api_error(message="Thông tin đặt hàng không hợp lệ.", errors=serializer.errors)

        user = request.user if request.user.is_authenticated else None
        ip_address = request.META.get('HTTP_X_FORWARDED_FOR', request.META.get('REMOTE_ADDR'))
        user_agent = request.META.get('HTTP_USER_AGENT', '')

        try:
            order = CheckoutService.process_checkout(
                user=user,
                data=serializer.validated_data,
                ip_address=ip_address,
                user_agent=user_agent
            )

            response_data = {
                "order": OrderDetailSerializer(order).data,
                "payment_url": None
            }

            # If VNPay chosen, generate sandbox payment URL
            if order.payment_method == Order.PaymentMethod.VNPAY:
                from apps.payments.services import VNPayService
                payment_url = VNPayService.generate_payment_url(order, request)
                response_data["payment_url"] = payment_url

            return api_response(
                data=response_data,
                message=f"Đặt hàng thành công! Mã đơn hàng của bạn là #{order.order_code}",
                status_code=status.HTTP_201_CREATED
            )
        except ValueError as ve:
            return api_error(message=str(ve))
        except Exception as e:
            return api_error(message=f"Lỗi khi xử lý đơn hàng: {str(e)}")

class OrderListView(views.APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        if request.user.is_authenticated:
            orders = Order.objects.filter(user=request.user).prefetch_related('items').order_by('-created_at')
            serializer = OrderListSerializer(orders, many=True)
            return api_response(data=serializer.data, message="Lấy danh sách đơn hàng thành công.")
        
        # Guest lookup by phone or order_code
        phone = request.query_params.get('phone')
        order_code = request.query_params.get('code')
        if phone:
            orders = Order.objects.filter(customer_phone=phone).prefetch_related('items').order_by('-created_at')
            serializer = OrderListSerializer(orders, many=True)
            return api_response(data=serializer.data, message="Tìm kiếm đơn hàng theo số điện thoại thành công.")
        elif order_code:
            orders = Order.objects.filter(order_code=order_code).prefetch_related('items')
            serializer = OrderListSerializer(orders, many=True)
            return api_response(data=serializer.data, message="Tìm kiếm đơn hàng thành công.")

        return api_error(message="Vui lòng đăng nhập hoặc cung cấp số điện thoại / mã đơn hàng để tra cứu.")

class OrderDetailView(views.APIView):
    permission_classes = [AllowAny]

    def get(self, request, order_code):
        try:
            order = Order.objects.prefetch_related('items', 'status_logs').get(order_code=order_code)
        except Order.DoesNotExist:
            return api_error(message="Không tìm thấy đơn hàng.", status_code=status.HTTP_404_NOT_FOUND)

        # Security check: if member order, ensure same user or allow guest with phone verification
        if order.user and request.user.is_authenticated and order.user != request.user:
            return api_error(message="Bạn không có quyền xem đơn hàng này.", status_code=status.HTTP_403_FORBIDDEN)

        serializer = OrderDetailSerializer(order)
        return api_response(data=serializer.data, message="Lấy chi tiết đơn hàng thành công.")

class CancelOrderView(views.APIView):
    permission_classes = [AllowAny]

    @transaction.atomic
    def post(self, request, order_code):
        try:
            order = Order.objects.select_for_update().get(order_code=order_code)
        except Order.DoesNotExist:
            return api_error(message="Không tìm thấy đơn hàng.", status_code=status.HTTP_404_NOT_FOUND)

        if order.order_status not in [Order.OrderStatus.PENDING, Order.OrderStatus.PROCESSING]:
            return api_error(message="Đơn hàng đang giao hoặc đã hoàn thành, không thể hủy.")

        prev_status = order.order_status
        order.order_status = Order.OrderStatus.CANCELLED
        order.save()

        # Revert stock back to products
        for item in order.items.all():
            if item.product:
                p = item.product
                p.stock += item.quantity
                p.sold_count = max(0, p.sold_count - item.quantity)
                p.save()

        # Refund wallet if paid via wallet
        if order.payment_method == Order.PaymentMethod.WALLET and order.user and order.payment_status == Order.PaymentStatus.PAID:
            order.user.balance += order.total_amount
            order.user.save()
            order.payment_status = Order.PaymentStatus.REFUNDED
            order.save()

        # Log status change
        OrderStatusLog.objects.create(
            order=order,
            previous_status=prev_status,
            new_status=Order.OrderStatus.CANCELLED,
            note="Khách hàng yêu cầu hủy đơn",
            created_by=str(request.user) if request.user.is_authenticated else "GUEST"
        )

        return api_response(
            data=OrderDetailSerializer(order).data,
            message=f"Đã hủy thành công đơn hàng #{order.order_code}."
        )
