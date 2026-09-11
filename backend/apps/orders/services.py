import random
import time
from datetime import datetime
from django.db import transaction
from django.utils import timezone
from apps.products.models import Product
from apps.vouchers.models import Voucher
from apps.cart.models import Cart
from apps.common.redis_helper import RedisService
from .models import Order, OrderItem, OrderStatusLog

class CheckoutService:
    @staticmethod
    def generate_order_code() -> str:
        date_str = datetime.now().strftime("%Y%m%d")
        rand_suffix = "".join(random.choices("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", k=6))
        return f"ECO-{date_str}-{rand_suffix}"

    @classmethod
    @transaction.atomic
    def process_checkout(cls, user, data: dict, ip_address: str = None, user_agent: str = None) -> Order:
        """
        Processes checkout with ACID Concurrency Locking (select_for_update)
        and supports all purchase situations (Guest / Member / Wallet / VNPay / COD).
        """
        items_data = data.get('items', [])
        if not items_data:
            raise ValueError("Đơn hàng không có sản phẩm nào.")

        # 1. Concurrency Stock Locking with select_for_update()
        product_ids = [int(item['product_id']) for item in items_data]
        locked_products = {
            p.id: p for p in Product.objects.select_for_update().filter(id__in=product_ids, is_available=True)
        }

        # Validate existence & stock availability
        order_items_to_create = []
        subtotal = 0.0

        for item in items_data:
            prod_id = int(item['product_id'])
            qty = int(item['quantity'])

            if prod_id not in locked_products:
                raise ValueError(f"Sản phẩm ID {prod_id} không tồn tại hoặc đã ngừng kinh doanh.")

            prod = locked_products[prod_id]
            if prod.stock < qty:
                raise ValueError(f"Sản phẩm '{prod.name}' chỉ còn {prod.stock} {prod.unit} trong kho, không đủ đáp ứng số lượng {qty}.")

            item_price = float(prod.price)
            item_subtotal = item_price * qty
            subtotal += item_subtotal

            order_items_to_create.append({
                'product': prod,
                'name': prod.name,
                'sku': prod.sku,
                'image': prod.image,
                'unit_price': item_price,
                'quantity': qty,
                'subtotal': item_subtotal
            })

        # 2. Voucher Calculation
        voucher_obj = None
        voucher_code = data.get('voucher_code', '').strip().upper()
        discount_amount = 0.0

        if voucher_code:
            try:
                voucher_obj = Voucher.objects.select_for_update().get(code=voucher_code)
                is_valid, msg, calculated_discount = voucher_obj.is_valid_for_order(subtotal)
                if is_valid:
                    discount_amount = calculated_discount
                    voucher_obj.used_count += 1
                    voucher_obj.save()
            except Voucher.DoesNotExist:
                pass

        # 3. Loyalty Points Deduction (Member only)
        points_to_use = int(data.get('loyalty_points_used', 0))
        points_discount = 0.0
        if user and user.is_authenticated and points_to_use > 0:
            if user.loyalty_points < points_to_use:
                raise ValueError("Số điểm tích lũy của bạn không đủ.")
            # 1 point = 100 VNĐ
            points_discount = min(points_to_use * 100, max(0, subtotal - discount_amount))
            discount_amount += points_discount
            user.loyalty_points -= points_to_use
            user.save()

        # 4. Shipping Fee
        shipping_fee = 0.0 if subtotal >= 300000 else 20000.0
        total_amount = max(0.0, subtotal - discount_amount + shipping_fee)

        # 5. Payment Method & Status Validation
        payment_method = data.get('payment_method', Order.PaymentMethod.COD)
        payment_status = Order.PaymentStatus.PENDING

        if payment_method == Order.PaymentMethod.WALLET:
            if not user or not user.is_authenticated:
                raise ValueError("Vui lòng đăng nhập để thanh toán bằng Ví EcoPay.")
            if float(user.balance) < total_amount:
                raise ValueError(f"Số dư ví EcoPay ({int(user.balance):,}đ) không đủ thanh toán đơn {int(total_amount):,}đ.")
            user.balance -= int(total_amount)
            user.save()
            payment_status = Order.PaymentStatus.PAID

        # 6. Create Order in Database
        order_code = cls.generate_order_code()
        is_guest = not (user and user.is_authenticated)

        order = Order.objects.create(
            order_code=order_code,
            user=user if not is_guest else None,
            is_guest=is_guest,
            customer_name=data.get('customer_name', '').strip(),
            customer_phone=data.get('customer_phone', '').strip(),
            customer_email=data.get('customer_email', '').strip() or None,
            delivery_address=data.get('delivery_address', '').strip(),
            delivery_city=data.get('delivery_city', 'Hà Nội').strip(),
            delivery_district=data.get('delivery_district', 'Cầu Giấy').strip(),
            delivery_ward=data.get('delivery_ward', '').strip() or None,
            delivery_note=data.get('delivery_note', '').strip() or None,
            payment_method=payment_method,
            payment_status=payment_status,
            order_status=Order.OrderStatus.PENDING,
            subtotal=subtotal,
            discount_amount=discount_amount,
            shipping_fee=shipping_fee,
            total_amount=total_amount,
            voucher=voucher_obj,
            voucher_code=voucher_code if voucher_obj else None,
            loyalty_points_used=points_to_use,
            loyalty_points_earned=int(subtotal * 0.01 / 100), # 1 point per 10,000 VND
            ip_address=ip_address,
            user_agent=user_agent
        )

        # 7. Create Order Items & Deduct Product Stock in DB
        for item_info in order_items_to_create:
            OrderItem.objects.create(
                order=order,
                product=item_info['product'],
                product_name=item_info['name'],
                product_sku=item_info['sku'],
                product_image=item_info['image'],
                unit_price=item_info['unit_price'],
                quantity=item_info['quantity'],
                subtotal=item_info['subtotal']
            )
            # Deduct stock and increment sold count
            p = item_info['product']
            p.stock = max(0, p.stock - item_info['quantity'])
            p.sold_count += item_info['quantity']
            p.save()

        # 8. Log Initial Order Status
        OrderStatusLog.objects.create(
            order=order,
            previous_status=None,
            new_status=Order.OrderStatus.PENDING,
            note=f"Đơn hàng được tạo qua phương thức {order.get_payment_method_display()}",
            created_by="CUSTOMER" if not is_guest else "GUEST"
        )

        # 9. Clear Database Cart for Member
        if user and user.is_authenticated:
            Cart.objects.filter(user=user).delete()

        # 10. Publish Realtime Notification via Redis Pub/Sub
        notification_payload = {
            "type": "NEW_ORDER",
            "order_code": order.order_code,
            "customer_name": order.customer_name,
            "total_amount": int(order.total_amount),
            "created_at": timezone.now().isoformat(),
            "message": f"Đơn hàng mới #{order.order_code} từ {order.customer_name} ({int(order.total_amount):,}đ)"
        }
        RedisService.publish_notification("orders:channel", notification_payload)

        return order
