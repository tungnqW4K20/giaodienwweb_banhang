import jwt
from datetime import datetime, timedelta, timezone
from django.conf import settings
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from .models import User

def generate_tokens_for_user(user: User):
    """Generate JWT Access Token and Refresh Token."""
    now = datetime.now(timezone.utc)
    access_lifetime = timedelta(minutes=getattr(settings, 'JWT_ACCESS_TOKEN_LIFETIME_MINUTES', 1440))
    refresh_lifetime = timedelta(days=30)

    access_payload = {
        'user_id': user.id,
        'email': user.email,
        'full_name': user.full_name,
        'role': user.role,
        'token_type': 'access',
        'iat': int(now.timestamp()),
        'exp': int((now + access_lifetime).timestamp()),
    }

    refresh_payload = {
        'user_id': user.id,
        'token_type': 'refresh',
        'iat': int(now.timestamp()),
        'exp': int((now + refresh_lifetime).timestamp()),
    }

    access_token = jwt.encode(access_payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    refresh_token = jwt.encode(refresh_payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

    return {
        'access_token': access_token,
        'refresh_token': refresh_token,
        'expires_in': int(access_lifetime.total_seconds()),
        'token_type': 'Bearer'
    }

def decode_token(token: str):
    """Decode and validate a JWT token."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise AuthenticationFailed('Token đã hết hạn. Vui lòng đăng nhập lại.')
    except jwt.InvalidTokenError:
        raise AuthenticationFailed('Token không hợp lệ.')

class JWTAuthentication(BaseAuthentication):
    """Custom DRF Authentication using Bearer JWT tokens."""

    def authenticate(self, request):
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return None

        parts = auth_header.split(' ')
        if len(parts) != 2 or parts[0].lower() != 'bearer':
            return None

        token = parts[1]
        payload = decode_token(token)

        if payload.get('token_type') != 'access':
            raise AuthenticationFailed('Token không phải là access token hợp lệ.')

        user_id = payload.get('user_id')
        if not user_id:
            raise AuthenticationFailed('Token không chứa user_id hợp lệ.')

        try:
            user = User.objects.get(id=user_id, is_active=True)
        except User.DoesNotExist:
            raise AuthenticationFailed('Người dùng không tồn tại hoặc đã bị khóa.')

        return (user, token)
