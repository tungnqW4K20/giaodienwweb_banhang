import hashlib
import hmac
import urllib.parse
from datetime import datetime
from django.conf import settings
from apps.orders.models import Order
from .models import PaymentTransaction

class VNPayService:
    @staticmethod
    def get_client_ip(request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR', '127.0.0.1')
        return ip

    @classmethod
    def generate_payment_url(cls, order: Order, request) -> str:
        """
        Builds official VNPay Sandbox payment gateway URL with HMAC-SHA512 hash.
        """
        vnp_tmn_code = getattr(settings, 'VNPAY_TMN_CODE', 'ECOFRUIT01')
        vnp_hash_secret = getattr(settings, 'VNPAY_HASH_SECRET', 'SANDBOXSECRETKEY1234567890ABCDEF')
        vnp_url = getattr(settings, 'VNPAY_PAYMENT_URL', 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html')
        vnp_return_url = getattr(settings, 'VNPAY_RETURN_URL', 'http://localhost:3000/profile.html')

        create_date = datetime.now().strftime('%Y%m%d%H%M%S')
        ip_addr = cls.get_client_ip(request)

        # Amount multiplied by 100 as per VNPay spec
        vnp_params = {
            'vnp_Version': '2.1.0',
            'vnp_Command': 'pay',
            'vnp_TmnCode': vnp_tmn_code,
            'vnp_Amount': str(int(order.total_amount) * 100),
            'vnp_CurrCode': 'VND',
            'vnp_TxnRef': order.order_code,
            'vnp_OrderInfo': f"Thanh toan don hang {order.order_code} tai EcoFruit",
            'vnp_OrderType': 'billpayment',
            'vnp_Locale': 'vn',
            'vnp_ReturnUrl': vnp_return_url,
            'vnp_IpAddr': ip_addr,
            'vnp_CreateDate': create_date,
        }

        # Sort parameters alphabetically by key
        sorted_params = sorted(vnp_params.items())
        query_string = ''
        seq = 0
        for key, val in sorted_params:
            if seq == 1:
                query_string += '&' + key + '=' + urllib.parse.quote_plus(str(val))
            else:
                seq = 1
                query_string = key + '=' + urllib.parse.quote_plus(str(val))

        # Hash with SHA512
        hash_value = hmac.new(
            vnp_hash_secret.encode('utf-8'),
            query_string.encode('utf-8'),
            hashlib.sha512
        ).hexdigest()

        payment_url = f"{vnp_url}?{query_string}&vnp_SecureHash={hash_value}"
        return payment_url

    @classmethod
    def validate_response(cls, get_params: dict) -> tuple[bool, str, dict]:
        vnp_hash_secret = getattr(settings, 'VNPAY_HASH_SECRET', 'SANDBOXSECRETKEY1234567890ABCDEF')
        input_data = {}
        vnp_secure_hash = get_params.get('vnp_SecureHash', '')

        for key, val in get_params.items():
            if key.startswith('vnp_') and key != 'vnp_SecureHash' and key != 'vnp_SecureHashType':
                input_data[key] = val

        sorted_params = sorted(input_data.items())
        query_string = ''
        seq = 0
        for key, val in sorted_params:
            if seq == 1:
                query_string += '&' + key + '=' + urllib.parse.quote_plus(str(val))
            else:
                seq = 1
                query_string = key + '=' + urllib.parse.quote_plus(str(val))

        calculated_hash = hmac.new(
            vnp_hash_secret.encode('utf-8'),
            query_string.encode('utf-8'),
            hashlib.sha512
        ).hexdigest()

        if calculated_hash.lower() == vnp_secure_hash.lower():
            response_code = get_params.get('vnp_ResponseCode')
            if response_code == '00':
                return True, "Giao dịch thành công", input_data
            else:
                return False, f"Giao dịch không thành công. Mã lỗi VNPay: {response_code}", input_data
        else:
            return False, "Chữ ký bảo mật không hợp lệ", input_data

class VietQRService:
    @staticmethod
    def generate_vietqr_url(bank_id: str, account_no: str, account_name: str, amount: int, order_code: str) -> str:
        """Generates real-time VietQR dynamic payment QR image url."""
        memo = f"ECOFRUIT {order_code}"
        encoded_memo = urllib.parse.quote(memo)
        encoded_name = urllib.parse.quote(account_name)
        return f"https://img.vietqr.io/image/{bank_id}-{account_no}-compact2.png?amount={amount}&addInfo={encoded_memo}&accountName={encoded_name}"
