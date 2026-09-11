import sys
import requests
import json

sys.stdout.reconfigure(encoding='utf-8')

BASE = 'http://127.0.0.1:8000/api/v1'

print('=== 1. HEALTH CHECK ===')
r = requests.get(f'{BASE}/health/')
print(f"Status: {r.status_code}")
print(json.dumps(r.json(), indent=2, ensure_ascii=False))

print('\n=== 2. CATEGORIES ===')
r = requests.get(f'{BASE}/products/categories/')
cats = r.json().get('data', [])
print(f"Status: {r.status_code} | Total Categories: {len(cats)}")
for c in cats[:3]:
    print(f" - {c['name']} (Slug: {c['slug']}, Products: {c['product_count']})")

print('\n=== 3. PRODUCTS ===')
r = requests.get(f'{BASE}/products/?page_size=10')
p_data = r.json()
product_list = p_data.get('data', [])
print(f"Status: {r.status_code} | Total DB Products: {p_data['meta']['count']}")
for p in product_list[:3]:
    print(f" - [{p['sku']}] {p['name']} (ID: {p['id']}): {int(float(p['price'])):,}đ/{p['unit']} ({p['season_display']})")

first_pid = product_list[0]['id'] if product_list else 1
second_pid = product_list[1]['id'] if len(product_list) > 1 else first_pid
third_pid = product_list[2]['id'] if len(product_list) > 2 else first_pid

print('\n=== 4. VOUCHER CHECK ===')
r = requests.post(f'{BASE}/vouchers/apply/', json={'code': 'ECO10', 'subtotal': 300000})
print(f"Status: {r.status_code}")
print(json.dumps(r.json(), indent=2, ensure_ascii=False))

print('\n=== 5. GUEST CHECKOUT TEST (Without Login) ===')
checkout_payload = {
    'customer_name': 'Trần Thị Thu Thảo',
    'customer_phone': '0981234567',
    'customer_email': 'thuthao@gmail.com',
    'delivery_address': 'Số 88 Cầu Giấy, Phường Quan Hoa, Quận Cầu Giấy',
    'delivery_city': 'Hà Nội',
    'delivery_district': 'Cầu Giấy',
    'payment_method': 'COD',
    'voucher_code': 'CHAOBAN',
    'items': [{'product_id': first_pid, 'quantity': 2}]
}
r = requests.post(f'{BASE}/orders/checkout/', json=checkout_payload)
print(f"Status: {r.status_code}")
order_res = r.json()
print("Message:", order_res.get('message'))
if order_res.get('data'):
    print("Order Code:", order_res['data']['order']['order_code'])
    print("Total Amount:", f"{int(float(order_res['data']['order']['total_amount'])):,}đ")

print('\n=== 6. MEMBER LOGIN & WALLET ===')
r = requests.post(f'{BASE}/auth/login/', json={'email': 'khachhang@gmail.com', 'password': 'Customer@123456'})
login_res = r.json()
token = login_res['data']['tokens']['access_token']
user_info = login_res['data']['user']
print(f"Status: {r.status_code} | Logged in as: {user_info['full_name']} | Wallet: {int(float(user_info['balance'])):,}đ | Points: {user_info['loyalty_points']}")

print('\n=== 7. CART MERGE (Guest localStorage -> Member Database) ===')
headers = {'Authorization': f'Bearer {token}'}
r = requests.post(f'{BASE}/cart/merge/', json={'items': [{'product_id': second_pid, 'quantity': 1}, {'product_id': third_pid, 'quantity': 2}]}, headers=headers)
print(f"Status: {r.status_code} | Message: {r.json()['message']}")
print("DB Cart Total Items:", r.json()['data']['total_quantity'], "Total Amount:", f"{int(float(r.json()['data']['total_amount'])):,}đ")

print('\n=== 8. AI ASSISTANT CHAT ===')
r = requests.post(f'{BASE}/ai/chat/', json={'message': 'Tôi muốn giảm cân thì nên ăn loại hoa quả nào?'})
ai_data = r.json()['data']
print(f"Status: {r.status_code} | Provider: {ai_data['provider']}")
print("AI Response:\n" + ai_data['reply'])

print('\n=== 9. PRODUCT SIMILARITY ENGINE ===')
r = requests.get(f'{BASE}/products/{first_pid}/similar/')
similars = r.json().get('data', [])
print(f"Status: {r.status_code} | Related products recommended for Product ID {first_pid}: {len(similars)}")
for sp in similars:
    print(f" -> {sp['name']} ({int(float(sp['price'])):,}đ/{sp['unit']})")

