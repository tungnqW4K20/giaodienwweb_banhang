from decimal import Decimal
from rest_framework import views, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.db.models import Avg, Count
from apps.common.response import api_response, api_error
from apps.products.models import Product
from apps.orders.models import OrderItem, Order
from .models import ProductReview
from .serializers import ProductReviewSerializer, CreateReviewSerializer

class ReviewEligibilityView(views.APIView):
    """
    Checks whether the currently authenticated customer has completed a purchase for this product.
    """
    permission_classes = [AllowAny]

    def get(self, request, product_id):
        product = Product.objects.filter(id=product_id).first()
        if not product:
            return api_error(message="Không tìm thấy sản phẩm.", status_code=status.HTTP_404_NOT_FOUND)

        if not request.user or not request.user.is_authenticated:
            return api_response(
                data={
                    "eligible": False,
                    "is_authenticated": False,
                    "reason": "Vui lòng đăng nhập để gửi đánh giá cho sản phẩm đã mua."
                },
                message="Chưa đăng nhập."
            )

        # Check if customer has an order containing this product with COMPLETED status
        has_purchased = OrderItem.objects.filter(
            order__user=request.user,
            order__order_status=Order.OrderStatus.COMPLETED,
            product=product
        ).exists()

        if not has_purchased:
            return api_response(
                data={
                    "eligible": False,
                    "is_authenticated": True,
                    "reason": "Chỉ khách hàng đã mua và hoàn thành đơn hàng cho sản phẩm này mới có thể viết đánh giá."
                },
                message="Chưa có đơn hàng hoàn thành cho sản phẩm này."
            )

        return api_response(
            data={
                "eligible": True,
                "is_authenticated": True,
                "reviewer_name": request.user.full_name,
                "message": "Bạn đủ điều kiện gửi đánh giá cho sản phẩm này."
            },
            message="Đủ điều kiện đánh giá."
        )


class ProductReviewListView(views.APIView):
    permission_classes = [AllowAny]

    def get(self, request, product_id):
        product = Product.objects.filter(id=product_id).first()
        if not product:
            return api_error(message="Không tìm thấy sản phẩm.", status_code=status.HTTP_404_NOT_FOUND)

        reviews = ProductReview.objects.filter(product=product).order_by('-created_at')
        total_count = reviews.count()
        avg_rating = reviews.aggregate(Avg('rating'))['rating__avg'] or 5.0

        # Star counts breakdown (5, 4, 3, 2, 1)
        breakdown = {
            5: reviews.filter(rating=5).count(),
            4: reviews.filter(rating=4).count(),
            3: reviews.filter(rating=3).count(),
            2: reviews.filter(rating=2).count(),
            1: reviews.filter(rating=1).count(),
        }

        reviews_data = ProductReviewSerializer(reviews, many=True).data

        return api_response(
            data={
                "product_id": product.id,
                "product_name": product.name,
                "average_rating": round(float(avg_rating), 1),
                "total_reviews": total_count,
                "breakdown": breakdown,
                "reviews": reviews_data
            },
            message="Lấy danh sách đánh giá thành công."
        )

    def post(self, request, product_id):
        product = Product.objects.filter(id=product_id).first()
        if not product:
            return api_error(message="Không tìm thấy sản phẩm.", status_code=status.HTTP_404_NOT_FOUND)

        # 1. Require Authentication
        if not request.user or not request.user.is_authenticated:
            return api_error(
                message="Vui lòng đăng nhập để gửi đánh giá cho sản phẩm bạn đã mua.",
                status_code=status.HTTP_401_UNAUTHORIZED
            )

        # 2. Strict Verified Purchase Check: Must have a COMPLETED order for this product
        has_purchased = OrderItem.objects.filter(
            order__user=request.user,
            order__order_status=Order.OrderStatus.COMPLETED,
            product=product
        ).exists()

        if not has_purchased and not request.user.is_staff:
            return api_error(
                message="Chỉ khách hàng đã mua và hoàn thành đơn hàng cho sản phẩm này mới có thể viết đánh giá.",
                status_code=status.HTTP_403_FORBIDDEN
            )

        serializer = CreateReviewSerializer(data=request.data)
        if not serializer.is_valid():
            return api_error(message="Dữ liệu đánh giá không hợp lệ.", errors=serializer.errors)

        reviewer_name = request.user.full_name or serializer.validated_data.get('reviewer_name') or 'Khách hàng GreenFruit'

        review = ProductReview.objects.create(
            product=product,
            user=request.user,
            reviewer_name=reviewer_name,
            rating=serializer.validated_data['rating'],
            comment=serializer.validated_data['comment'],
            is_verified_purchase=True
        )

        # Recompute product average rating & review count
        all_product_reviews = ProductReview.objects.filter(product=product)
        avg_rating = all_product_reviews.aggregate(Avg('rating'))['rating__avg'] or 5.0
        product.rating = Decimal(str(round(float(avg_rating), 1)))
        product.review_count = all_product_reviews.count()
        product.save()

        return api_response(
            data=ProductReviewSerializer(review).data,
            message="Cảm ơn bạn đã gửi đánh giá! Đánh giá đã được xác thực thành công.",
            status_code=status.HTTP_201_CREATED
        )
