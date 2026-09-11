from django.db import models
from django.utils import timezone
from apps.common.models import TimeStampedModel

class Voucher(TimeStampedModel):
    class DiscountType(models.TextChoices):
        PERCENT = 'PERCENT', 'Phần trăm (%)'
        FIXED = 'FIXED', 'Số tiền cố định (VNĐ)'

    code = models.CharField(max_length=50, unique=True, db_index=True, verbose_name="Mã voucher")
    title = models.CharField(max_length=255, verbose_name="Tiêu đề chương trình")
    description = models.TextField(blank=True, null=True, verbose_name="Mô tả chi tiết")
    discount_type = models.CharField(max_length=20, choices=DiscountType.choices, default=DiscountType.PERCENT, verbose_name="Loại giảm giá")
    discount_value = models.DecimalField(max_digits=12, decimal_places=0, verbose_name="Giá trị giảm (% hoặc VNĐ)")
    max_discount_amount = models.DecimalField(max_digits=12, decimal_places=0, blank=True, null=True, verbose_name="Giảm tối đa (VNĐ)")
    min_order_amount = models.DecimalField(max_digits=12, decimal_places=0, default=0, verbose_name="Đơn hàng tối thiểu (VNĐ)")
    usage_limit = models.PositiveIntegerField(default=1000, verbose_name="Giới hạn số lần dùng")
    used_count = models.PositiveIntegerField(default=0, verbose_name="Số lần đã dùng")
    start_date = models.DateTimeField(default=timezone.now, verbose_name="Ngày bắt đầu")
    end_date = models.DateTimeField(verbose_name="Ngày kết thúc")
    is_active = models.BooleanField(default=True, db_index=True, verbose_name="Đang kích hoạt")

    class Meta:
        db_table = 'vouchers'
        verbose_name = 'Mã giảm giá'
        verbose_name_plural = 'Danh sách Mã giảm giá'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.code} - {self.title}"

    def is_valid_for_order(self, order_subtotal: float) -> tuple[bool, str, float]:
        now = timezone.now()
        if not self.is_active:
            return False, "Mã giảm giá hiện không khả dụng.", 0.0
        if self.start_date and now < self.start_date:
            return False, "Chương trình khuyến mãi chưa bắt đầu.", 0.0
        if self.end_date and now > self.end_date:
            return False, "Mã giảm giá đã hết hạn sử dụng.", 0.0
        if self.usage_limit and self.used_count >= self.usage_limit:
            return False, "Mã giảm giá đã hết lượt sử dụng.", 0.0
        if float(order_subtotal) < float(self.min_order_amount):
            return False, f"Đơn hàng tối thiểu phải từ {int(self.min_order_amount):,}đ để áp dụng mã này.", 0.0

        if self.discount_type == self.DiscountType.PERCENT:
            discount = float(order_subtotal) * (float(self.discount_value) / 100.0)
            if self.max_discount_amount:
                discount = min(discount, float(self.max_discount_amount))
        else:
            discount = min(float(self.discount_value), float(order_subtotal))

        return True, "Áp dụng mã giảm giá thành công!", discount
