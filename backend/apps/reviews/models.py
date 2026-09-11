from django.db import models
from django.conf import settings
from apps.common.models import TimeStampedModel
from apps.products.models import Product

class ProductReview(TimeStampedModel):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='reviews', verbose_name="Sản phẩm")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviews',
        verbose_name="Người dùng"
    )
    reviewer_name = models.CharField(max_length=255, verbose_name="Tên người đánh giá")
    rating = models.IntegerField(default=5, verbose_name="Số sao đánh giá (1-5)")
    comment = models.TextField(verbose_name="Nội dung nhận xét")
    is_verified_purchase = models.BooleanField(default=True, verbose_name="Đã mua hàng thực tế")
    likes_count = models.PositiveIntegerField(default=0, verbose_name="Số lượt thích hữu ích")

    class Meta:
        db_table = 'product_reviews'
        verbose_name = 'Đánh giá sản phẩm'
        verbose_name_plural = 'Danh sách Đánh giá sản phẩm'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.reviewer_name} ({self.rating}★) on {self.product.name}"
