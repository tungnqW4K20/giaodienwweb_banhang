from rest_framework import serializers
from .models import ProductReview

class ProductReviewSerializer(serializers.ModelSerializer):
    created_at_formatted = serializers.SerializerMethodField()

    class Meta:
        model = ProductReview
        fields = [
            'id', 'reviewer_name', 'rating', 'comment',
            'is_verified_purchase', 'likes_count', 'created_at', 'created_at_formatted'
        ]

    def get_created_at_formatted(self, obj):
        return obj.created_at.strftime("%d/%m/%Y")

class CreateReviewSerializer(serializers.Serializer):
    reviewer_name = serializers.CharField(required=False, allow_blank=True, max_length=255, default='')
    rating = serializers.IntegerField(required=True, min_value=1, max_value=5)
    comment = serializers.CharField(required=True, min_length=3)
