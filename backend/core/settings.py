"""
Django settings for EcoFruit Clean Fruit E-Commerce project.
Enterprise-Grade Architecture with MySQL ORM, Redis Cache, Celery, and SSE.
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
import dj_database_url

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Add BASE_DIR to Python path to import apps directly
sys.path.insert(0, str(BASE_DIR))

# Load .env file
load_dotenv(BASE_DIR / '.env')

# Quick-start development settings - unsuitable for production
SECRET_KEY = os.getenv('SECRET_KEY', 'ecofruit-insecure-django-dev-secret-key-2026-fruits-clean')
DEBUG = os.getenv('DEBUG', 'True').lower() in ('true', '1', 't')

ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', '*').split(',')

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'whitenoise.runserver_nostatic',
    'django.contrib.staticfiles',

    # Third Party
    'rest_framework',
    'corsheaders',

    # Custom Modular Apps
    'apps.common.apps.CommonConfig',
    'apps.authentication.apps.AuthenticationConfig',
    'apps.products.apps.ProductsConfig',
    'apps.cart.apps.CartConfig',
    'apps.orders.apps.OrdersConfig',
    'apps.payments.apps.PaymentsConfig',
    'apps.vouchers.apps.VouchersConfig',
    'apps.reviews.apps.ReviewsConfig',
    'apps.notifications.apps.NotificationsConfig',
    'apps.ai_assistant.apps.AiAssistantConfig',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR.parent, BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'core.wsgi.application'
ASGI_APPLICATION = 'core.asgi.application'

# ==============================================================================
# DATABASE CONFIGURATION (MySQL Typed ORM with Auto-Fallback to SQLite)
# ==============================================================================
DATABASE_URL = os.getenv('DATABASE_URL', '')

if DATABASE_URL:
    DATABASES = {
        'default': dj_database_url.config(
            default=DATABASE_URL,
            conn_max_age=600,
            conn_health_checks=True
        )
    }
else:
    # Explicit MySQL config from environment, or fallback to SQLite for local ease
    db_engine = os.getenv('DB_ENGINE', 'django.db.backends.mysql')
    db_name = os.getenv('DB_NAME', 'ecofruit_db')
    db_user = os.getenv('DB_USER', 'root')
    db_password = os.getenv('DB_PASSWORD', '')
    db_host = os.getenv('DB_HOST', '127.0.0.1')
    db_port = os.getenv('DB_PORT', '3306')

    DATABASES = {
        'default': {
            'ENGINE': db_engine,
            'NAME': db_name,
            'USER': db_user,
            'PASSWORD': db_password,
            'HOST': db_host,
            'PORT': db_port,
            'OPTIONS': {
                'charset': 'utf8mb4',
                'init_command': "SET sql_mode='STRICT_TRANS_TABLES', default_storage_engine=INNODB",
            } if 'mysql' in db_engine else {}
        }
    }

# Fallback test helper: if MySQL connection fails in non-production local development without running server,
# allow graceful fallback to SQLite file so setup never breaks.
if 'test' in sys.argv or os.getenv('USE_SQLITE', 'False').lower() in ('true', '1'):
    DATABASES['default'] = {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }

# Custom User Model
AUTH_USER_MODEL = 'authentication.User'

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', 'OPTIONS': {'min_length': 6}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Internationalization
LANGUAGE_CODE = 'vi-vn'
TIME_ZONE = 'Asia/Ho_Chi_Minh'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript)
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = [
    p for p in [
        BASE_DIR.parent / 'css',
        BASE_DIR.parent / 'js',
        BASE_DIR.parent / 'images',
    ] if p.exists()
]

STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Media files
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ==============================================================================
# REST FRAMEWORK & CORS CONFIGURATION
# ==============================================================================
REST_FRAMEWORK = {
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
        'rest_framework.renderers.BrowsableAPIRenderer',
    ],
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
        'rest_framework.parsers.FormParser',
        'rest_framework.parsers.MultiPartParser',
    ],
    'DEFAULT_PAGINATION_CLASS': 'apps.common.pagination.StandardResultsSetPagination',
    'PAGE_SIZE': 12,
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'apps.authentication.jwt_auth.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'EXCEPTION_HANDLER': 'apps.common.exceptions.custom_exception_handler',
}

CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]

# ==============================================================================
# CACHING & REDIS CONFIGURATION
# ==============================================================================
REDIS_URL = os.getenv('REDIS_URL', 'redis://127.0.0.1:6379/0')

CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': REDIS_URL,
        'TIMEOUT': 300,
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient' if 'django_redis' in sys.modules else None
        }
    }
}
# Fallback to local memory cache if redis is not available in local test
try:
    import redis
    r = redis.from_url(REDIS_URL, socket_timeout=1)
    r.ping()
except Exception:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'ecofruit-locmem-cache',
            'TIMEOUT': 300,
        }
    }

# ==============================================================================
# CELERY MESSAGE QUEUE CONFIGURATION
# ==============================================================================
CELERY_BROKER_URL = os.getenv('CELERY_BROKER_URL', 'redis://127.0.0.1:6379/1')
CELERY_RESULT_BACKEND = os.getenv('CELERY_RESULT_BACKEND', 'redis://127.0.0.1:6379/2')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_TIME_LIMIT = 30 * 60

# ==============================================================================
# SECURITY & JWT CONFIGURATION
# ==============================================================================
JWT_SECRET = os.getenv('JWT_SECRET', SECRET_KEY)
JWT_ALGORITHM = os.getenv('JWT_ALGORITHM', 'HS256')
JWT_ACCESS_TOKEN_LIFETIME_MINUTES = int(os.getenv('JWT_ACCESS_TOKEN_LIFETIME_MINUTES', 1440)) # 24 hours

# ==============================================================================
# VNPay Sandbox & Payment Gateway
# ==============================================================================
VNPAY_TMN_CODE = os.getenv('VNPAY_TMN_CODE', 'ECOFRUIT01')
VNPAY_HASH_SECRET = os.getenv('VNPAY_HASH_SECRET', 'SANDBOXSECRETKEY1234567890ABCDEF')
VNPAY_PAYMENT_URL = os.getenv('VNPAY_PAYMENT_URL', 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html')
VNPAY_RETURN_URL = os.getenv('VNPAY_RETURN_URL', 'http://localhost:3000/profile.html')

# ==============================================================================
# Free AI Integration (Gemini, Groq, OpenRouter)
# ==============================================================================
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', '')
GROQ_API_KEY = os.getenv('GROQ_API_KEY', '')
OPENROUTER_API_KEY = os.getenv('OPENROUTER_API_KEY', '')
