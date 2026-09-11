import os
import sys
import json
import urllib.request
import urllib.error

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

BASE_URL = "http://127.0.0.1:8000/api/v1"

def api_request(endpoint, method="GET", data=None, token=None):
    url = f"{BASE_URL}{endpoint}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    body = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    
    try:
        with urllib.request.urlopen(req) as response:
            res_body = response.read().decode("utf-8")
            return json.loads(res_body)
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        try:
            return json.loads(err_body)
        except:
            return {"error": err_body, "status_code": e.code}

def main():
    print("=" * 70)
    print("ECOFRUIT SUITE: CART ISOLATION, LIVE BADGE & POST-CHECKOUT CLEANUP")
    print("=" * 70)

    # 1. Test accounts initial cart verification
    test_accounts = [
        ("admin@ecofruit.vn", "Admin@123456", "Admin EcoFruit", 4),
        ("vip@ecofruit.vn", "Vip@123456", "VIP Hoàng Long", 5),
        ("khachhang@gmail.com", "Customer@123456", "Khách Văn An", 7),
        ("lan.tran@gmail.com", "Password@123", "Mẹ Bầu Mai Lan", 9),
        ("staff@ecofruit.vn", "Staff@123456", "Staff Thu Hà", 3),
        ("demo@greenfruit.vn", "password123", "Demo Văn Xanh", 4)
    ]

    tokens = {}

    print("\n--- 1. Testing Multi-User Login & Live Cart Counts ---")
    for email, password, name, expected_qty in test_accounts:
        login_res = api_request("/auth/login/", method="POST", data={"email": email, "password": password})
        assert login_res.get("success") is True, f"Login failed for {email}: {login_res}"
        token = login_res["data"]["tokens"]["access_token"]
        tokens[email] = token

        # Fetch Cart
        cart_res = api_request("/cart/", method="GET", token=token)
        assert cart_res.get("success") is True, f"Get cart failed for {email}: {cart_res}"
        cart_data = cart_res["data"]
        total_qty = cart_data.get("total_quantity", 0)
        items = cart_data.get("items", [])

        print(f"[{name}] {email}: Cart has {total_qty} items (Expected: {expected_qty}), {len(items)} distinct products. Total: {int(float(cart_data.get('total_amount', 0))):,} VND")
        assert total_qty == expected_qty, f"Mismatch in cart quantity for {email}! Got {total_qty}, expected {expected_qty}"

    # 2. Test Adding Item to Cart (Should ONLY add to cart, NOT create order)
    print("\n--- 2. Testing Add to Cart (Only Cart Modified, No Orders Created) ---")
    an_token = tokens["khachhang@gmail.com"]
    orders_before = api_request("/orders/", method="GET", token=an_token)
    order_count_before = len(orders_before.get("data", []))

    # Add 2 more avocados (Product ID 5: Bơ sáp 034)
    # Let's get product list first
    products_res = api_request("/products/", method="GET")
    prods = products_res.get("data", [])
    prod_apple = next(p for p in prods if "envy" in p["slug"])

    add_res = api_request("/cart/", method="POST", data={"product_id": prod_apple["id"], "quantity": 2}, token=an_token)
    assert add_res.get("success") is True, f"Add to cart failed: {add_res}"
    
    # Check cart updated
    cart_after_add = api_request("/cart/", method="GET", token=an_token)["data"]
    print(f"Added 2x {prod_apple['name']} to Khách An's cart. New total quantity: {cart_after_add['total_quantity']} (was 7, now {cart_after_add['total_quantity']})")
    assert cart_after_add["total_quantity"] == 9

    # Verify orders count did NOT change!
    orders_after = api_request("/orders/", method="GET", token=an_token)
    order_count_after = len(orders_after.get("data", []))
    assert order_count_after == order_count_before, f"Order was unexpectedly created! Before: {order_count_before}, After: {order_count_after}"
    print(f"Verified: Adding to cart did NOT create any unexpected orders (Order count remained: {order_count_after})")

    # 3. Test Checkout & Post-Checkout Cart Item Cleanup
    print("\n--- 3. Testing Checkout & Post-Checkout Cart Cleanup ---")
    # Khách An checks out 2x Táo Envy
    checkout_payload = {
        "customer_name": "Nguyễn Văn An",
        "customer_phone": "0988776655",
        "customer_email": "khachhang@gmail.com",
        "delivery_address": "Tầng 8 Landmark 72, Hà Nội",
        "payment_method": "COD",
        "items": [
            {"product_id": prod_apple["id"], "quantity": 2}
        ]
    }

    checkout_res = api_request("/orders/checkout/", method="POST", data=checkout_payload, token=an_token)
    assert checkout_res.get("success") is True, f"Checkout failed: {checkout_res}"
    created_order = checkout_res["data"]["order"]
    print(f"Checkout succeeded: Order #{created_order['order_code']} - Total: {int(float(created_order['total_amount'])):,} VND")

    # Verify that Táo Envy is REMOVED from Khách An's cart, while his other cart items remain!
    cart_after_checkout = api_request("/cart/", method="GET", token=an_token)["data"]
    remaining_items = cart_after_checkout["items"]
    remaining_product_ids = [item["product"]["id"] for item in remaining_items]

    print(f"Post-Checkout Cart Count: {cart_after_checkout['total_quantity']} items (Remaining product IDs: {remaining_product_ids})")
    assert prod_apple["id"] not in remaining_product_ids, "Purchased product was NOT removed from database cart!"
    assert cart_after_checkout["total_quantity"] == 7, f"Expected 7 remaining items in cart, got {cart_after_checkout['total_quantity']}"
    print("Verified: Purchased products were cleanly REMOVED from customer's cart, leaving other items intact!")

    # 4. Test Guest Checkout does not pollute Member carts
    print("\n--- 4. Testing Guest Checkout Isolation ---")
    guest_payload = {
        "customer_name": "Khách Vãng Lai Test",
        "customer_phone": "0911223344",
        "customer_email": "guest.test@gmail.com",
        "delivery_address": "Hà Nội",
        "payment_method": "COD",
        "items": [
            {"product_id": prod_apple["id"], "quantity": 1}
        ]
    }
    guest_checkout_res = api_request("/orders/checkout/", method="POST", data=guest_payload)
    assert guest_checkout_res.get("success") is True, f"Guest checkout failed: {guest_checkout_res}"
    print(f"Guest checkout succeeded: #{guest_checkout_res['data']['order']['order_code']}")

    # Re-verify Khách An's cart is still 7 items
    recheck_an = api_request("/cart/", method="GET", token=an_token)["data"]
    assert recheck_an["total_quantity"] == 7
    print("Guest checkout did not affect member cart!")

    print("\n" + "=" * 70)
    print("ALL CART LOGIC & MULTI-USER ISOLATION TESTS PASSED 100%!")
    print("=" * 70)

if __name__ == "__main__":
    main()
