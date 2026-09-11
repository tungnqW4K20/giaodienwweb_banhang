from django.db import transaction
from apps.products.models import Product
from .models import Cart, CartItem

class CartService:
    @staticmethod
    def get_or_create_cart(user=None, session_key=None) -> Cart:
        if user and user.is_authenticated:
            cart, _ = Cart.objects.get_or_create(user=user)
            return cart
        elif session_key:
            cart, _ = Cart.objects.get_or_create(session_key=session_key)
            return cart
        else:
            return Cart.objects.create()

    @staticmethod
    def add_to_cart(cart: Cart, product_id: int, quantity: int = 1) -> CartItem:
        product = Product.objects.get(id=product_id, is_available=True)
        if quantity > product.stock:
            raise ValueError(f"Số lượng tồn kho chỉ còn {product.stock} {product.unit}.")

        item, created = CartItem.objects.get_or_create(
            cart=cart,
            product=product,
            defaults={'quantity': quantity, 'unit_price': product.price}
        )
        if not created:
            new_qty = item.quantity + quantity
            if new_qty > product.stock:
                raise ValueError(f"Không thể thêm vượt quá tồn kho ({product.stock} {product.unit}).")
            item.quantity = new_qty
            item.unit_price = product.price
            item.save()

        return item

    @staticmethod
    def update_cart_item(cart: Cart, item_id: int, quantity: int) -> CartItem:
        try:
            item = CartItem.objects.get(id=item_id, cart=cart)
        except CartItem.DoesNotExist:
            raise ValueError("Mục trong giỏ hàng không tồn tại.")

        if quantity <= 0:
            item.delete()
            return None

        if quantity > item.product.stock:
            raise ValueError(f"Tồn kho chỉ còn {item.product.stock} {item.product.unit}.")

        item.quantity = quantity
        item.unit_price = item.product.price
        item.save()
        return item

    @staticmethod
    def remove_cart_item(cart: Cart, item_id: int):
        CartItem.objects.filter(id=item_id, cart=cart).delete()

    @staticmethod
    def clear_cart(cart: Cart):
        cart.items.all().delete()

    @staticmethod
    @transaction.atomic
    def merge_local_cart_items(user, local_items: list) -> Cart:
        """
        Merges guest cart items stored in browser localStorage into member's DB cart.
        local_items: [{'product_id': 1, 'quantity': 2}, ...]
        """
        cart, _ = Cart.objects.get_or_create(user=user)
        for item_data in local_items:
            try:
                prod_id = int(item_data.get('product_id') or item_data.get('id'))
                qty = int(item_data.get('quantity', 1))
                if qty <= 0:
                    continue
                product = Product.objects.get(id=prod_id, is_available=True)
                item, created = CartItem.objects.get_or_create(
                    cart=cart,
                    product=product,
                    defaults={'quantity': qty, 'unit_price': product.price}
                )
                if not created:
                    item.quantity = min(item.quantity + qty, product.stock)
                    item.unit_price = product.price
                    item.save()
            except Exception:
                continue
        return cart
