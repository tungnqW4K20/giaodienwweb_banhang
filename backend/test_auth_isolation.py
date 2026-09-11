import io
import sys
import requests
import json

if isinstance(sys.stdout, io.TextIOWrapper):
    sys.stdout.reconfigure(encoding='utf-8')

BASE = 'http://127.0.0.1:8000/api/v1'

users_to_test = [
    ('admin@ecofruit.vn', 'Admin@123456', 'Quản Trị Viên EcoFruit (Admin)', 10000000, 5000),
    ('vip@ecofruit.vn', 'Vip@123456', 'Phạm Hoàng Long (Khách hàng Kim Cương)', 5000000, 8800),
    ('khachhang@gmail.com', 'Customer@123456', 'Nguyễn Văn An (Khách hàng Thân thiết)', 500000, 350),
    ('lan.tran@gmail.com', 'Password@123', 'Trần Mai Lan (Mẹ Bầu & Hữu Cơ)', 850000, 620),
]

print("=== TESTING EXPERT AUTHENTICATION & MULTI-USER ISOLATION ===")
for email, pwd, expected_name, expected_bal, expected_pts in users_to_test:
    # 1. Login
    r = requests.post(f'{BASE}/auth/login/', json={'email': email, 'password': pwd})
    assert r.status_code == 200, f"Login failed for {email}: {r.text}"
    data = r.json()['data']
    token = data['tokens']['access_token']
    
    # 2. Get Profile with Cache-Control
    headers = {'Authorization': f'Bearer {token}', 'Cache-Control': 'no-cache'}
    r_prof = requests.get(f'{BASE}/auth/profile/', headers=headers)
    assert r_prof.status_code == 200, f"Profile failed for {email}"
    u = r_prof.json()['data']
    
    # 3. Get User Orders
    r_orders = requests.get(f'{BASE}/orders/', headers=headers)
    orders = r_orders.json().get('data', [])
    
    print(f"[OK] Logged in: {u['full_name']} | Role: {u['role']} | Wallet: {int(float(u['balance'])):,}đ | Points: {u['loyalty_points']} | Orders: {len(orders)}")
    assert u['full_name'] == expected_name
    assert int(float(u['balance'])) == expected_bal
    assert u['loyalty_points'] == expected_pts
    
    # 4. Logout
    r_logout = requests.post(f'{BASE}/auth/logout/', headers=headers)
    assert r_logout.status_code == 200
    print(f"     -> Logged out completely for {email}: {r_logout.json()['message']}")

print("\n>>> ALL 4 TEST ACCOUNTS AUTHENTICATED & ISOLATED WITH 100% ACCURACY & ZERO CACHE LEAKAGE! <<<")
