from django.db import models
from apps.common.models import TimeStampedModel
from apps.orders.models import Order

class PaymentTransaction(TimeStampedModel):
    class Gateway(models.TextChoices):
        VNPAY = 'VNPAY', 'VNPay Sandbox'
        VIETQR = 'VIETQR', 'VietQR Ngân hàng'
        WALLET = 'WALLET', 'Ví điểm EcoPay'
        COD = 'COD', 'Tiền mặt khi nhận'

    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Đang xử lý'
        SUCCESS = 'SUCCESS', 'Thành công'
        FAILED = 'FAILED', 'Thất bại'

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='transactions', verbose_name="Đơn hàng")
    transaction_id = models.CharField(max_length=100, unique=True, db_index=True, verbose_name="Mã giao dịch")
    gateway = models.CharField(max_length=20, choices=Gateway.choices, default=Gateway.VNPAY, verbose_name="Cổng thanh toán")
    amount = models.DecimalField(max_digits=12, decimal_places=0, verbose_name="Số tiền (VNĐ)")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING, db_index=True, verbose_name="Trạng thái")
    
    # VNPay Specific Fields
    vnp_transaction_no = models.CharField(max_length=100, blank=True, null=True, verbose_name="Mã GD VNPay")
    vnp_bank_code = models.CharField(max_length=50, blank=True, null=True, verbose_name="Ngân hàng thanh toán")
    vnp_card_type = models.CharField(max_length=50, blank=True, null=True, verbose_name="Loại thẻ")
    response_data = models.JSONField(blank=True, null=True, verbose_name="Dữ liệu phản hồi gốc")

    class Meta:
        db_table = 'payment_transactions'
        verbose_name = 'Giao dịch thanh toán'
        verbose_name_plural = 'Danh sách Giao dịch thanh toán'
        ordering = ['-created_at']

    def __str__(self):
        return f"TXN #{self.transaction_id} - {self.order.order_code} ({self.amount:,}đ)"
