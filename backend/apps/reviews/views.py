from rest_framework import views, status
from rest_framework.permissions import AllowAny
from django.db.models import Avg, Count
from apps.common.response import api_response, api_error
from apps.products.models import Product
from .models import ProductReview
from .serializers import ProductReviewSerializer, CreateReviewSerializer

class ProductReviewListView(views.APIView):
    permission_classes = [AllowAny]

    def get(self, request, product_id):
        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return api_error(message="Không tìm thấy sản phẩm.", status_code=status.HTTP_404_NOT_FOUND)

        reviews = product.reviews.all().order_by('-created_at')
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
        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return api_error(message="Không tìm thấy sản phẩm.", status_code=status.HTTP_404_NOT_FOUND)

        serializer = CreateReviewSerializer(data=request.data)
        if not serializer.is_valid():
            return api_error(message="Dữ liệu đánh giá không hợp lệ.", errors=serializer.errors)

        user = request.user if request.user.is_authenticated else None
        reviewer_name = serializer.validated_data['reviewer_name']
        if user:
            reviewer_name = user.full_name

        review = ProductReview.objects.create(
            product=product,
            user=user,
            reviewer_name=reviewer_name,
            rating=serializer.validated_data['rating'],
            comment=serializer.validated_data['comment'],
            is_verified_purchase=True
        )

        # Recompute product average rating & review count
        avg_rating = product.reviews.aggregate(Avg('rating'))['rating__avg'] or 5.0
        product.rating = round(avg_rating, 1)
        product.review_count = product.reviews.count()
        product.save()

        return api_response(
            data=ProductReviewSerializer(review).data,
            message="Cảm ơn bạn đã gửi đánh giá!",
            status_code=status.HTTP_201_CREATED
        )
