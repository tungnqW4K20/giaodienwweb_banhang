from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User, UserAddress

class UserAddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserAddress
        fields = ['id', 'recipient_name', 'phone_number', 'province', 'district', 'ward', 'detail_address', 'is_default', 'created_at']
        read_only_fields = ['id', 'created_at']

class UserProfileSerializer(serializers.ModelSerializer):
    addresses = UserAddressSerializer(many=True, read_only=True)

    class Meta:
        model = User
        fields = ['id', 'email', 'full_name', 'phone_number', 'avatar', 'role', 'balance', 'loyalty_points', 'addresses', 'created_at']
        read_only_fields = ['id', 'role', 'balance', 'loyalty_points', 'created_at']

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    confirm_password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ['email', 'full_name', 'phone_number', 'password', 'confirm_password']

    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError({"confirm_password": "Mật khẩu xác nhận không khớp."})
        if User.objects.filter(email=data['email'].lower()).exists():
            raise serializers.ValidationError({"email": "Email này đã được đăng ký."})
        return data

    def create(self, validated_data):
        validated_data.pop('confirm_password')
        password = validated_data.pop('password')
        user = User.objects.create_user(password=password, **validated_data)
        return user

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        email = data.get('email').lower()
        password = data.get('password')

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise serializers.ValidationError("Email hoặc mật khẩu không chính xác.")

        if not user.check_password(password):
            raise serializers.ValidationError("Email hoặc mật khẩu không chính xác.")

        if not user.is_active:
            raise serializers.ValidationError("Tài khoản của bạn đã bị khóa.")

        data['user'] = user
        return data

class UpdateProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['full_name', 'phone_number', 'avatar']

class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=6)

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Mật khẩu hiện tại không đúng.")
        return value

class TopUpSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=12, decimal_places=0, min_value=10000, max_value=50000000)
    method = serializers.CharField(default="VNPAY_TEST")
