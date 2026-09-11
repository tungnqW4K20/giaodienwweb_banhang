from rest_framework import views, status, viewsets
from rest_framework.permissions import IsAuthenticated, AllowAny
from apps.common.response import api_response, api_error
from .models import User, UserAddress
from .serializers import (
    RegisterSerializer, LoginSerializer, UserProfileSerializer,
    UserAddressSerializer, UpdateProfileSerializer, ChangePasswordSerializer, TopUpSerializer
)
from .jwt_auth import generate_tokens_for_user

class RegisterView(views.APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            tokens = generate_tokens_for_user(user)
            user_data = UserProfileSerializer(user).data
            return api_response(
                data={
                    "user": user_data,
                    "tokens": tokens
                },
                message="Đăng ký tài khoản thành công!",
                status_code=status.HTTP_201_CREATED
            )
        return api_error(message="Đăng ký thất bại. Vui lòng kiểm tra lại thông tin.", errors=serializer.errors)

class LoginView(views.APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            tokens = generate_tokens_for_user(user)
            user_data = UserProfileSerializer(user).data
            return api_response(
                data={
                    "user": user_data,
                    "tokens": tokens
                },
                message="Đăng nhập thành công!"
            )
        return api_error(message="Đăng nhập thất bại.", errors=serializer.errors)

class ProfileView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserProfileSerializer(request.user)
        return api_response(data=serializer.data, message="Lấy thông tin tài khoản thành công.")

    def put(self, request):
        serializer = UpdateProfileSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            user_data = UserProfileSerializer(request.user).data
            return api_response(data=user_data, message="Cập nhật thông tin thành công!")
        return api_error(message="Cập nhật thất bại.", errors=serializer.errors)

class ChangePasswordView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            request.user.set_password(serializer.validated_data['new_password'])
            request.user.save()
            return api_response(message="Đổi mật khẩu thành công! Vui lòng đăng nhập lại.")
        return api_error(message="Đổi mật khẩu thất bại.", errors=serializer.errors)

class AddressViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = UserAddressSerializer

    def get_queryset(self):
        return UserAddress.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        # If user has no existing address, set first address as default
        has_address = UserAddress.objects.filter(user=self.request.user).exists()
        is_default = serializer.validated_data.get('is_default', False) or not has_address
        serializer.save(user=self.request.user, is_default=is_default)

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return api_response(data=serializer.data, message="Lấy danh sách địa chỉ thành công.")

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            self.perform_create(serializer)
            return api_response(data=serializer.data, message="Thêm địa chỉ nhận hàng thành công!", status_code=status.HTTP_201_CREATED)
        return api_error(message="Thêm địa chỉ thất bại.", errors=serializer.errors)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return api_response(message="Xóa địa chỉ thành công!")

class TopUpWalletView(views.APIView):
    """Simulate VNPay / Bank Top-up for user wallet balance."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = TopUpSerializer(data=request.data)
        if serializer.is_valid():
            amount = serializer.validated_data['amount']
            request.user.balance += amount
            request.user.save()
            return api_response(
                data={"balance": request.user.balance, "added": amount},
                message=f"Nạp thành công {int(amount):,}đ vào ví EcoPay!"
            )
        return api_error(message="Nạp tiền thất bại.", errors=serializer.errors)
