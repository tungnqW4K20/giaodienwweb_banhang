from rest_framework import serializers
from .models import Category, Product, ProductImage

class CategorySerializer(serializers.ModelSerializer):
    product_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'icon', 'image', 'description', 'product_count', 'display_order']

    def get_product_count(self, obj):
        return obj.products.filter(is_available=True).count()

class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ['id', 'image_url', 'alt_text', 'display_order']

class ProductListSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_slug = serializers.CharField(source='category.slug', read_only=True)
    season_display = serializers.CharField(source='get_season_display', read_only=True)

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'slug', 'sku', 'category', 'category_name', 'category_slug',
            'price', 'original_price', 'discount_percent', 'unit', 'stock',
            'season', 'season_display', 'origin', 'certification',
            'image', 'rating', 'review_count', 'sold_count',
            'is_featured', 'is_bestseller', 'is_organic', 'created_at'
        ]

class ProductDetailSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_slug = serializers.CharField(source='category.slug', read_only=True)
    season_display = serializers.CharField(source='get_season_display', read_only=True)
    gallery_images = ProductImageSerializer(many=True, read_only=True)
    similar_products = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'slug', 'sku', 'category', 'category_name', 'category_slug',
            'price', 'original_price', 'discount_percent', 'unit', 'stock',
            'season', 'season_display', 'origin', 'certification',
            'calories', 'vitamins', 'storage_guide', 'shelf_life',
            'short_description', 'description', 'image', 'tags',
            'rating', 'review_count', 'sold_count',
            'is_available', 'is_featured', 'is_bestseller', 'is_organic',
            'meta_title', 'meta_description',
            'gallery_images', 'similar_products', 'created_at'
        ]

    def get_similar_products(self, obj):
        from .services import ProductSimilarityService
        similars = ProductSimilarityService.get_similar_products(obj, limit=4)
        return ProductListSerializer(similars, many=True).data
