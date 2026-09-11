from typing import TYPE_CHECKING
from decimal import Decimal
import uuid
from django.db import models
from django.conf import settings
from apps.common.models import TimeStampedModel
from apps.products.models import Product
from apps.vouchers.models import Voucher

class Order(TimeStampedModel):
    if TYPE_CHECKING:
        items: models.Manager['OrderItem']
    class PaymentMethod(models.TextChoices):
        COD = 'COD', 'Thanh toán khi nhận hàng (COD)'
        VNPAY = 'VNPAY', 'Cổng thanh toán VNPay Sandbox (ATM / QR / Thẻ)'
        BANKING = 'BANKING', 'Chuyển khoản ngân hàng VietQR'
        WALLET = 'WALLET', 'Ví điểm EcoPay'

    class PaymentStatus(models.TextChoices):
        PENDING = 'PENDING', 'Chờ thanh toán'
        PAID = 'PAID', 'Đã thanh toán'
        FAILED = 'FAILED', 'Thanh toán thất bại'
        REFUNDED = 'REFUNDED', 'Đã hoàn tiền'

    class OrderStatus(models.TextChoices):
        PENDING = 'PENDING', 'Chờ xác nhận'
        PROCESSING = 'PROCESSING', 'Đang đóng gói'
        SHIPPING = 'SHIPPING', 'Đang giao hàng'
        COMPLETED = 'COMPLETED', 'Giao hàng thành công'
        CANCELLED = 'CANCELLED', 'Đã hủy đơn'

    order_code = models.CharField(max_length=50, unique=True, db_index=True, verbose_name="Mã đơn hàng")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='orders',
        verbose_name="Khách hàng thành viên"
    )
    is_guest = models.BooleanField(default=False, db_index=True, verbose_name="Mua không cần đăng nhập (Khách vãng lai)")

    # Customer Contact Info (Saved for all checkout types: guest and member)
    customer_name = models.CharField(max_length=255, verbose_name="Họ tên người nhận")
    customer_phone = models.CharField(max_length=20, db_index=True, verbose_name="Số điện thoại")
    customer_email = models.EmailField(max_length=255, blank=True, null=True, verbose_name="Email nhận thông báo")
    
    # Delivery Address
    delivery_address = models.CharField(max_length=255, verbose_name="Địa chỉ chi tiết")
    delivery_city = models.CharField(max_length=100, default="Hà Nội", verbose_name="Tỉnh/Thành phố")
    delivery_district = models.CharField(max_length=100, default="Cầu Giấy", verbose_name="Quận/Huyện")
    delivery_ward = models.CharField(max_length=100, blank=True, null=True, verbose_name="Phường/Xã")
    delivery_note = models.TextField(blank=True, null=True, verbose_name="Ghi chú giao hàng")

    # Payment & Financials
    payment_method = models.CharField(max_length=20, choices=PaymentMethod.choices, default=PaymentMethod.COD, verbose_name="Phương thức thanh toán")
    payment_status = models.CharField(max_length=20, choices=PaymentStatus.choices, default=PaymentStatus.PENDING, db_index=True, verbose_name="Trạng thái thanh toán")
    order_status = models.CharField(max_length=20, choices=OrderStatus.choices, default=OrderStatus.PENDING, db_index=True, verbose_name="Trạng thái đơn hàng")

    subtotal = models.DecimalField(max_digits=12, decimal_places=0, verbose_name="Tiền hàng (VNĐ)")
    discount_amount = models.DecimalField(max_digits=12, decimal_places=0, default=0, verbose_name="Số tiền giảm giá (VNĐ)")
    shipping_fee = models.DecimalField(max_digits=12, decimal_places=0, default=20000, verbose_name="Phí vận chuyển (VNĐ)")
    total_amount = models.DecimalField(max_digits=12, decimal_places=0, verbose_name="Tổng thanh toán cuối cùng (VNĐ)")

    # Voucher & Loyalty Points
    voucher = models.ForeignKey(Voucher, on_delete=models.SET_NULL, null=True, blank=True, related_name='orders', verbose_name="Mã giảm giá đã dùng")
    voucher_code = models.CharField(max_length=50, blank=True, null=True, verbose_name="Mã voucher snapshot")
    loyalty_points_used = models.PositiveIntegerField(default=0, verbose_name="Điểm thưởng đã cấn trừ")
    loyalty_points_earned = models.PositiveIntegerField(default=0, verbose_name="Điểm thưởng tích lũy được")

    # Audit & Security
    ip_address = models.GenericIPAddressField(blank=True, null=True, verbose_name="IP người đặt")
    user_agent = models.CharField(max_length=500, blank=True, null=True, verbose_name="Trình duyệt / Thiết bị")

    class Meta:
        db_table = 'orders'
        verbose_name = 'Đơn hàng'
        verbose_name_plural = 'Danh sách Đơn hàng'
        ordering = ['-created_at']

    def __str__(self):
        return f"Đơn hàng #{self.order_code} - {self.customer_name} ({self.total_amount:,}đ)"

    @property
    def total_quantity(self):
        return sum(item.quantity for item in self.items.all())

class OrderItem(TimeStampedModel):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items', verbose_name="Đơn hàng")
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, related_name='order_items', verbose_name="Sản phẩm")
    product_name = models.CharField(max_length=255, verbose_name="Tên sản phẩm tại thời điểm mua")
    product_sku = models.CharField(max_length=50, verbose_name="Mã SKU")
    product_image = models.CharField(max_length=500, verbose_name="Ảnh sản phẩm")
    unit_price = models.DecimalField(max_digits=12, decimal_places=0, verbose_name="Đơn giá (VNĐ)")
    quantity = models.PositiveIntegerField(default=1, verbose_name="Số lượng")
    subtotal = models.DecimalField(max_digits=12, decimal_places=0, verbose_name="Thành tiền (VNĐ)")

    class Meta:
        db_table = 'order_items'
        verbose_name = 'Chi tiết đơn hàng'
        verbose_name_plural = 'Danh sách Chi tiết đơn hàng'

    def __str__(self):
        return f"{self.product_name} x {self.quantity} ({self.subtotal:,}đ)"

class OrderStatusLog(TimeStampedModel):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='status_logs', verbose_name="Đơn hàng")
    previous_status = models.CharField(max_length=50, blank=True, null=True, verbose_name="Trạng thái trước")
    new_status = models.CharField(max_length=50, verbose_name="Trạng thái mới")
    note = models.CharField(max_length=255, blank=True, null=True, verbose_name="Ghi chú")
    created_by = models.CharField(max_length=100, default="SYSTEM", verbose_name="Người cập nhật")

    class Meta:
        db_table = 'order_status_logs'
        verbose_name = 'Lịch sử trạng thái đơn'
        verbose_name_plural = 'Lịch sử trạng thái đơn'
        ordering = ['-created_at']
