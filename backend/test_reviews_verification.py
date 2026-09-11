import sys
import requests
import json

sys.stdout.reconfigure(encoding='utf-8')

BASE = 'http://127.0.0.1:8000/api/v1'

# 1. Fetch products
r_prod = requests.get(f'{BASE}/products/?page_size=5')
products = r_prod.json().get('data', [])
test_prod = products[0]
prod_id = test_prod['id']

print(f"=== TESTING PRODUCT ID: {prod_id} ({test_prod['name']}) ===")

# 2. Check reviews list
r_rev = requests.get(f'{BASE}/reviews/products/{prod_id}/')
print(f"Reviews HTTP Status: {r_rev.status_code}")
rev_data = r_rev.json().get('data', {})
print(f"Total reviews: {rev_data.get('total_reviews')}, Avg: {rev_data.get('average_rating')}")
for rev in rev_data.get('reviews', [])[:2]:
    print(f" - [{rev['rating']}★] {rev['reviewer_name']}: {rev['comment']}")

# 3. Check Eligibility for unauthenticated user
r_elig_unauth = requests.get(f'{BASE}/reviews/products/{prod_id}/eligibility/')
print("\nUnauthenticated eligibility check:", r_elig_unauth.json())

# 4. Try posting review without login -> Should be 401
r_post_unauth = requests.post(f'{BASE}/reviews/products/{prod_id}/', json={
    'rating': 5,
    'comment': 'Hàng rất ngon nhưng chưa đăng nhập'
})
print("\nPosting review without login HTTP:", r_post_unauth.status_code, r_post_unauth.json())

# 5. Login as member (khachhang@gmail.com)
r_login = requests.post(f'{BASE}/auth/login/', json={'email': 'khachhang@gmail.com', 'password': 'Customer@123456'})
token = r_login.json()['data']['tokens']['access_token']
headers = {'Authorization': f'Bearer {token}'}

# 6. Check Eligibility for logged in user who has purchased
r_elig_auth = requests.get(f'{BASE}/reviews/products/{prod_id}/eligibility/', headers=headers)
print("\nAuthenticated user eligibility check:", r_elig_auth.json())

# 7. Post review as verified user
r_post_auth = requests.post(f'{BASE}/reviews/products/{prod_id}/', headers=headers, json={
    'rating': 5,
    'comment': 'Sản phẩm mua ăn thử rất ngon, giòn ngọt tự nhiên đúng chuẩn VietGAP của GreenFruit!'
})
print("\nPosting review as verified user HTTP:", r_post_auth.status_code, r_post_auth.json())

print("\n=== REVIEWS VERIFICATION COMPLETE ===")
