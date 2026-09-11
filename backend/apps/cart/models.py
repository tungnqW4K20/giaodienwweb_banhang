from typing import TYPE_CHECKING
from decimal import Decimal
from django.db import models
from django.conf import settings
from apps.common.models import TimeStampedModel
from apps.products.models import Product

class Cart(TimeStampedModel):
    if TYPE_CHECKING:
        id: int
        pk: int
        items: models.Manager['CartItem']

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='cart',
        verbose_name="Người dùng"
    )
    session_key = models.CharField(max_length=64, blank=True, null=True, db_index=True, verbose_name="Session Key cho khách")

    class Meta:
        db_table = 'carts'
        verbose_name = 'Giỏ hàng'
        verbose_name_plural = 'Danh sách Giỏ hàng'

    def __str__(self):
        return f"Cart #{self.id} ({self.user.email if self.user else self.session_key})"

    @property
    def total_quantity(self):
        return sum(item.quantity for item in self.items.all())

    @property
    def total_amount(self) -> Decimal:
        return sum((item.subtotal for item in self.items.all()), Decimal(0))

class CartItem(TimeStampedModel):
    if TYPE_CHECKING:
        id: int
        pk: int
        cart_id: int
        product_id: int

    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name='items', verbose_name="Giỏ hàng")
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='cart_items', verbose_name="Sản phẩm")
    quantity = models.PositiveIntegerField(default=1, verbose_name="Số lượng")
    unit_price = models.DecimalField(max_digits=12, decimal_places=0, verbose_name="Đơn giá lúc thêm (VNĐ)")

    class Meta:
        db_table = 'cart_items'
        unique_together = ('cart', 'product')
        verbose_name = 'Mục giỏ hàng'
        verbose_name_plural = 'Các mục giỏ hàng'

    def __str__(self):
        return f"{self.product.name} x {self.quantity}"

    @property
    def subtotal(self) -> Decimal:
        if self.unit_price is not None:
            return self.unit_price * self.quantity
        return Decimal('0')

    def save(self, *args, **kwargs):
        if not self.unit_price and self.product:
            self.unit_price = self.product.price
        super().save(*args, **kwargs)
