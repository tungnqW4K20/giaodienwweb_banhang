from rest_framework import views, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from apps.common.response import api_response, api_error
from .models import Cart, CartItem
from .serializers import (
    CartSerializer, AddToCartSerializer, UpdateCartItemSerializer, MergeCartSerializer
)
from .services import CartService

class CartView(views.APIView):
    permission_classes = [AllowAny]

    def _get_cart(self, request):
        user = request.user if request.user.is_authenticated else None
        session_key = request.headers.get('X-Session-Key') or request.session.session_key
        if not session_key and not user:
            if not request.session.exists(request.session.session_key):
                request.session.create()
            session_key = request.session.session_key
        return CartService.get_or_create_cart(user=user, session_key=session_key)

    def get(self, request):
        cart = self._get_cart(request)
        serializer = CartSerializer(cart)
        return api_response(data=serializer.data, message="Lấy giỏ hàng thành công.")

    def post(self, request):
        """Add product to cart."""
        serializer = AddToCartSerializer(data=request.data)
        if not serializer.is_valid():
            return api_error(message="Dữ liệu không hợp lệ.", errors=serializer.errors)

        cart = self._get_cart(request)
        try:
            item = CartService.add_to_cart(
                cart=cart,
                product_id=serializer.validated_data['product_id'],
                quantity=serializer.validated_data['quantity']
            )
            cart_data = CartSerializer(cart).data
            return api_response(data=cart_data, message=f"Đã thêm {item.product.name} vào giỏ hàng!")
        except Exception as e:
            return api_error(message=str(e))

    def delete(self, request):
        """Clear all items in cart."""
        cart = self._get_cart(request)
        CartService.clear_cart(cart)
        return api_response(data=CartSerializer(cart).data, message="Đã xóa toàn bộ giỏ hàng.")

class CartItemDetailView(views.APIView):
    permission_classes = [AllowAny]

    def _get_cart(self, request):
        user = request.user if request.user.is_authenticated else None
        session_key = request.headers.get('X-Session-Key') or request.session.session_key
        return CartService.get_or_create_cart(user=user, session_key=session_key)

    def put(self, request, item_id):
        """Update quantity of an item in cart."""
        serializer = UpdateCartItemSerializer(data=request.data)
        if not serializer.is_valid():
            return api_error(message="Số lượng không hợp lệ.", errors=serializer.errors)

        cart = self._get_cart(request)
        try:
            CartService.update_cart_item(cart, item_id, serializer.validated_data['quantity'])
            cart_data = CartSerializer(cart).data
            return api_response(data=cart_data, message="Cập nhật giỏ hàng thành công.")
        except Exception as e:
            return api_error(message=str(e))

    def delete(self, request, item_id):
        """Remove single item from cart."""
        cart = self._get_cart(request)
        CartService.remove_cart_item(cart, item_id)
        cart_data = CartSerializer(cart).data
        return api_response(data=cart_data, message="Đã xóa sản phẩm khỏi giỏ hàng.")

class MergeCartView(views.APIView):
    """Merges localStorage cart items into the authenticated user's database cart."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = MergeCartSerializer(data=request.data)
        if not serializer.is_valid():
            return api_error(message="Dữ liệu đồng bộ giỏ hàng không hợp lệ.", errors=serializer.errors)

        items = serializer.validated_data['items']
        cart = CartService.merge_local_cart_items(request.user, items)
        cart_data = CartSerializer(cart).data
        return api_response(data=cart_data, message="Đồng bộ giỏ hàng thành công!")
