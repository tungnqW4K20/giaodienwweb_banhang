from rest_framework import serializers
from .models import Order, OrderItem, OrderStatusLog

class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = [
            'id', 'product', 'product_name', 'product_sku', 'product_image',
            'unit_price', 'quantity', 'subtotal'
        ]

class OrderStatusLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderStatusLog
        fields = ['id', 'previous_status', 'new_status', 'note', 'created_by', 'created_at']

class OrderListSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)
    payment_status_display = serializers.CharField(source='get_payment_status_display', read_only=True)
    order_status_display = serializers.CharField(source='get_order_status_display', read_only=True)
    total_quantity = serializers.IntegerField(read_only=True)
    items_preview = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            'id', 'order_code', 'is_guest', 'customer_name', 'customer_phone', 'customer_email',
            'delivery_address', 'delivery_city', 'delivery_district', 'delivery_ward', 'delivery_note',
            'payment_method', 'payment_method_display', 'payment_status', 'payment_status_display',
            'order_status', 'order_status_display', 'subtotal', 'discount_amount',
            'shipping_fee', 'total_amount', 'total_quantity', 'items', 'items_preview', 'created_at'
        ]

    def get_items_preview(self, obj):
        items = obj.items.all()[:2]
        return OrderItemSerializer(items, many=True).data

class OrderDetailSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    status_logs = OrderStatusLogSerializer(many=True, read_only=True)
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)
    payment_status_display = serializers.CharField(source='get_payment_status_display', read_only=True)
    order_status_display = serializers.CharField(source='get_order_status_display', read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'order_code', 'is_guest', 'customer_name', 'customer_phone', 'customer_email',
            'delivery_address', 'delivery_city', 'delivery_district', 'delivery_ward', 'delivery_note',
            'payment_method', 'payment_method_display', 'payment_status', 'payment_status_display',
            'order_status', 'order_status_display', 'subtotal', 'discount_amount',
            'shipping_fee', 'total_amount', 'voucher_code', 'loyalty_points_used', 'loyalty_points_earned',
            'items', 'status_logs', 'created_at'
        ]

class CheckoutItemInputSerializer(serializers.Serializer):
    product_id = serializers.IntegerField(required=True)
    quantity = serializers.IntegerField(required=True, min_value=1)

class CheckoutInputSerializer(serializers.Serializer):
    customer_name = serializers.CharField(required=True, max_length=255)
    customer_phone = serializers.CharField(required=True, max_length=20)
    customer_email = serializers.EmailField(required=False, allow_blank=True)
    delivery_address = serializers.CharField(required=True, max_length=255)
    delivery_city = serializers.CharField(required=False, default="Hà Nội")
    delivery_district = serializers.CharField(required=False, default="Cầu Giấy")
    delivery_ward = serializers.CharField(required=False, allow_blank=True)
    delivery_note = serializers.CharField(required=False, allow_blank=True)
    payment_method = serializers.ChoiceField(choices=Order.PaymentMethod.choices, default=Order.PaymentMethod.COD)
    voucher_code = serializers.CharField(required=False, allow_blank=True)
    loyalty_points_used = serializers.IntegerField(required=False, default=0, min_value=0)
    items = serializers.ListField(
        child=CheckoutItemInputSerializer(),
        required=True,
        allow_empty=False
    )
