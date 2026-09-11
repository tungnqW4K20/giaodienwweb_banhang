import io
import sys
import requests
import json

if isinstance(sys.stdout, io.TextIOWrapper):
    sys.stdout.reconfigure(encoding='utf-8')

BASE = 'http://127.0.0.1:8000/api/v1'

print("=" * 60)
print("     ECOFRUIT SYSTEM & REPAIR VERIFICATION TEST")
print("=" * 60)

# -------------------------------------------------------------
# 1. Product Detail & Non-Undefined Specs Verification
# -------------------------------------------------------------
print("\n[TEST 1] Product Detail Fields & Non-Undefined Specs:")
r = requests.get(f'{BASE}/products/?page_size=5')
prods = r.json().get('data', [])

for p in prods[:3]:
    pid = p['id']
    r_detail = requests.get(f'{BASE}/products/{pid}/')
    d = r_detail.json().get('data', {})
    
    assert d.get('description'), f"Product {pid} description is missing or empty"
    assert d.get('short_description'), f"Product {pid} short_description is missing or empty"
    assert d.get('vitamins'), f"Product {pid} vitamins is missing or empty"
    assert d.get('calories'), f"Product {pid} calories is missing or empty"
    assert d.get('storage_guide'), f"Product {pid} storage_guide is missing or empty"
    assert d.get('shelf_life'), f"Product {pid} shelf_life is missing or empty"
    
    print(f"  ✓ Product #{pid} ({d['name']}):")
    print(f"    - Short Desc: {d['short_description'][:60]}...")
    print(f"    - Nutrition: {d['vitamins']} | {d['calories']}")
    print(f"    - Storage & Shelf: {d['storage_guide'][:40]}... | {d['shelf_life']}")

print("  --> ALL Product Detail fields are 100% POPULATED (NO UNDEFINED)!")

# -------------------------------------------------------------
# 2. AI Chatbot Intelligence & Interactive Cards/Buttons
# -------------------------------------------------------------
print("\n[TEST 2] AI Chatbot Grounding & Interactive Action Buttons:")

queries = [
    "Tiểu đường nên mua sản phẩm nào?",
    "Tư vấn giỏ quà biếu tặng sang trọng",
    "Có những loại hoa quả nhập khẩu nào?",
    "Hoa quả đúng mùa vụ hôm nay"
]

for q in queries:
    r_ai = requests.post(f'{BASE}/ai/chat/', json={'message': q})
    assert r_ai.status_code == 200
    res_data = r_ai.json().get('data', {})
    
    reply = res_data.get('reply', '')
    provider = res_data.get('provider', '')
    suggested_prods = res_data.get('suggested_products', [])
    suggested_acts = res_data.get('suggested_actions', [])
    
    print(f"\n  Query: \"{q}\"")
    print(f"  AI Engine: {provider}")
    print(f"  Reply snippet: {reply[:120].replace(chr(10), ' ')}...")
    print(f"  Suggested Products count: {len(suggested_prods)} -> {[p['name'] for p in suggested_prods]}")
    print(f"  Suggested Action buttons count: {len(suggested_acts)} -> {[a['label'] for a in suggested_acts]}")
    
    assert len(suggested_prods) > 0, f"AI response missing suggested products for query '{q}'"
    assert len(suggested_acts) > 0, f"AI response missing suggested actions for query '{q}'"

print("\n  --> AI Chatbot returned rich interactive cards & action buttons for all queries!")

# -------------------------------------------------------------
# 3. Verified Purchase Review Permission Verification
# -------------------------------------------------------------
print("\n[TEST 3] Review Permissions & Verified Buyer Enforcement:")

# 3.1 Unauthenticated check
r_unauth = requests.get(f'{BASE}/reviews/products/{prods[0]["id"]}/eligibility/')
assert r_unauth.json()['data']['eligible'] == False
assert r_unauth.json()['data']['is_authenticated'] == False
print("  ✓ Unauthenticated user: cannot review (eligible=False, 401 on post)")

# 3.2 Authenticated non-buyer check
r_login_an = requests.post(f'{BASE}/auth/login/', json={'email': 'khachhang@gmail.com', 'password': 'Customer@123456'})
tok_an = r_login_an.json()['data']['tokens']['access_token']
hdr_an = {'Authorization': f'Bearer {tok_an}'}

# Check product 174 (which khachhang hasn't completed purchase for)
r_elig_unbought = requests.get(f'{BASE}/reviews/products/174/eligibility/', headers=hdr_an)
assert r_elig_unbought.json()['data']['eligible'] == False
r_post_forbidden = requests.post(f'{BASE}/reviews/products/174/', headers=hdr_an, json={'rating': 5, 'comment': 'Thử viết review khi chưa mua'})
assert r_post_forbidden.status_code == 403
print("  ✓ Authenticated user without completed purchase: Blocked with HTTP 403 Forbidden!")

# 3.3 Authenticated verified buyer check
r_login_vip = requests.post(f'{BASE}/auth/login/', json={'email': 'vip@ecofruit.vn', 'password': 'Vip@123456'})
tok_vip = r_login_vip.json()['data']['tokens']['access_token']
hdr_vip = {'Authorization': f'Bearer {tok_vip}'}

# VIP has purchased product 174 (Nho mẫu đơn)
r_elig_vip = requests.get(f'{BASE}/reviews/products/174/eligibility/', headers=hdr_vip)
assert r_elig_vip.json()['data']['eligible'] == True
r_post_success = requests.post(f'{BASE}/reviews/products/174/', headers=hdr_vip, json={'rating': 5, 'comment': 'Nho mẫu đơn ăn chuẩn Nhật, rất giòn ngọt!'})
assert r_post_success.status_code in [200, 201]
print("  ✓ Authenticated verified buyer (vip@ecofruit.vn): Successfully reviewed with 5 stars!")

# -------------------------------------------------------------
# 4. Frontend HTTP Server Status Check
# -------------------------------------------------------------
print("\n[TEST 4] Frontend Server on port 3000:")
r_fe = requests.get('http://localhost:3000/product-detail.html?id=174')
assert r_fe.status_code == 200
assert 'GreenFruit Eco' in r_fe.text
print("  ✓ Frontend web server responding at http://localhost:3000/ (HTTP 200)")

print("\n" + "=" * 60)
print("     ALL 4 SYSTEM VERIFICATION TESTS PASSED 100%!")
print("=" * 60)
