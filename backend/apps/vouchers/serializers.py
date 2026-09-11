from rest_framework import serializers
from .models import Voucher

class VoucherSerializer(serializers.ModelSerializer):
    discount_type_display = serializers.CharField(source='get_discount_type_display', read_only=True)

    class Meta:
        model = Voucher
        fields = [
            'id', 'code', 'title', 'description', 'discount_type', 'discount_type_display',
            'discount_value', 'max_discount_amount', 'min_order_amount',
            'usage_limit', 'used_count', 'start_date', 'end_date', 'is_active'
        ]

class ApplyVoucherSerializer(serializers.Serializer):
    code = serializers.CharField(required=True)
    subtotal = serializers.DecimalField(max_digits=12, decimal_places=0, min_value=0, required=True)
