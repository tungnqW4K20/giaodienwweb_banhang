from django.db import models
from apps.common.models import TimeStampedModel

class Category(TimeStampedModel):
    name = models.CharField(max_length=100, unique=True, verbose_name="Tên danh mục")
    slug = models.SlugField(max_length=120, unique=True, db_index=True, verbose_name="Slug")
    icon = models.CharField(max_length=100, blank=True, null=True, default="bi-basket", verbose_name="Icon Bootstrap")
    image = models.CharField(max_length=500, blank=True, null=True, verbose_name="Ảnh danh mục")
    description = models.TextField(blank=True, null=True, verbose_name="Mô tả")
    is_active = models.BooleanField(default=True, db_index=True, verbose_name="Đang hoạt động")
    display_order = models.IntegerField(default=0, verbose_name="Thứ tự hiển thị")

    class Meta:
        db_table = 'categories'
        verbose_name = 'Danh mục hoa quả'
        verbose_name_plural = 'Danh mục hoa quả'
        ordering = ['display_order', 'name']

    def __str__(self):
        return self.name

class Product(TimeStampedModel):
    class SeasonChoice(models.TextChoices):
        IN_SEASON = 'IN_SEASON', 'Đúng mùa vụ (Tươi ngon nhất)'
        OFF_SEASON = 'OFF_SEASON', 'Trái mùa (Hàng tuyển chọn cao cấp)'
        ALL_YEAR = 'ALL_YEAR', 'Quanh năm'

    name = models.CharField(max_length=255, db_index=True, verbose_name="Tên sản phẩm")
    slug = models.SlugField(max_length=300, unique=True, db_index=True, verbose_name="Slug URL SEO")
    sku = models.CharField(max_length=50, unique=True, db_index=True, verbose_name="Mã SKU")
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='products', verbose_name="Danh mục")
    
    # Pricing & Inventory
    price = models.DecimalField(max_digits=12, decimal_places=0, db_index=True, verbose_name="Giá bán hiện tại (VNĐ)")
    original_price = models.DecimalField(max_digits=12, decimal_places=0, blank=True, null=True, verbose_name="Giá gốc (VNĐ)")
    discount_percent = models.IntegerField(default=0, verbose_name="Phần trăm giảm giá (%)")
    unit = models.CharField(max_length=50, default="kg", verbose_name="Đơn vị tính (kg, hộp, quả, khay)")
    stock = models.PositiveIntegerField(default=100, verbose_name="Số lượng tồn kho")
    
    # Attributes & Seasonality
    season = models.CharField(max_length=20, choices=SeasonChoice.choices, default=SeasonChoice.IN_SEASON, db_index=True, verbose_name="Mùa vụ")
    origin = models.CharField(max_length=150, default="Việt Nam", verbose_name="Xuất xứ")
    certification = models.CharField(max_length=150, default="VietGAP / Chuẩn Organic", verbose_name="Tiêu chuẩn chứng nhận")
    calories = models.CharField(max_length=100, blank=True, null=True, default="52 kcal / 100g", verbose_name="Hàm lượng calo")
    vitamins = models.CharField(max_length=255, blank=True, null=True, default="Vitamin C, A, Chất xơ", verbose_name="Hàm lượng vitamin")
    storage_guide = models.TextField(blank=True, null=True, default="Bảo quản ngăn mát tủ lạnh 4-8 độ C", verbose_name="Hướng dẫn bảo quản")
    shelf_life = models.CharField(max_length=100, blank=True, null=True, default="5 - 7 ngày trong tủ lạnh", verbose_name="Hạn sử dụng")

    # Content & Media
    short_description = models.CharField(max_length=500, verbose_name="Mô tả ngắn")
    description = models.TextField(verbose_name="Mô tả chi tiết sản phẩm")
    image = models.CharField(max_length=500, verbose_name="Ảnh đại diện chính")
    tags = models.CharField(max_length=255, blank=True, null=True, help_text="Phân tách bằng dấu phẩy", verbose_name="Tags tìm kiếm")

    # Metrics & Flags
    rating = models.DecimalField(max_digits=3, decimal_places=1, default=5.0, db_index=True, verbose_name="Điểm đánh giá")
    review_count = models.PositiveIntegerField(default=0, verbose_name="Số lượt đánh giá")
    sold_count = models.PositiveIntegerField(default=0, db_index=True, verbose_name="Đã bán")
    is_available = models.BooleanField(default=True, db_index=True, verbose_name="Còn hàng kinh doanh")
    is_featured = models.BooleanField(default=False, db_index=True, verbose_name="Sản phẩm nổi bật")
    is_bestseller = models.BooleanField(default=False, db_index=True, verbose_name="Sản phẩm bán chạy")
    is_organic = models.BooleanField(default=True, verbose_name="Hữu cơ chuẩn sạch")

    # Technical SEO
    meta_title = models.CharField(max_length=255, blank=True, null=True, verbose_name="Meta Title SEO")
    meta_description = models.TextField(blank=True, null=True, verbose_name="Meta Description SEO")

    class Meta:
        db_table = 'products'
        verbose_name = 'Sản phẩm hoa quả'
        verbose_name_plural = 'Danh sách Sản phẩm'
        ordering = ['-is_featured', '-sold_count', '-created_at']

    def __str__(self):
        return f"{self.name} ({self.price:,}đ/{self.unit})"

    def save(self, *args, **kwargs):
        if self.original_price and self.original_price > self.price:
            self.discount_percent = int(round((1 - (self.price / self.original_price)) * 100))
        if not self.meta_title:
            self.meta_title = f"{self.name} Tươi Sạch Chuẩn VietGAP - EcoFruit"
        if not self.meta_description:
            self.meta_description = f"Mua {self.name} tươi ngon chuẩn {self.certification}, xuất xứ {self.origin}. Giao nhanh trong 2h tại EcoFruit."
        super().save(*args, **kwargs)

class ProductImage(TimeStampedModel):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='gallery_images', verbose_name="Sản phẩm")
    image_url = models.CharField(max_length=500, verbose_name="Đường dẫn ảnh")
    alt_text = models.CharField(max_length=255, blank=True, null=True, verbose_name="Thẻ alt ảnh (SEO)")
    display_order = models.IntegerField(default=0, verbose_name="Thứ tự")

    class Meta:
        db_table = 'product_images'
        verbose_name = 'Ảnh sản phẩm'
        verbose_name_plural = 'Thư viện ảnh sản phẩm'
        ordering = ['display_order', 'id']
