from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from apps.common.models import TimeStampedModel

class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email là bắt buộc')
        email = self.normalize_email(email).lower()
        user = self.model(email=email, **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', User.Role.ADMIN)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser phải có is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser phải có is_superuser=True.')

        return self.create_user(email, password, **extra_fields)

class User(AbstractBaseUser, PermissionsMixin, TimeStampedModel):
    class Role(models.TextChoices):
        CUSTOMER = 'CUSTOMER', 'Khách hàng'
        STAFF = 'STAFF', 'Nhân viên'
        ADMIN = 'ADMIN', 'Quản trị viên'

    email = models.EmailField(unique=True, db_index=True, max_length=255, verbose_name="Email")
    full_name = models.CharField(max_length=255, verbose_name="Họ và tên")
    phone_number = models.CharField(max_length=20, blank=True, null=True, db_index=True, verbose_name="Số điện thoại")
    avatar = models.CharField(max_length=500, blank=True, null=True, default="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150", verbose_name="Ảnh đại diện")
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.CUSTOMER, verbose_name="Vai trò")
    balance = models.DecimalField(max_digits=12, decimal_places=0, default=0, verbose_name="Số dư ví EcoPay (VNĐ)")
    loyalty_points = models.IntegerField(default=100, verbose_name="Điểm tích lũy")
    is_active = models.BooleanField(default=True, verbose_name="Kích hoạt")
    is_staff = models.BooleanField(default=False, verbose_name="Nhân viên quản trị")

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['full_name']

    class Meta:
        db_table = 'users'
        verbose_name = 'Người dùng'
        verbose_name_plural = 'Danh sách Người dùng'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.full_name} ({self.email})"

class UserAddress(TimeStampedModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='addresses', verbose_name="Người dùng")
    recipient_name = models.CharField(max_length=255, verbose_name="Tên người nhận")
    phone_number = models.CharField(max_length=20, verbose_name="Số điện thoại người nhận")
    province = models.CharField(max_length=100, verbose_name="Tỉnh/Thành phố")
    district = models.CharField(max_length=100, verbose_name="Quận/Huyện")
    ward = models.CharField(max_length=100, blank=True, null=True, verbose_name="Phường/Xã")
    detail_address = models.CharField(max_length=255, verbose_name="Địa chỉ chi tiết")
    is_default = models.BooleanField(default=False, verbose_name="Địa chỉ mặc định")

    class Meta:
        db_table = 'user_addresses'
        verbose_name = 'Địa chỉ nhận hàng'
        verbose_name_plural = 'Danh sách Địa chỉ nhận hàng'
        ordering = ['-is_default', '-created_at']

    def __str__(self):
        return f"{self.recipient_name} - {self.detail_address}, {self.district}, {self.province}"

    def save(self, *args, **kwargs):
        if self.is_default:
            # Set other addresses of the user to is_default=False
            UserAddress.objects.filter(user=self.user, is_default=True).exclude(pk=self.pk).update(is_default=False)
        super().save(*args, **kwargs)
