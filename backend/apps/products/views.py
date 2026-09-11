from rest_framework import views, status, generics
from rest_framework.permissions import AllowAny
from django.db.models import Q
from apps.common.response import api_response, api_error
from apps.common.pagination import StandardResultsSetPagination
from apps.common.redis_helper import RedisService
from .models import Category, Product
from .serializers import CategorySerializer, ProductListSerializer, ProductDetailSerializer
from .services import ProductSimilarityService

class CategoryListView(views.APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        cached_categories = RedisService.get("categories:all")
        if cached_categories:
            return api_response(data=cached_categories, message="Lấy danh mục thành công (Cache)")

        categories = Category.objects.filter(is_active=True).order_by('display_order', 'name')
        data = CategorySerializer(categories, many=True).data
        RedisService.set("categories:all", data, timeout=600)
        return api_response(data=data, message="Lấy danh mục thành công")

class ProductListView(generics.ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = ProductListSerializer
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        queryset = Product.objects.filter(is_available=True).select_related('category')

        # Filter by category
        category = self.request.query_params.get('category')
        if category and category != 'all':
            if category.isdigit():
                queryset = queryset.filter(category_id=category)
            else:
                queryset = queryset.filter(category__slug=category)

        # Filter by season
        season = self.request.query_params.get('season')
        if season and season != 'all':
            queryset = queryset.filter(season=season)

        # Filter by price range
        min_price = self.request.query_params.get('min_price')
        max_price = self.request.query_params.get('max_price')
        if min_price:
            queryset = queryset.filter(price__gte=min_price)
        if max_price:
            queryset = queryset.filter(price__lte=max_price)

        # Filter by flags
        is_featured = self.request.query_params.get('is_featured')
        if is_featured and is_featured.lower() in ('true', '1'):
            queryset = queryset.filter(is_featured=True)

        is_bestseller = self.request.query_params.get('is_bestseller')
        if is_bestseller and is_bestseller.lower() in ('true', '1'):
            queryset = queryset.filter(is_bestseller=True)

        # Search keyword
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(origin__icontains=search) |
                Q(tags__icontains=search) |
                Q(category__name__icontains=search)
            )

        # Sorting
        sort = self.request.query_params.get('sort', 'featured')
        if sort == 'price_asc':
            queryset = queryset.order_by('price')
        elif sort == 'price_desc':
            queryset = queryset.order_by('-price')
        elif sort == 'rating_desc':
            queryset = queryset.order_by('-rating', '-review_count')
        elif sort == 'bestseller':
            queryset = queryset.order_by('-sold_count')
        elif sort == 'newest':
            queryset = queryset.order_by('-created_at')
        else:
            queryset = queryset.order_by('-is_featured', '-sold_count', '-created_at')

        return queryset

class ProductDetailView(views.APIView):
    permission_classes = [AllowAny]

    def get(self, request, identifier):
        # Support lookup by either integer ID or string slug
        try:
            if str(identifier).isdigit():
                product = Product.objects.select_related('category').prefetch_related('gallery_images').get(id=identifier)
            else:
                product = Product.objects.select_related('category').prefetch_related('gallery_images').get(slug=identifier)
        except Product.DoesNotExist:
            return api_error(message="Không tìm thấy sản phẩm yêu cầu.", status_code=status.HTTP_404_NOT_FOUND)

        serializer = ProductDetailSerializer(product)
        return api_response(data=serializer.data, message="Lấy chi tiết sản phẩm thành công.")

class SimilarProductsView(views.APIView):
    permission_classes = [AllowAny]

    def get(self, request, product_id):
        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return api_error(message="Không tìm thấy sản phẩm.", status_code=status.HTTP_404_NOT_FOUND)

        similars = ProductSimilarityService.get_similar_products(product, limit=4)
        data = ProductListSerializer(similars, many=True).data
        return api_response(data=data, message="Lấy sản phẩm tương tự thành công.")
