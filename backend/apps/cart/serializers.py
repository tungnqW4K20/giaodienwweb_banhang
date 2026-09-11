from rest_framework import serializers
from apps.products.serializers import ProductListSerializer
from .models import Cart, CartItem

class CartItemSerializer(serializers.ModelSerializer):
    product = ProductListSerializer(read_only=True)
    subtotal = serializers.DecimalField(max_digits=12, decimal_places=0, read_only=True)

    class Meta:
        model = CartItem
        fields = ['id', 'product', 'quantity', 'unit_price', 'subtotal', 'created_at']

class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    total_quantity = serializers.IntegerField(read_only=True)
    total_amount = serializers.DecimalField(max_digits=12, decimal_places=0, read_only=True)

    class Meta:
        model = Cart
        fields = ['id', 'items', 'total_quantity', 'total_amount', 'updated_at']

class AddToCartSerializer(serializers.Serializer):
    product_id = serializers.IntegerField(required=True)
    quantity = serializers.IntegerField(default=1, min_value=1)

class UpdateCartItemSerializer(serializers.Serializer):
    quantity = serializers.IntegerField(required=True, min_value=0)

class MergeCartItemInputSerializer(serializers.Serializer):
    product_id = serializers.IntegerField(required=False)
    id = serializers.IntegerField(required=False)
    quantity = serializers.IntegerField(default=1, min_value=1)

class MergeCartSerializer(serializers.Serializer):
    items = serializers.ListField(
        child=serializers.DictField(),
        required=True
    )
