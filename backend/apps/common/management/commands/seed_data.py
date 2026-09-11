from datetime import timedelta
from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Avg, Count
from django.utils import timezone

from apps.authentication.models import User, UserAddress
from apps.orders.models import Order, OrderItem, OrderStatusLog
from apps.products.models import Category, Product, ProductImage
from apps.reviews.models import ProductReview
from apps.vouchers.models import Voucher


class Command(BaseCommand):
    help = 'Seeds complete, realistic enterprise demo data for EcoFruit Clean Fruit Store'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clean',
            action='store_true',
            help='Clean all existing demo data before seeding a fresh database',
        )

    def handle(self, *args, **options):
        clean_mode = options.get('clean', False)
        self.stdout.write(self.style.NOTICE(f"[INFO] Starting database seeding for EcoFruit (Clean mode: {clean_mode})..."))

        with transaction.atomic():
            if clean_mode:
                self.stdout.write(self.style.WARNING("[RESET] Cleaning existing database tables..."))
                OrderStatusLog.objects.all().delete()
                OrderItem.objects.all().delete()
                Order.objects.all().delete()
                ProductReview.objects.all().delete()
                ProductImage.objects.all().delete()
                Product.objects.all().delete()
                Category.objects.all().delete()
                Voucher.objects.all().delete()
                UserAddress.objects.all().delete()
                User.objects.filter(is_superuser=False).delete()
                self.stdout.write(self.style.SUCCESS("[RESET] Database cleaned successfully."))

            # =========================================================================
            # 1. SEED USERS & ADDRESSES
            # =========================================================================
            users_to_seed = [
                {
                    'email': 'admin@ecofruit.vn',
                    'password': 'Admin@123456',
                    'full_name': 'Quản Trị Viên EcoFruit (Admin)',
                    'phone_number': '0901234567',
                    'avatar': 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
                    'role': User.Role.ADMIN,
                    'is_staff': True,
                    'is_superuser': True,
                    'balance': 10000000,
                    'loyalty_points': 5000,
                    'addresses': [
                        {
                            'recipient_name': 'Văn Phòng EcoFruit HQ',
                            'phone': '0901234567',
                            'address': '72 Lê Thánh Tôn, Phường Bến Nghé, Quận 1',
                            'city': 'TP. Hồ Chí Minh',
                            'district': 'Quận 1',
                            'ward': 'Bến Nghé',
                            'is_default': True
                        }
                    ]
                },
                {
                    'email': 'staff@ecofruit.vn',
                    'password': 'Staff@123456',
                    'full_name': 'Trần Thu Hà (Quản lý kho & Đơn hàng)',
                    'phone_number': '0912345678',
                    'avatar': 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200',
                    'role': User.Role.STAFF,
                    'is_staff': True,
                    'is_superuser': False,
                    'balance': 2500000,
                    'loyalty_points': 1200,
                    'addresses': [
                        {
                            'recipient_name': 'Kho Trung Tâm Cầu Giấy',
                            'phone': '0912345678',
                            'address': '180 Trần Duy Hưng, Phường Trung Hòa, Cầu Giấy',
                            'city': 'Hà Nội',
                            'district': 'Cầu Giấy',
                            'ward': 'Trung Hòa',
                            'is_default': True
                        }
                    ]
                },
                {
                    'email': 'vip@ecofruit.vn',
                    'password': 'Vip@123456',
                    'full_name': 'Phạm Hoàng Long (Khách hàng Kim Cương)',
                    'phone_number': '0933889977',
                    'avatar': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
                    'role': User.Role.CUSTOMER,
                    'is_staff': False,
                    'is_superuser': False,
                    'balance': 5000000,
                    'loyalty_points': 8800,
                    'addresses': [
                        {
                            'recipient_name': 'Phạm Hoàng Long (Biệt thự Vinhomes)',
                            'phone': '0933889977',
                            'address': 'Biệt thự B6-12 Vinhomes Riverside, Long Biên',
                            'city': 'Hà Nội',
                            'district': 'Long Biên',
                            'ward': 'Phúc Đồng',
                            'is_default': True
                        }
                    ]
                },
                {
                    'email': 'khachhang@gmail.com',
                    'password': 'Customer@123456',
                    'full_name': 'Nguyễn Văn An (Khách hàng Thân thiết)',
                    'phone_number': '0988776655',
                    'avatar': 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200',
                    'role': User.Role.CUSTOMER,
                    'is_staff': False,
                    'is_superuser': False,
                    'balance': 500000,
                    'loyalty_points': 350,
                    'addresses': [
                        {
                            'recipient_name': 'Nguyễn Văn An (Công ty)',
                            'phone': '0988776655',
                            'address': 'Tầng 8, Tòa nhà Keangnam Landmark 72',
                            'city': 'Hà Nội',
                            'district': 'Nam Từ Liêm',
                            'ward': 'Mễ Trì',
                            'is_default': True
                        },
                        {
                            'recipient_name': 'Nguyễn Văn An (Nhà riêng)',
                            'phone': '0988776655',
                            'address': 'Số 15 ngõ 120 Hoàng Quốc Việt',
                            'city': 'Hà Nội',
                            'district': 'Cầu Giấy',
                            'ward': 'Nghĩa Đô',
                            'is_default': False
                        }
                    ]
                },
                {
                    'email': 'lan.tran@gmail.com',
                    'password': 'Password@123',
                    'full_name': 'Trần Mai Lan (Mẹ Bầu & Hữu Cơ)',
                    'phone_number': '0977112233',
                    'avatar': 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200',
                    'role': User.Role.CUSTOMER,
                    'is_staff': False,
                    'is_superuser': False,
                    'balance': 850000,
                    'loyalty_points': 620,
                    'addresses': [
                        {
                            'recipient_name': 'Trần Mai Lan',
                            'phone': '0977112233',
                            'address': 'Căn hộ 12A-04 Chung cư Imperia Sky Garden, 423 Minh Khai',
                            'city': 'Hà Nội',
                            'district': 'Hai Bà Trưng',
                            'ward': 'Vĩnh Tuy',
                            'is_default': True
                        }
                    ]
                },
                {
                    'email': 'demo@greenfruit.vn',
                    'password': 'password123',
                    'full_name': 'Nguyễn Văn Xanh (Tài khoản Demo Frontend)',
                    'phone_number': '0909123456',
                    'avatar': 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200',
                    'role': User.Role.CUSTOMER,
                    'is_staff': False,
                    'is_superuser': False,
                    'balance': 3500000,
                    'loyalty_points': 1250,
                    'addresses': [
                        {
                            'recipient_name': 'Nguyễn Văn Xanh',
                            'phone': '0909123456',
                            'address': '72 Lê Thánh Tôn, Phường Bến Nghé, Quận 1',
                            'city': 'TP. Hồ Chí Minh',
                            'district': 'Quận 1',
                            'ward': 'Bến Nghé',
                            'is_default': True
                        }
                    ]
                }
            ]

            user_objects = {}
            for udata in users_to_seed:
                user_obj, _ = User.objects.get_or_create(email=udata['email'].lower())
                user_obj.full_name = udata['full_name']
                user_obj.phone_number = udata['phone_number']
                user_obj.avatar = udata.get('avatar', user_obj.avatar)
                user_obj.role = udata['role']
                user_obj.is_staff = udata.get('is_staff', False)
                user_obj.is_superuser = udata.get('is_superuser', False)
                user_obj.is_active = True
                user_obj.balance = udata['balance']
                user_obj.loyalty_points = udata['loyalty_points']
                user_obj.set_password(udata['password'])
                user_obj.save()
                user_objects[udata['email']] = user_obj

                # Create or sync addresses
                for addr in udata.get('addresses', []):
                    addr_obj, created = UserAddress.objects.get_or_create(
                        user=user_obj,
                        detail_address=addr['address'],
                        defaults={
                            'recipient_name': addr['recipient_name'],
                            'phone_number': addr['phone'],
                            'province': addr['city'],
                            'district': addr['district'],
                            'ward': addr.get('ward', ''),
                            'is_default': addr.get('is_default', False)
                        }
                    )
                    if not created:
                        addr_obj.recipient_name = addr['recipient_name']
                        addr_obj.phone_number = addr['phone']
                        addr_obj.province = addr['city']
                        addr_obj.district = addr['district']
                        addr_obj.ward = addr.get('ward', '')
                        addr_obj.is_default = addr.get('is_default', False)
                        addr_obj.save()

            self.stdout.write(self.style.SUCCESS(f"[OK] {len(users_to_seed)} Enterprise Users & Addresses synchronized."))

            # =========================================================================
            # 2. SEED CATEGORIES WITH HIGH-RES BANNERS
            # =========================================================================
            categories_data = [
                {
                    "name": "Hoa Quả Nhập Khẩu",
                    "slug": "nhap-khau",
                    "icon": "bi-globe",
                    "image": "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=800",
                    "display_order": 1,
                    "description": "Trái cây tuyển chọn nhập khẩu trực tiếp từ Mỹ, New Zealand, Nhật Bản, Hàn Quốc chuẩn GlobalGAP."
                },
                {
                    "name": "Trái Cây Nội Địa",
                    "slug": "noi-dia",
                    "icon": "bi-geo-alt",
                    "image": "https://images.unsplash.com/photo-1546548970-71785318a17b?w=800",
                    "display_order": 2,
                    "description": "Đặc sản các vùng miền Việt Nam chuẩn VietGAP, thu hái tươi tại vườn miệt vườn Nam Bộ và đồi núi Tây Bắc."
                },
                {
                    "name": "Hoa Quả Hữu Cơ (Organic)",
                    "slug": "organic",
                    "icon": "bi-shield-check",
                    "image": "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=800",
                    "display_order": 3,
                    "description": "Chứng nhận 100% hữu cơ USDA/EU Organic, canh tác tự nhiên không hóa chất bảo quản và không biến đổi gen."
                },
                {
                    "name": "Trái Cây Sấy & Chế Biến",
                    "slug": "trai-cay-say",
                    "icon": "bi-box2-heart",
                    "image": "https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?w=800",
                    "display_order": 4,
                    "description": "Trái cây sấy dẻo, sấy thăng hoa giòn rụm nguyên chất 100%, bổ dưỡng tiện lợi cho gia đình và văn phòng."
                },
                {
                    "name": "Hộp Quà & Giỏ Quà Tặng",
                    "slug": "hop-qua",
                    "icon": "bi-gift",
                    "image": "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=800",
                    "display_order": 5,
                    "description": "Set quà sang trọng lịch sự kết hợp hoa tươi nghệ thuật cho dịp lễ tết, thăm hỏi, mừng tân gia, sinh nhật."
                },
                {
                    "name": "Combo Tiết Kiệm",
                    "slug": "combo",
                    "icon": "bi-tags",
                    "image": "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=800",
                    "display_order": 6,
                    "description": "Gói trái cây tuần đủ dinh dưỡng cho cả gia đình và set Eat Clean giữ dáng với giá ưu đãi siêu hời."
                },
            ]

            cat_map = {}
            for c in categories_data:
                cat_obj, created = Category.objects.get_or_create(slug=c['slug'], defaults=c)
                if not created:
                    for k, v in c.items():
                        setattr(cat_obj, k, v)
                    cat_obj.save()
                cat_map[c['slug']] = cat_obj

            self.stdout.write(self.style.SUCCESS(f"[OK] {len(categories_data)} Categories created with rich metadata."))

            # =========================================================================
            # 3. SEED 28+ PRODUCTS WITH FULL ATTRIBUTES & NUTRITIONAL FACTS
            # =========================================================================
            products_data = [
                # --- Nhóm Nhập Khẩu ---
                {
                    "category": cat_map['nhap-khau'],
                    "name": "Táo Envy New Zealand Size L",
                    "slug": "tao-envy-new-zealand-size-l",
                    "sku": "AP-ENVY-NZ",
                    "price": 145000,
                    "original_price": 180000,
                    "unit": "kg",
                    "stock": 120,
                    "season": Product.SeasonChoice.IN_SEASON,
                    "origin": "Hawke's Bay, New Zealand",
                    "certification": "GlobalGAP / New Zealand Standard",
                    "calories": "52 kcal / 100g",
                    "vitamins": "Vitamin C, Kali, Chất xơ Pectin",
                    "storage_guide": "Bảo quản ngăn mát 4 - 8°C, tránh để cạnh thực phẩm có mùi nồng.",
                    "shelf_life": "7 - 10 ngày trong tủ mát",
                    "short_description": "Táo Envy New Zealand giòn tan, vị ngọt đậm đà, thơm nức mùi hoa cỏ mùa xuân.",
                    "description": "Táo Envy là giống táo cao cấp nhất của New Zealand với lớp vỏ đỏ ruby bắt mắt cùng những tia vàng tinh tế. Thịt táo giòn đanh, mọng nước, để lâu trong không khí vẫn giữ được màu trắng sữa tinh khiết mà không bị thâm.",
                    "image": "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=600",
                    "gallery": [
                        "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=600",
                        "https://images.unsplash.com/photo-1570913149827-d2ac84ab3f9a?w=600",
                        "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=600"
                    ],
                    "tags": "táo, envy, new zealand, táo nhập khẩu, giảm cân",
                    "rating": 4.9,
                    "review_count": 84,
                    "sold_count": 520,
                    "is_featured": True,
                    "is_bestseller": True,
                    "is_organic": True
                },
                {
                    "category": cat_map['nhap-khau'],
                    "name": "Nho Mẫu Đơn Shine Muscat Nhật Bản",
                    "slug": "nho-mau-don-shine-muscat-nhat-ban",
                    "sku": "GR-SHINE-JP",
                    "price": 450000,
                    "original_price": 550000,
                    "unit": "chùm 600g",
                    "stock": 45,
                    "season": Product.SeasonChoice.IN_SEASON,
                    "origin": "Okayama, Nhật Bản",
                    "certification": "JAS Organic Nhật Bản",
                    "calories": "69 kcal / 100g",
                    "vitamins": "Resveratrol, Vitamin B6, Vitamin C",
                    "storage_guide": "Bọc túi kín bảo quản ngăn mát 2 - 4°C, không rửa trước khi cất.",
                    "shelf_life": "10 - 14 ngày",
                    "short_description": "Nho Mẫu Đơn quả to tròn, vỏ mỏng không chát, hương thơm hoa hồng xạ hương quý phái.",
                    "description": "Được mệnh danh là 'vua của các loài nho', Shine Muscat trồng theo phương pháp 1 cành 1 chùm tại Nhật Bản để đạt độ ngọt hoàn hảo trên 18 độ Brix.",
                    "image": "https://images.unsplash.com/photo-1596363505729-4190a9506133?w=600",
                    "gallery": [
                        "https://images.unsplash.com/photo-1596363505729-4190a9506133?w=600",
                        "https://images.unsplash.com/photo-1537640538966-79f369143f8f?w=600"
                    ],
                    "tags": "nho, nho mẫu đơn, shine muscat, nhật bản, quà biếu",
                    "rating": 5.0,
                    "review_count": 42,
                    "sold_count": 180,
                    "is_featured": True,
                    "is_bestseller": False,
                    "is_organic": True
                },
                {
                    "category": cat_map['nhap-khau'],
                    "name": "Cherry Đỏ Mỹ Size 9.0 Premium",
                    "slug": "cherry-do-my-size-9-premium",
                    "sku": "CH-RED-US9",
                    "price": 380000,
                    "original_price": 460000,
                    "unit": "hộp 500g",
                    "stock": 60,
                    "season": Product.SeasonChoice.IN_SEASON,
                    "origin": "Washington, Hoa Kỳ",
                    "certification": "USDA Inspector Grade A",
                    "calories": "63 kcal / 100g",
                    "vitamins": "Chất chống oxy hóa Anthocyanin, Melatonin",
                    "storage_guide": "Nhiệt độ 0 - 2°C giúp cuống cherry luôn xanh tươi.",
                    "shelf_life": "5 - 7 ngày",
                    "short_description": "Cherry đỏ Mỹ trái to chắc nịch, cuống xanh tươi, thịt dày mọng nước ngọt đậm đà.",
                    "description": "Cherry vùng Washington nổi tiếng thế giới nhờ thổ nhưỡng núi lửa và nguồn nước băng tan tinh khiết, mang lại lượng vitamin và khoáng chất dồi dào.",
                    "image": "https://images.unsplash.com/photo-1528825871115-3581a5387919?w=600",
                    "gallery": [
                        "https://images.unsplash.com/photo-1528825871115-3581a5387919?w=600",
                        "https://images.unsplash.com/photo-1559181567-c3190ca9959b?w=600"
                    ],
                    "tags": "cherry, cherry mỹ, hoa quả nhập khẩu, quà tặng",
                    "rating": 4.8,
                    "review_count": 65,
                    "sold_count": 310,
                    "is_featured": True,
                    "is_bestseller": True,
                    "is_organic": False
                },
                {
                    "category": cat_map['nhap-khau'],
                    "name": "Kiwi Vàng Zespri New Zealand",
                    "slug": "kiwi-vang-zespri-new-zealand",
                    "sku": "KW-GOLD-NZ",
                    "price": 120000,
                    "original_price": 150000,
                    "unit": "hộp 4 quả",
                    "stock": 90,
                    "season": Product.SeasonChoice.ALL_YEAR,
                    "origin": "Tauranga, New Zealand",
                    "certification": "GlobalGAP Zespri Standard",
                    "calories": "60 kcal / 100g",
                    "vitamins": "Vitamin C gấp 3 lần cam, Vitamin E, Folate",
                    "storage_guide": "Bảo quản nhiệt độ phòng khi chưa chín, cất tủ lạnh khi quả mềm tay.",
                    "shelf_life": "7 ngày",
                    "short_description": "Kiwi vàng ruột vàng ươm mọng nước, vị ngọt dịu thanh mát như mật ong nhiệt đới.",
                    "description": "Kiwi Zespri SunGold New Zealand là nguồn bổ sung Vitamin C tự nhiên xuất sắc giúp tăng cường hệ miễn dịch và làm đẹp da.",
                    "image": "https://images.unsplash.com/photo-1618897996318-5a901fa6ca71?w=600",
                    "gallery": [
                        "https://images.unsplash.com/photo-1618897996318-5a901fa6ca71?w=600",
                        "https://images.unsplash.com/photo-1585059895524-72359e06133a?w=600"
                    ],
                    "tags": "kiwi, kiwi vàng, zespri, new zealand, vitamin c",
                    "rating": 4.9,
                    "review_count": 53,
                    "sold_count": 410,
                    "is_featured": False,
                    "is_bestseller": True,
                    "is_organic": True
                },
                {
                    "category": cat_map['nhap-khau'],
                    "name": "Việt Quất Tươi Driscoll's Mỹ",
                    "slug": "viet-quat-tuoi-driscolls-my",
                    "sku": "BL-DRISCOLL-US",
                    "price": 95000,
                    "original_price": 125000,
                    "unit": "hộp 125g",
                    "stock": 80,
                    "season": Product.SeasonChoice.IN_SEASON,
                    "origin": "California, Hoa Kỳ",
                    "certification": "USDA Organic",
                    "calories": "57 kcal / 100g",
                    "vitamins": "Anthocyanin, Vitamin K, Mangan",
                    "storage_guide": "Bảo quản ngăn mát 2 - 5°C trong hộp thoáng khí.",
                    "shelf_life": "7 - 10 ngày",
                    "short_description": "Việt quất quả to tròn đều, phủ lớp phấn trắng tự nhiên bảo vệ quả tươi lâu.",
                    "description": "Việt quất là siêu thực phẩm bổ mắt, tăng cường trí nhớ và phòng chống lão hóa hiệu quả.",
                    "image": "https://images.unsplash.com/photo-1498557850523-fd3d118b962e?w=600",
                    "gallery": [
                        "https://images.unsplash.com/photo-1498557850523-fd3d118b962e?w=600",
                        "https://images.unsplash.com/photo-1506806732259-39c2d0268443?w=600"
                    ],
                    "tags": "việt quất, blueberry, mỹ, siêu thực phẩm, eat clean",
                    "rating": 4.7,
                    "review_count": 38,
                    "sold_count": 270,
                    "is_featured": False,
                    "is_bestseller": False,
                    "is_organic": True
                },
                {
                    "category": cat_map['nhap-khau'],
                    "name": "Cam Ruột Đỏ Cara Cara Úc",
                    "slug": "cam-ruot-do-cara-cara-uc",
                    "sku": "OR-CARA-AU",
                    "price": 135000,
                    "original_price": 165000,
                    "unit": "kg (3-4 quả)",
                    "stock": 85,
                    "season": Product.SeasonChoice.IN_SEASON,
                    "origin": "Riverland, Úc",
                    "certification": "Australian Standard Certified",
                    "calories": "50 kcal / 100g",
                    "vitamins": "Lycopene, Vitamin C, Axit Folic",
                    "storage_guide": "Bảo quản ngăn mát tủ lạnh 5 - 8°C.",
                    "shelf_life": "14 ngày",
                    "short_description": "Cam Cara Cara tép màu hồng ngọc quyến rũ, ngọt thanh không hạt, giàu Lycopene ngừa ung thư.",
                    "description": "Cam ruột đỏ Cara Cara không hạt của Úc mang hương vị lai giữa cam truyền thống và quả mâm xôi dịu ngọt độc đáo.",
                    "image": "https://images.unsplash.com/photo-1582979512210-99b6a53386f9?w=600",
                    "gallery": [
                        "https://images.unsplash.com/photo-1582979512210-99b6a53386f9?w=600"
                    ],
                    "tags": "cam cara cara, úc, cam ruột đỏ, lycopene, organic",
                    "rating": 4.8,
                    "review_count": 31,
                    "sold_count": 195,
                    "is_featured": False,
                    "is_bestseller": False,
                    "is_organic": True
                },

                # --- Nhóm Nội Địa ---
                {
                    "category": cat_map['noi-dia'],
                    "name": "Sầu Riêng Ri6 Chín Cây Miền Tây",
                    "slug": "sau-rieng-ri6-chin-cay-mien-tay",
                    "sku": "DU-RI6-VN",
                    "price": 165000,
                    "original_price": 195000,
                    "unit": "kg nguyên quả",
                    "stock": 70,
                    "season": Product.SeasonChoice.IN_SEASON,
                    "origin": "Vĩnh Long, Việt Nam",
                    "certification": "VietGAP Tiêu chuẩn cao",
                    "calories": "147 kcal / 100g",
                    "vitamins": "B-complex, Đồng, Sắt, Axit Folic",
                    "storage_guide": "Để nơi thoáng mát đến khi nứt gai, sau đó bóc múi bảo quản hộp kín trong tủ mát.",
                    "shelf_life": "3 - 5 ngày sau khi chín",
                    "short_description": "Sầu riêng Ri6 cơm vàng óng, hạt lép 90%, béo ngậy đậm vị ngọt tự nhiên bao ăn 1 đổi 1.",
                    "description": "Được hái từ cây trên 15 năm tuổi tại miệt vườn miền Tây, từng múi sầu riêng ráo tay dẻo quánh, bảo đảm không ngâm thuốc kích chín.",
                    "image": "https://images.unsplash.com/photo-1587334274328-64186a80aeee?w=600",
                    "gallery": [
                        "https://images.unsplash.com/photo-1587334274328-64186a80aeee?w=600",
                        "https://images.unsplash.com/photo-1546548970-71785318a17b?w=600"
                    ],
                    "tags": "sầu riêng, ri6, miền tây, trái cây nội địa, đặc sản",
                    "rating": 5.0,
                    "review_count": 112,
                    "sold_count": 680,
                    "is_featured": True,
                    "is_bestseller": True,
                    "is_organic": True
                },
                {
                    "category": cat_map['noi-dia'],
                    "name": "Bơ Sáp 034 Đắk Lắk Dẻo Quánh",
                    "slug": "bo-sap-034-dak-lak-deo-quanh",
                    "sku": "AV-034-DL",
                    "price": 65000,
                    "original_price": 85000,
                    "unit": "kg (2-3 quả)",
                    "stock": 150,
                    "season": Product.SeasonChoice.IN_SEASON,
                    "origin": "Đắk Lắk, Việt Nam",
                    "certification": "VietGAP",
                    "calories": "160 kcal / 100g",
                    "vitamins": "Omega 3, Axit Oleic, Vitamin E, Kali",
                    "storage_guide": "Xếp quả đứng đầu hướng lên, quả chín mềm tay cất ngăn mát tủ lạnh.",
                    "shelf_life": "4 - 6 ngày",
                    "short_description": "Bơ 034 dáng dài hạt lép, cơm dày màu vàng mỡ gà béo ngậy cực kỳ thơm ngon.",
                    "description": "Bơ sáp 034 là giống bơ trứ danh của vùng đất bazan Đắk Lắk, giàu chất béo tốt bảo vệ tim mạch và phù hợp cho trẻ ăn dặm, người giảm cân.",
                    "image": "https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=600",
                    "gallery": [
                        "https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=600",
                        "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=600"
                    ],
                    "tags": "bơ, bơ 034, đắk lắk, bơ sáp, mẹ bầu, giảm cân",
                    "rating": 4.8,
                    "review_count": 76,
                    "sold_count": 490,
                    "is_featured": True,
                    "is_bestseller": True,
                    "is_organic": True
                },
                {
                    "category": cat_map['noi-dia'],
                    "name": "Bưởi Da Xanh Bến Tre Ruột Hồng",
                    "slug": "buoi-da-xanh-ben-tre-ruot-hong",
                    "sku": "PM-DAXANH-BT",
                    "price": 75000,
                    "original_price": 95000,
                    "unit": "kg (quả 1.3 - 1.8kg)",
                    "stock": 110,
                    "season": Product.SeasonChoice.ALL_YEAR,
                    "origin": "Bến Tre, Việt Nam",
                    "certification": "Chỉ dẫn địa lý Bến Tre / VietGAP",
                    "calories": "38 kcal / 100g",
                    "vitamins": "Vitamin C, Naringin hỗ trợ hạ mỡ máu",
                    "storage_guide": "Bảo quản nơi khô ráo thoáng mát, để càng héo ăn càng ngọt đậm.",
                    "shelf_life": "15 - 20 ngày",
                    "short_description": "Bưởi da xanh vỏ mỏng xanh mướt, tép bưởi mọng nước màu hồng ngọc giòn ngọt không the.",
                    "description": "Bưởi da xanh Bến Tre là món quà thiên nhiên tuyệt vời thanh lọc cơ thể, tiêu mỡ thừa và giải nhiệt ngày hè.",
                    "image": "https://images.unsplash.com/photo-1577234286642-fc512a5f8f11?w=600",
                    "gallery": [
                        "https://images.unsplash.com/photo-1577234286642-fc512a5f8f11?w=600"
                    ],
                    "tags": "bưởi, bưởi da xanh, bến tre, giảm cân, thanh lọc",
                    "rating": 4.9,
                    "review_count": 89,
                    "sold_count": 560,
                    "is_featured": False,
                    "is_bestseller": True,
                    "is_organic": True
                },
                {
                    "category": cat_map['noi-dia'],
                    "name": "Măng Cụt Lái Thiêu Ruột Trắng Tuyết",
                    "slug": "mang-cut-lai-thieu-ruot-trang-tuyet",
                    "sku": "MG-LAITHIEU-VN",
                    "price": 110000,
                    "original_price": 140000,
                    "unit": "kg",
                    "stock": 55,
                    "season": Product.SeasonChoice.IN_SEASON,
                    "origin": "Bình Dương, Việt Nam",
                    "certification": "VietGAP",
                    "calories": "73 kcal / 100g",
                    "vitamins": "Xanthones kháng viêm, Vitamin C",
                    "storage_guide": "Bảo quản túi zip trong ngăn mát 6 - 10°C.",
                    "shelf_life": "5 - 7 ngày",
                    "short_description": "Măng cụt 'Nữ hoàng trái cây' vỏ mềm dễ tách, múi mọng ngọt thanh mát.",
                    "description": "Măng cụt vườn cổ thụ Lái Thiêu nổi tiếng với vị chua ngọt hài hòa khó quên và hàm lượng chất chống oxy hóa cực cao.",
                    "image": "https://images.unsplash.com/photo-1546548970-71785318a17b?w=600",
                    "gallery": [
                        "https://images.unsplash.com/photo-1546548970-71785318a17b?w=600"
                    ],
                    "tags": "măng cụt, lái thiêu, nữ hoàng trái cây, đúng mùa",
                    "rating": 4.9,
                    "review_count": 47,
                    "sold_count": 340,
                    "is_featured": True,
                    "is_bestseller": False,
                    "is_organic": True
                },
                {
                    "category": cat_map['noi-dia'],
                    "name": "Vải Thiều Lục Ngạn Hạt Nhỏ",
                    "slug": "vai-thieu-luc-ngan-hat-nho",
                    "sku": "LY-LUCNGAN-VN",
                    "price": 60000,
                    "original_price": 75000,
                    "unit": "kg",
                    "stock": 95,
                    "season": Product.SeasonChoice.IN_SEASON,
                    "origin": "Bắc Giang, Việt Nam",
                    "certification": "VietGAP / Chỉ dẫn địa lý Lục Ngạn",
                    "calories": "66 kcal / 100g",
                    "vitamins": "Vitamin C, Đồng, Polyphenol",
                    "storage_guide": "Cắt cuống, bọc giấy báo hoặc hộp kín trong tủ mát.",
                    "shelf_life": "5 - 7 ngày",
                    "short_description": "Vải thiều Lục Ngạn quả đỏ ối, cùi dày giòn mọng nước, hạt bé xíu ngọt lịm.",
                    "description": "Vải thiều Bắc Giang chuẩn đất đồi Lục Ngạn được hái vào sáng sớm tinh mơ để giữ trọn vẹn hương thơm nồng nàn.",
                    "image": "https://images.unsplash.com/photo-1550258987-190a2d41a8ba?w=600",
                    "gallery": [
                        "https://images.unsplash.com/photo-1550258987-190a2d41a8ba?w=600"
                    ],
                    "tags": "vải thiều, lục ngạn, bắc giang, đúng mùa, đặc sản",
                    "rating": 4.8,
                    "review_count": 61,
                    "sold_count": 420,
                    "is_featured": False,
                    "is_bestseller": True,
                    "is_organic": True
                },
                {
                    "category": cat_map['noi-dia'],
                    "name": "Xoài Cát Hòa Lộc Tiền Giang Chuẩn Xuất Khẩu",
                    "slug": "xoai-cat-hoa-loc-tien-giang",
                    "sku": "MA-HOALOC-TG",
                    "price": 95000,
                    "original_price": 120000,
                    "unit": "kg (2 quả)",
                    "stock": 85,
                    "season": Product.SeasonChoice.IN_SEASON,
                    "origin": "Tiền Giang, Việt Nam",
                    "certification": "VietGAP Tiêu chuẩn Global",
                    "calories": "60 kcal / 100g",
                    "vitamins": "Vitamin A, C, B6, Chất xơ",
                    "storage_guide": "Quả chín thơm để tủ lạnh dùng dần trong 3 - 5 ngày.",
                    "shelf_life": "5 ngày sau khi chín",
                    "short_description": "Xoài cát Hòa Lộc thịt vàng ươm, không xơ, vị ngọt thanh tao nức mũi.",
                    "description": "Xoài cát Hòa Lộc là đỉnh cao của hoa quả nhiệt đới Việt Nam, được du khách quốc tế đặc biệt yêu thích.",
                    "image": "https://images.unsplash.com/photo-1553279768-865429fa0078?w=600",
                    "gallery": [
                        "https://images.unsplash.com/photo-1553279768-865429fa0078?w=600"
                    ],
                    "tags": "xoài, xoài cát hòa lộc, tiền giang, trái cây việt nam",
                    "rating": 4.9,
                    "review_count": 73,
                    "sold_count": 460,
                    "is_featured": True,
                    "is_bestseller": False,
                    "is_organic": True
                },
                {
                    "category": cat_map['noi-dia'],
                    "name": "Cam Sành Bố Hạ Mọng Nước",
                    "slug": "cam-sanh-bo-ha-mong-nuoc",
                    "sku": "OR-SANH-VN",
                    "price": 45000,
                    "original_price": 60000,
                    "unit": "kg (3-4 quả)",
                    "stock": 140,
                    "season": Product.SeasonChoice.IN_SEASON,
                    "origin": "Hàm Yên / Tiền Giang",
                    "certification": "VietGAP",
                    "calories": "47 kcal / 100g",
                    "vitamins": "Vitamin C dồi dào, Canxi hữu cơ",
                    "storage_guide": "Bảo quản nơi thoáng mát hoặc tủ lạnh.",
                    "shelf_life": "10 - 15 ngày",
                    "short_description": "Cam sành vỏ mỏng tép vàng óng, vắt được cực nhiều nước ngọt lịm thanh mát.",
                    "description": "Lựa chọn số một để bồi bổ sức khỏe cho gia đình, tăng đề kháng cho trẻ nhỏ và người lớn tuổi.",
                    "image": "https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?w=600",
                    "gallery": [
                        "https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?w=600"
                    ],
                    "tags": "cam sành, vắt nước, vitamin c, tăng đề kháng",
                    "rating": 4.7,
                    "review_count": 95,
                    "sold_count": 620,
                    "is_featured": False,
                    "is_bestseller": True,
                    "is_organic": True
                },
                {
                    "category": cat_map['noi-dia'],
                    "name": "Mận Hậu Mộc Châu VIP Size Đại",
                    "slug": "man-hau-moc-chau-vip",
                    "sku": "PL-HAU-MC",
                    "price": 85000,
                    "original_price": 110000,
                    "unit": "kg",
                    "stock": 100,
                    "season": Product.SeasonChoice.IN_SEASON,
                    "origin": "Mộc Châu, Sơn La",
                    "certification": "VietGAP Mộc Châu",
                    "calories": "46 kcal / 100g",
                    "vitamins": "Vitamin C, Chất chống oxy hóa Polyphenol",
                    "storage_guide": "Bảo quản ngăn mát 4 - 8°C, rửa sạch trước khi ăn.",
                    "shelf_life": "7 ngày",
                    "short_description": "Mận hậu Sơn La size đại phủ phấn trắng, quả chín đỏ au giòn sần sật ngọt lịm chấm muối tôm cực đã.",
                    "description": "Mận hậu Mộc Châu được thu hoạch từ những cây mận cổ thụ trên thung lũng Nà Ka, quả đanh chắc và ngọt lịm.",
                    "image": "https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=600",
                    "gallery": [
                        "https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=600"
                    ],
                    "tags": "mận hậu, mộc châu, sơn la, đặc sản tây bắc, ăn vặt",
                    "rating": 4.9,
                    "review_count": 58,
                    "sold_count": 410,
                    "is_featured": False,
                    "is_bestseller": False,
                    "is_organic": True
                },

                # --- Nhóm Hữu Cơ (Organic) ---
                {
                    "category": cat_map['organic'],
                    "name": "Dâu Tây Bạch Tuyết Organic Đà Lạt",
                    "slug": "dau-tay-bach-tuyet-organic-da-lat",
                    "sku": "ST-WHITE-DL",
                    "price": 280000,
                    "original_price": 350000,
                    "unit": "hộp 330g",
                    "stock": 35,
                    "season": Product.SeasonChoice.IN_SEASON,
                    "origin": "Đà Lạt, Lâm Đồng",
                    "certification": "Chứng nhận Hữu cơ Quốc tế",
                    "calories": "32 kcal / 100g",
                    "vitamins": "Axit Ellagic, Vitamin C, Mangan",
                    "storage_guide": "Bảo quản ngăn mát 3 - 5°C, không rửa trước khi cất.",
                    "shelf_life": "3 - 5 ngày",
                    "short_description": "Dâu tây trắng muốt hương thơm nồng nàn như kẹo sữa và trái đào tiên.",
                    "description": "Giống dâu tây quý hiếm được canh tác hữu cơ trong nhà kính thông minh tại cao nguyên Đà Lạt.",
                    "image": "https://images.unsplash.com/photo-1543158181-e6f9f6712055?w=600",
                    "gallery": [
                        "https://images.unsplash.com/photo-1543158181-e6f9f6712055?w=600",
                        "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=600"
                    ],
                    "tags": "dâu tây, dâu bạch tuyết, organic, đà lạt, độc lạ",
                    "rating": 5.0,
                    "review_count": 29,
                    "sold_count": 140,
                    "is_featured": True,
                    "is_bestseller": False,
                    "is_organic": True
                },
                {
                    "category": cat_map['organic'],
                    "name": "Dưa Lưới Huỳnh Long Ruột Cam Organic",
                    "slug": "dua-luoi-huynh-long-organic",
                    "sku": "ME-HUYNHLONG-ORG",
                    "price": 115000,
                    "original_price": 145000,
                    "unit": "kg (quả 1.5 - 2kg)",
                    "stock": 65,
                    "season": Product.SeasonChoice.ALL_YEAR,
                    "origin": "Tây Ninh, Việt Nam",
                    "certification": "GlobalGAP / USDA Organic",
                    "calories": "34 kcal / 100g",
                    "vitamins": "Beta-Carotene (tiền Vitamin A), Vitamin C",
                    "storage_guide": "Bảo quản nhiệt độ mát, ăn lạnh sẽ giòn ngọt hơn.",
                    "shelf_life": "10 ngày",
                    "short_description": "Dưa lưới vân nổi đẹp mắt, ruột cam giòn tan, vị ngọt thanh mát độ brix 15+.",
                    "description": "Dưa lưới trồng theo công nghệ tưới nhỏ giọt Israel, bảo đảm độ an toàn và hàm lượng dinh dưỡng cao nhất.",
                    "image": "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=600",
                    "gallery": [
                        "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=600"
                    ],
                    "tags": "dưa lưới, huỳnh long, hữu cơ, organic, giải nhiệt",
                    "rating": 4.8,
                    "review_count": 54,
                    "sold_count": 380,
                    "is_featured": False,
                    "is_bestseller": True,
                    "is_organic": True
                },
                {
                    "category": cat_map['organic'],
                    "name": "Thanh Long Ruột Đỏ Hữu Cơ Bình Thuận",
                    "slug": "thanh-long-ruot-do-huu-co-binh-thuan",
                    "sku": "DF-RED-BT",
                    "price": 55000,
                    "original_price": 70000,
                    "unit": "kg (2-3 quả)",
                    "stock": 120,
                    "season": Product.SeasonChoice.ALL_YEAR,
                    "origin": "Bình Thuận, Việt Nam",
                    "certification": "USDA Organic Certified",
                    "calories": "50 kcal / 100g",
                    "vitamins": "Betacyanin, Chất xơ, Sắt",
                    "storage_guide": "Bảo quản ngăn mát 5 - 8°C.",
                    "shelf_life": "7 - 10 ngày",
                    "short_description": "Thanh long ruột đỏ thẫm mọng nước, vị ngọt dịu thanh tao bồi bổ máu huyết.",
                    "description": "Sắc tố đỏ tự nhiên chứa lượng chất chống oxy hóa cao gấp nhiều lần thanh long ruột trắng.",
                    "image": "https://images.unsplash.com/photo-1527325678964-54921661f888?w=600",
                    "gallery": [
                        "https://images.unsplash.com/photo-1527325678964-54921661f888?w=600"
                    ],
                    "tags": "thanh long, thanh long đỏ, organic, bình thuận",
                    "rating": 4.7,
                    "review_count": 41,
                    "sold_count": 290,
                    "is_featured": False,
                    "is_bestseller": False,
                    "is_organic": True
                },

                # --- Nhóm Trái Cây Sấy & Chế Biến ---
                {
                    "category": cat_map['trai-cay-say'],
                    "name": "Xoài Sấy Dẻo Hoàng Kim Xuất Khẩu",
                    "slug": "xoai-say-deo-hoang-kim-xuat-khau",
                    "sku": "DR-MANGO-500G",
                    "price": 125000,
                    "original_price": 160000,
                    "unit": "túi zip 500g",
                    "stock": 200,
                    "season": Product.SeasonChoice.ALL_YEAR,
                    "origin": "Cam Ranh, Khánh Hòa",
                    "certification": "HACCP & ISO 22000",
                    "calories": "319 kcal / 100g",
                    "vitamins": "Vitamin A, Chất xơ thực vật",
                    "storage_guide": "Kéo kín miệng túi zip sau khi mở, để nơi khô ráo thoáng mát.",
                    "shelf_life": "12 tháng",
                    "short_description": "Xoài sấy dẻo công nghệ lạnh giữ nguyên màu vàng óng, dẻo thơm chua ngọt hài hòa.",
                    "description": "100% xoài cát tươi không phẩm màu hóa chất, món ăn vặt lành mạnh cho dân văn phòng và trẻ nhỏ.",
                    "image": "https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?w=600",
                    "gallery": [
                        "https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?w=600"
                    ],
                    "tags": "xoài sấy, sấy dẻo, ăn vặt healthy, quà biếu",
                    "rating": 4.9,
                    "review_count": 115,
                    "sold_count": 780,
                    "is_featured": True,
                    "is_bestseller": True,
                    "is_organic": False
                },
                {
                    "category": cat_map['trai-cay-say'],
                    "name": "Mít Sấy Giòn Thăng Hoa Cao Cấp",
                    "slug": "mit-say-gion-thang-hoa-cao-cap",
                    "sku": "DR-JACKFRUIT-400G",
                    "price": 95000,
                    "original_price": 120000,
                    "unit": "túi zip 400g",
                    "stock": 180,
                    "season": Product.SeasonChoice.ALL_YEAR,
                    "origin": "Tiền Giang, Việt Nam",
                    "certification": "HACCP Certified",
                    "calories": "380 kcal / 100g",
                    "vitamins": "Kali, Magie, Vitamin B6",
                    "storage_guide": "Bảo quản nơi khô ráo, tránh ánh nắng mặt trời.",
                    "shelf_life": "12 tháng",
                    "short_description": "Mít sấy giòn rụm nguyên miếng, thơm phức mùi mít chín tự nhiên không ngấm dầu.",
                    "description": "Sấy bằng công nghệ chân không hiện đại giữ lại 98% hàm lượng dinh dưỡng và hương vị tự nhiên.",
                    "image": "https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=600",
                    "gallery": [
                        "https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=600"
                    ],
                    "tags": "mít sấy, mít giòn, ăn vặt, trái cây sấy",
                    "rating": 4.8,
                    "review_count": 87,
                    "sold_count": 640,
                    "is_featured": False,
                    "is_bestseller": True,
                    "is_organic": False
                },
                {
                    "category": cat_map['trai-cay-say'],
                    "name": "Hạt Dinh Dưỡng Mix Trái Cây Sấy Granola",
                    "slug": "hat-dinh-duong-mix-trai-cay-say-granola",
                    "sku": "DR-MIXED-NUTS",
                    "price": 185000,
                    "original_price": 230000,
                    "unit": "hũ 500g",
                    "stock": 130,
                    "season": Product.SeasonChoice.ALL_YEAR,
                    "origin": "EcoFruit Workshop",
                    "certification": "Chuẩn Dinh Dưỡng Quốc Tế",
                    "calories": "450 kcal / 100g",
                    "vitamins": "Omega-3, Kẽm, Vitamin E, Protein",
                    "storage_guide": "Đậy kín nắp sau khi dùng, bảo quản ngăn mát giúp hạt luôn giòn ngậy.",
                    "shelf_life": "9 tháng",
                    "short_description": "Hỗn hợp hạt macca, óc chó, hạnh nhân kết hợp việt quất và nho khô sấy dẻo.",
                    "description": "Bữa sáng tiện lợi và tràn đầy năng lượng khi kết hợp cùng sữa chua Hy Lạp hoặc yến mạch.",
                    "image": "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=600",
                    "gallery": [
                        "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=600"
                    ],
                    "tags": "granola, hạt dinh dưỡng, mix hạt, ăn kiêng, eat clean",
                    "rating": 5.0,
                    "review_count": 68,
                    "sold_count": 420,
                    "is_featured": False,
                    "is_bestseller": False,
                    "is_organic": True
                },

                # --- Nhóm Hộp Quà & Giỏ Quà Tặng ---
                {
                    "category": cat_map['hop-qua'],
                    "name": "Giỏ Quà Trái Cây Sang Trọng VIP - Phú Quý",
                    "slug": "gio-qua-trai-cay-sang-trong-phu-quy",
                    "sku": "GIFT-PHUQUY-VIP",
                    "price": 1250000,
                    "original_price": 1500000,
                    "unit": "giỏ quà cao cấp",
                    "stock": 25,
                    "season": Product.SeasonChoice.ALL_YEAR,
                    "origin": "EcoFruit Luxury Gift",
                    "certification": "100% Hoa Quả Nhập Khẩu Thượng Hạng",
                    "calories": "Đa dạng theo set",
                    "vitamins": "Đầy đủ dưỡng chất",
                    "storage_guide": "Giao hỏa tốc 2 giờ kèm thiệp và nơ lụa nghệ thuật.",
                    "shelf_life": "5 - 7 ngày",
                    "short_description": "Set quà sang trọng gồm Nho Mẫu Đơn Nhật, Táo Envy Size L, Cherry Mỹ và Dưa Lưới.",
                    "description": "Món quà đẳng cấp thay lời chúc sức khỏe và thịnh vượng dành cho đối tác, sếp và người thân quý trong các dịp trọng đại.",
                    "image": "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600",
                    "gallery": [
                        "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600",
                        "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=600"
                    ],
                    "tags": "giỏ quà, quà tặng, biếu sếp, lễ tết, cao cấp",
                    "rating": 5.0,
                    "review_count": 34,
                    "sold_count": 120,
                    "is_featured": True,
                    "is_bestseller": True,
                    "is_organic": True
                },
                {
                    "category": cat_map['hop-qua'],
                    "name": "Hộp Quà Trái Cây Cầm Tay Tinh Tế - Như Ý",
                    "slug": "hop-qua-trai-cay-cam-tay-nhu-y",
                    "sku": "GIFT-NHUY-BOX",
                    "price": 650000,
                    "original_price": 800000,
                    "unit": "hộp quà da/mica",
                    "stock": 40,
                    "season": Product.SeasonChoice.ALL_YEAR,
                    "origin": "EcoFruit Collection",
                    "certification": "Chuẩn An Toàn Thực Phẩm",
                    "calories": "Đa dạng theo set",
                    "vitamins": "Vitamin C, A, E",
                    "storage_guide": "Bảo quản nơi thoáng mát hoặc tủ lạnh.",
                    "shelf_life": "5 - 7 ngày",
                    "short_description": "Hộp quà hoa quả mica trong suốt thắt nơ nhung tinh tế, phối hoa tươi nghệ thuật.",
                    "description": "Lựa chọn hoàn hảo cho các dịp sinh nhật, mừng thăng chức hay thăm hỏi người bệnh.",
                    "image": "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=600",
                    "gallery": [
                        "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=600"
                    ],
                    "tags": "hộp quà, mica, hoa tươi, quà sinh nhật, tinh tế",
                    "rating": 4.9,
                    "review_count": 27,
                    "sold_count": 160,
                    "is_featured": False,
                    "is_bestseller": False,
                    "is_organic": True
                },

                # --- Nhóm Combo Tiết Kiệm ---
                {
                    "category": cat_map['combo'],
                    "name": "Combo Trái Cây Tuần Cho Gia Đình 4 Người",
                    "slug": "combo-trai-cay-tuan-gia-dinh",
                    "sku": "CB-FAMILY-WEEK",
                    "price": 499000,
                    "original_price": 650000,
                    "unit": "thùng 6 loại quả (~6kg)",
                    "stock": 50,
                    "season": Product.SeasonChoice.ALL_YEAR,
                    "origin": "Tuyển chọn EcoFruit",
                    "certification": "100% VietGAP & Organic",
                    "calories": "Đa dạng dinh dưỡng",
                    "vitamins": "Toàn diện các nhóm vitamin",
                    "storage_guide": "Có hướng dẫn bảo quản riêng cho từng loại quả bên trong thùng.",
                    "shelf_life": "7 ngày",
                    "short_description": "Gồm Táo Envy (1kg), Cam Sành (2kg), Bơ 034 (1kg), Bưởi Da Xanh (1 quả), Nho (500g).",
                    "description": "Giải pháp tiết kiệm thông minh đảm bảo cả nhà luôn có trái cây sạch tươi ngon thưởng thức mỗi ngày.",
                    "image": "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=600",
                    "gallery": [
                        "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=600"
                    ],
                    "tags": "combo, tiết kiệm, gia đình, tuần lễ dinh dưỡng",
                    "rating": 4.9,
                    "review_count": 92,
                    "sold_count": 510,
                    "is_featured": True,
                    "is_bestseller": True,
                    "is_organic": True
                },
                {
                    "category": cat_map['combo'],
                    "name": "Combo Eat Clean Giữ Dáng Thon Gọn",
                    "slug": "combo-eat-clean-giu-dang",
                    "sku": "CB-EATCLEAN-FIT",
                    "price": 380000,
                    "original_price": 480000,
                    "unit": "set 4 loại quả (~3.5kg)",
                    "stock": 60,
                    "season": Product.SeasonChoice.ALL_YEAR,
                    "origin": "Tuyển chọn EcoFruit",
                    "certification": "Chuẩn Healthy & Organic",
                    "calories": "Ít calo, giàu chất xơ",
                    "vitamins": "Vitamin C, Enzym tiêu mỡ",
                    "storage_guide": "Bảo quản ngăn mát tủ lạnh.",
                    "shelf_life": "7 ngày",
                    "short_description": "Set gồm Bưởi da xanh (1 quả), Táo Envy (1kg), Kiwi Zespri (4 quả), Việt quất (1 hộp).",
                    "description": "Thiết kế khoa học bởi chuyên gia dinh dưỡng giúp bổ sung khoáng chất, đốt cháy mỡ thừa và làm đẹp da.",
                    "image": "https://images.unsplash.com/photo-1519996529931-28324d5a630e?w=600",
                    "gallery": [
                        "https://images.unsplash.com/photo-1519996529931-28324d5a630e?w=600"
                    ],
                    "tags": "eat clean, giảm cân, keto, healthy, combo",
                    "rating": 4.8,
                    "review_count": 46,
                    "sold_count": 280,
                    "is_featured": False,
                    "is_bestseller": False,
                    "is_organic": True
                },
                {
                    "category": cat_map['combo'],
                    "name": "Combo Detox Nước Ép Tươi Mát Mỗi Ngày",
                    "slug": "combo-detox-nuoc-ep-tuoi-mat",
                    "sku": "CB-DETOX-JUICE",
                    "price": 290000,
                    "original_price": 360000,
                    "unit": "set ép nước (~4kg)",
                    "stock": 40,
                    "season": Product.SeasonChoice.ALL_YEAR,
                    "origin": "Tuyển chọn EcoFruit",
                    "certification": "VietGAP Chuẩn Sạch",
                    "calories": "Thanh lọc cơ thể",
                    "vitamins": "Vitamin C, Kali, Enzym tiêu hóa",
                    "storage_guide": "Bảo quản ngăn mát tủ lạnh, ép uống trong ngày.",
                    "shelf_life": "5 - 7 ngày",
                    "short_description": "Set quả chuyên dụng làm nước ép: Cam sành (2kg), Táo Envy (1kg), Cần tây hữu cơ, Dưa leo.",
                    "description": "Bổ sung lượng vitamin khổng lồ mỗi ngày giúp da sáng hồng hào và thanh lọc đường tiêu hóa.",
                    "image": "https://images.unsplash.com/photo-1589733955941-5eeaf752f6dd?w=600",
                    "gallery": [
                        "https://images.unsplash.com/photo-1589733955941-5eeaf752f6dd?w=600"
                    ],
                    "tags": "detox, nước ép, giải độc, làm đẹp da, combo",
                    "rating": 4.9,
                    "review_count": 39,
                    "sold_count": 215,
                    "is_featured": False,
                    "is_bestseller": False,
                    "is_organic": True
                }
            ]

            created_products = []
            for p_data in products_data:
                gallery = p_data.pop('gallery', [p_data['image']])
                p_obj, created = Product.objects.get_or_create(sku=p_data['sku'], defaults=p_data)
                if not created:
                    for k, v in p_data.items():
                        setattr(p_obj, k, v)
                    p_obj.save()
                created_products.append(p_obj)

                # Sync gallery images
                ProductImage.objects.filter(product=p_obj).delete()
                for g_idx, g_url in enumerate(gallery):
                    ProductImage.objects.create(
                        product=p_obj,
                        image_url=g_url,
                        alt_text=f"Ảnh {g_idx + 1} - {p_obj.name}",
                        display_order=g_idx
                    )

            self.stdout.write(self.style.SUCCESS(f"[OK] {len(created_products)} Products created/synced with Multi-Image Galleries & SEO meta."))

            # =========================================================================
            # 4. SEED VOUCHERS (ACTIVE & UP-TO-DATE)
            # =========================================================================
            now = timezone.now()
            vouchers_data = [
                {
                    "code": "CHAOBAN",
                    "title": "Giảm ngay 15k cho khách hàng mới",
                    "description": "Áp dụng cho đơn hàng đầu tiên từ 150.000đ tại EcoFruit.",
                    "discount_type": Voucher.DiscountType.FIXED,
                    "discount_value": 15000,
                    "min_order_amount": 150000,
                    "usage_limit": 5000,
                    "used_count": 142,
                    "start_date": now - timedelta(days=30),
                    "end_date": now + timedelta(days=180),
                    "is_active": True
                },
                {
                    "code": "ECO10",
                    "title": "Giảm 10% đơn hàng từ 200k",
                    "description": "Giảm 10% tối đa 50.000đ cho mọi đơn hoa quả tươi sạch.",
                    "discount_type": Voucher.DiscountType.PERCENT,
                    "discount_value": 10,
                    "max_discount_amount": 50000,
                    "min_order_amount": 200000,
                    "usage_limit": 2000,
                    "used_count": 310,
                    "start_date": now - timedelta(days=15),
                    "end_date": now + timedelta(days=90),
                    "is_active": True
                },
                {
                    "code": "FREESHIP",
                    "title": "Miễn phí vận chuyển toàn quốc",
                    "description": "Trợ giá vận chuyển 20.000đ cho đơn hàng từ 300.000đ.",
                    "discount_type": Voucher.DiscountType.FIXED,
                    "discount_value": 20000,
                    "min_order_amount": 300000,
                    "usage_limit": 10000,
                    "used_count": 1250,
                    "start_date": now - timedelta(days=60),
                    "end_date": now + timedelta(days=365),
                    "is_active": True
                },
                {
                    "code": "VIP20",
                    "title": "Giảm 20% cho đơn hàng quà tặng",
                    "description": "Giảm 20% tối đa 100.000đ cho các đơn hàng từ 500.000đ.",
                    "discount_type": Voucher.DiscountType.PERCENT,
                    "discount_value": 20,
                    "max_discount_amount": 100000,
                    "min_order_amount": 500000,
                    "usage_limit": 500,
                    "used_count": 88,
                    "start_date": now - timedelta(days=10),
                    "end_date": now + timedelta(days=60),
                    "is_active": True
                },
                {
                    "code": "HEALTHY",
                    "title": "Ưu đãi 30k combo Eat Clean",
                    "description": "Giảm trực tiếp 30.000đ khi đặt combo trái cây dinh dưỡng từ 350.000đ.",
                    "discount_type": Voucher.DiscountType.FIXED,
                    "discount_value": 30000,
                    "min_order_amount": 350000,
                    "usage_limit": 800,
                    "used_count": 95,
                    "start_date": now - timedelta(days=5),
                    "end_date": now + timedelta(days=45),
                    "is_active": True
                },
            ]

            voucher_map = {}
            for v in vouchers_data:
                v_obj, created = Voucher.objects.get_or_create(code=v['code'], defaults=v)
                if not created:
                    for k, val in v.items():
                        setattr(v_obj, k, val)
                    v_obj.save()
                voucher_map[v['code']] = v_obj

            self.stdout.write(self.style.SUCCESS(f"[OK] {len(vouchers_data)} Active Vouchers created/updated."))

            # =========================================================================
            # 5. SEED AUTHENTIC PRODUCT REVIEWS & SYNC RATINGS
            # =========================================================================
            reviews_data = [
                {
                    "sku": "AP-ENVY-NZ",
                    "user": user_objects.get('lan.tran@gmail.com'),
                    "reviewer_name": "Trần Mai Lan",
                    "rating": 5,
                    "comment": "Táo Envy rất giòn và ngọt đậm đà, cuống còn tươi rói. Cắt ra để cả buổi không hề bị thâm đen. Giao hàng hỏa tốc đóng gói rất cẩn thận.",
                    "likes_count": 28
                },
                {
                    "sku": "AP-ENVY-NZ",
                    "user": user_objects.get('khachhang@gmail.com'),
                    "reviewer_name": "Nguyễn Văn An",
                    "rating": 5,
                    "comment": "Mua cho cả nhà ăn ai cũng khen tấm tắc. Quả đều đẹp, chuẩn tem mác New Zealand!",
                    "likes_count": 15
                },
                {
                    "sku": "GR-SHINE-JP",
                    "user": user_objects.get('vip@ecofruit.vn'),
                    "reviewer_name": "Phạm Hoàng Long",
                    "rating": 5,
                    "comment": "Nho Mẫu Đơn đỉnh chóp, cắn ngập miệng giòn tan thơm nức mùi xạ hương. Xứng đáng đồng tiền bát gạo!",
                    "likes_count": 34
                },
                {
                    "sku": "CH-RED-US9",
                    "user": user_objects.get('demo@greenfruit.vn'),
                    "reviewer_name": "Nguyễn Văn Xanh",
                    "rating": 5,
                    "comment": "Cherry cuống xanh ngắt, quả to đanh chắc ăn ngọt lịm. Đóng hộp lịch sự mang đi biếu rất sang.",
                    "likes_count": 19
                },
                {
                    "sku": "DU-RI6-VN",
                    "user": user_objects.get('khachhang@gmail.com'),
                    "reviewer_name": "Nguyễn Văn An",
                    "rating": 5,
                    "comment": "Sầu riêng Ri6 chín tự nhiên bao ăn cực chuẩn, cơm vàng hạt lép xẹp, béo ngậy không sượng múi nào.",
                    "likes_count": 42
                },
                {
                    "sku": "AV-034-DL",
                    "user": user_objects.get('lan.tran@gmail.com'),
                    "reviewer_name": "Trần Mai Lan",
                    "rating": 5,
                    "comment": "Bơ 034 quả dài dẻo quánh, dầm sữa đặc cho bé ăn dặm mê ly luôn. Shop tư vấn bảo quản rất có tâm.",
                    "likes_count": 22
                },
                {
                    "sku": "PM-DAXANH-BT",
                    "user": user_objects.get('vip@ecofruit.vn'),
                    "reviewer_name": "Phạm Hoàng Long",
                    "rating": 5,
                    "comment": "Bưởi da xanh vỏ mỏng dính tép hồng mọng nước, không bị đắng hay the đầu lưỡi. Sẽ tiếp tục ủng hộ.",
                    "likes_count": 18
                },
                {
                    "sku": "GIFT-PHUQUY-VIP",
                    "user": user_objects.get('vip@ecofruit.vn'),
                    "reviewer_name": "Phạm Hoàng Long",
                    "rating": 5,
                    "comment": "Giỏ quà thiết kế cực kỳ sang trọng và nghệ thuật. Đối tác của mình nhận được khen nức nở. Rất hài lòng!",
                    "likes_count": 55
                },
                {
                    "sku": "CB-FAMILY-WEEK",
                    "user": user_objects.get('khachhang@gmail.com'),
                    "reviewer_name": "Nguyễn Văn An",
                    "rating": 5,
                    "comment": "Combo tuần quá tiện lợi và kinh tế, đủ loại quả cho 4 người ăn cả tuần. Quả nào cũng tươi ngon chuẩn sạch.",
                    "likes_count": 31
                },
                {
                    "sku": "DR-MANGO-500G",
                    "user": user_objects.get('demo@greenfruit.vn'),
                    "reviewer_name": "Nguyễn Văn Xanh",
                    "rating": 5,
                    "comment": "Xoài sấy dẻo miếng to thơm nức mùi xoài tươi, không bị đường gắt hay ướt dính. Ăn vặt văn phòng số 1!",
                    "likes_count": 16
                }
            ]

            for r_item in reviews_data:
                prod = Product.objects.filter(sku=r_item['sku']).first()
                if prod:
                    ProductReview.objects.update_or_create(
                        product=prod,
                        reviewer_name=r_item['reviewer_name'],
                        defaults={
                            'user': r_item.get('user'),
                            'rating': r_item['rating'],
                            'comment': r_item['comment'],
                            'is_verified_purchase': True,
                            'likes_count': r_item.get('likes_count', 10)
                        }
                    )

            # Auto-calculate and synchronize average rating & review count for all products
            for p in Product.objects.all():
                stats = p.reviews.aggregate(avg_rating=Avg('rating'), total_reviews=Count('id'))
                if stats['total_reviews'] and stats['total_reviews'] > 0:
                    p.rating = round(float(stats['avg_rating']), 1)
                    p.review_count = max(stats['total_reviews'], p.review_count)
                    p.save(update_fields=['rating', 'review_count'])

            self.stdout.write(self.style.SUCCESS(f"[OK] {len(reviews_data)} Verified Reviews seeded and linked to Real Users."))

            # =========================================================================
            # 6. SEED REALISTIC ORDERS COVERING ALL STATUSES & CHECKOUT TYPES
            # =========================================================================
            user_an = user_objects.get('khachhang@gmail.com')
            user_long = user_objects.get('vip@ecofruit.vn')
            user_lan = user_objects.get('lan.tran@gmail.com')
            user_xanh = user_objects.get('demo@greenfruit.vn')

            p_apple = Product.objects.filter(sku='AP-ENVY-NZ').first()
            p_muscat = Product.objects.filter(sku='GR-SHINE-JP').first()
            p_cherry = Product.objects.filter(sku='CH-RED-US9').first()
            p_durian = Product.objects.filter(sku='DU-RI6-VN').first()
            p_avocado = Product.objects.filter(sku='AV-034-DL').first()
            p_gift = Product.objects.filter(sku='GIFT-PHUQUY-VIP').first()
            p_combo = Product.objects.filter(sku='CB-FAMILY-WEEK').first()

            orders_to_seed = [
                # 1. Đang giao hàng (Member VNPay)
                {
                    'order_code': 'ECO-20260911-0001',
                    'user': user_an,
                    'is_guest': False,
                    'customer_name': 'Nguyễn Văn An',
                    'customer_phone': '0988776655',
                    'customer_email': 'khachhang@gmail.com',
                    'delivery_address': 'Tầng 8, Tòa nhà Keangnam Landmark 72',
                    'delivery_city': 'Hà Nội',
                    'delivery_district': 'Nam Từ Liêm',
                    'delivery_ward': 'Mễ Trì',
                    'delivery_note': 'Giao giờ hành chính, gọi trước khi giao 15 phút',
                    'payment_method': Order.PaymentMethod.VNPAY,
                    'payment_status': Order.PaymentStatus.PAID,
                    'order_status': Order.OrderStatus.SHIPPING,
                    'voucher': voucher_map.get('ECO10'),
                    'voucher_code': 'ECO10',
                    'discount_amount': 20000,
                    'shipping_fee': 0,
                    'loyalty_points_earned': 35,
                    'loyalty_points_used': 0,
                    'items': [
                        {'product': p_apple, 'quantity': 2},
                        {'product': p_avocado, 'quantity': 2}
                    ],
                    'timeline': [
                        (None, Order.OrderStatus.PENDING, "Đơn hàng đã được đặt và thanh toán thành công qua VNPay", "CUSTOMER"),
                        (Order.OrderStatus.PENDING, Order.OrderStatus.PROCESSING, "Kho Cầu Giấy đã hoàn tất đóng gói bảo ôn", "STAFF"),
                        (Order.OrderStatus.PROCESSING, Order.OrderStatus.SHIPPING, "Đang giao hàng hỏa tốc bởi EcoFruit Express", "STAFF")
                    ]
                },
                # 2. Hoàn thành (VIP Quà tặng Banking VietQR)
                {
                    'order_code': 'ECO-20260911-0002',
                    'user': user_long,
                    'is_guest': False,
                    'customer_name': 'Phạm Hoàng Long',
                    'customer_phone': '0933889977',
                    'customer_email': 'vip@ecofruit.vn',
                    'delivery_address': 'Biệt thự B6-12 Vinhomes Riverside, Long Biên',
                    'delivery_city': 'Hà Nội',
                    'delivery_district': 'Long Biên',
                    'delivery_ward': 'Phúc Đồng',
                    'delivery_note': 'Kèm thiệp chúc mừng tân gia ghi lời chúc: Chúc anh chị vạn sự như ý!',
                    'payment_method': Order.PaymentMethod.BANKING,
                    'payment_status': Order.PaymentStatus.PAID,
                    'order_status': Order.OrderStatus.COMPLETED,
                    'voucher': voucher_map.get('VIP20'),
                    'voucher_code': 'VIP20',
                    'discount_amount': 100000,
                    'shipping_fee': 0,
                    'loyalty_points_earned': 120,
                    'loyalty_points_used': 500,
                    'items': [
                        {'product': p_gift, 'quantity': 1},
                        {'product': p_muscat, 'quantity': 1}
                    ],
                    'timeline': [
                        (None, Order.OrderStatus.PENDING, "Đơn hàng khởi tạo thành công", "CUSTOMER"),
                        (Order.OrderStatus.PENDING, Order.OrderStatus.PROCESSING, "Đã cắm hoa tươi và thắt nơ nhung hoàn tất", "STAFF"),
                        (Order.OrderStatus.PROCESSING, Order.OrderStatus.SHIPPING, "Shipper giao đến biệt thự Vinhomes", "STAFF"),
                        (Order.OrderStatus.SHIPPING, Order.OrderStatus.COMPLETED, "Khách hàng đã nhận và đánh giá 5 sao", "STAFF")
                    ]
                },
                # 3. Đang xử lý đóng gói (Member COD)
                {
                    'order_code': 'ECO-20260911-0003',
                    'user': user_lan,
                    'is_guest': False,
                    'customer_name': 'Trần Mai Lan',
                    'customer_phone': '0977112233',
                    'customer_email': 'lan.tran@gmail.com',
                    'delivery_address': 'Căn hộ 12A-04 Chung cư Imperia Sky Garden, 423 Minh Khai',
                    'delivery_city': 'Hà Nội',
                    'delivery_district': 'Hai Bà Trưng',
                    'delivery_ward': 'Vĩnh Tuy',
                    'delivery_note': 'Giao lên tận cửa căn hộ giúp mình nhé vì mình đang mang bầu.',
                    'payment_method': Order.PaymentMethod.COD,
                    'payment_status': Order.PaymentStatus.PENDING,
                    'order_status': Order.OrderStatus.PROCESSING,
                    'voucher': voucher_map.get('FREESHIP'),
                    'voucher_code': 'FREESHIP',
                    'discount_amount': 20000,
                    'shipping_fee': 20000,
                    'loyalty_points_earned': 45,
                    'loyalty_points_used': 0,
                    'items': [
                        {'product': p_combo, 'quantity': 1}
                    ],
                    'timeline': [
                        (None, Order.OrderStatus.PENDING, "Đơn hàng COD chờ xác nhận", "CUSTOMER"),
                        (Order.OrderStatus.PENDING, Order.OrderStatus.PROCESSING, "EcoFruit đã xác nhận qua điện thoại và đang soạn hàng", "STAFF")
                    ]
                },
                # 4. Mua không cần đăng nhập (Khách vãng lai Guest Checkout COD)
                {
                    'order_code': 'ECO-20260911-0004',
                    'user': None,
                    'is_guest': True,
                    'customer_name': 'Lê Văn Khách (Khách vãng lai)',
                    'customer_phone': '0918882233',
                    'customer_email': 'khachvanglai@gmail.com',
                    'delivery_address': 'Số 99 Nguyễn Chí Thanh, Láng Thượng',
                    'delivery_city': 'Hà Nội',
                    'delivery_district': 'Đống Đa',
                    'delivery_ward': 'Láng Thượng',
                    'delivery_note': 'Giao trong buổi sáng, gọi trước 10 phút',
                    'payment_method': Order.PaymentMethod.COD,
                    'payment_status': Order.PaymentStatus.PENDING,
                    'order_status': Order.OrderStatus.PENDING,
                    'voucher': voucher_map.get('CHAOBAN'),
                    'voucher_code': 'CHAOBAN',
                    'discount_amount': 15000,
                    'shipping_fee': 20000,
                    'loyalty_points_earned': 0,
                    'loyalty_points_used': 0,
                    'items': [
                        {'product': p_durian, 'quantity': 1},
                        {'product': p_apple, 'quantity': 1}
                    ],
                    'timeline': [
                        (None, Order.OrderStatus.PENDING, "Khách vãng lai đặt hàng thành công qua Web", "CUSTOMER")
                    ]
                },
                # 5. Thanh toán qua ví EcoPay (Demo Frontend)
                {
                    'order_code': 'ECO-20260911-0005',
                    'user': user_xanh,
                    'is_guest': False,
                    'customer_name': 'Nguyễn Văn Xanh',
                    'customer_phone': '0909123456',
                    'customer_email': 'demo@greenfruit.vn',
                    'delivery_address': '72 Lê Thánh Tôn, Phường Bến Nghé, Quận 1',
                    'delivery_city': 'TP. Hồ Chí Minh',
                    'delivery_district': 'Quận 1',
                    'delivery_ward': 'Bến Nghé',
                    'delivery_note': 'Giao lễ tân tòa nhà',
                    'payment_method': Order.PaymentMethod.WALLET,
                    'payment_status': Order.PaymentStatus.PAID,
                    'order_status': Order.OrderStatus.COMPLETED,
                    'voucher': voucher_map.get('HEALTHY'),
                    'voucher_code': 'HEALTHY',
                    'discount_amount': 30000,
                    'shipping_fee': 0,
                    'loyalty_points_earned': 60,
                    'loyalty_points_used': 0,
                    'items': [
                        {'product': p_cherry, 'quantity': 1},
                        {'product': p_avocado, 'quantity': 2}
                    ],
                    'timeline': [
                        (None, Order.OrderStatus.PENDING, "Thanh toán trừ ví EcoPay 480.000đ thành công", "CUSTOMER"),
                        (Order.OrderStatus.PENDING, Order.OrderStatus.PROCESSING, "Chi nhánh TP.HCM đã nhận đơn", "STAFF"),
                        (Order.OrderStatus.PROCESSING, Order.OrderStatus.SHIPPING, "Shipper giao hàng", "STAFF"),
                        (Order.OrderStatus.SHIPPING, Order.OrderStatus.COMPLETED, "Đã giao hàng thành công", "STAFF")
                    ]
                }
            ]

            seeded_orders_count = 0
            for o_data in orders_to_seed:
                items_data = o_data.pop('items')
                timeline_data = o_data.pop('timeline')

                # Calculate subtotal and total
                subtotal = sum(item['product'].price * item['quantity'] for item in items_data if item['product'])
                discount = o_data.get('discount_amount', 0)
                shipping = o_data.get('shipping_fee', 20000)
                total = max(0, (subtotal - discount) + shipping)

                order_obj, created = Order.objects.get_or_create(
                    order_code=o_data['order_code'],
                    defaults={
                        **o_data,
                        'subtotal': subtotal,
                        'total_amount': total
                    }
                )

                # Sync order details
                for k, v in o_data.items():
                    setattr(order_obj, k, v)
                order_obj.subtotal = subtotal
                order_obj.total_amount = total
                order_obj.save()

                # Sync items
                OrderItem.objects.filter(order=order_obj).delete()
                for item in items_data:
                    prod = item['product']
                    if prod:
                        item_subtotal = prod.price * item['quantity']
                        OrderItem.objects.create(
                            order=order_obj,
                            product=prod,
                            product_name=prod.name,
                            product_sku=prod.sku,
                            product_image=prod.image,
                            unit_price=prod.price,
                            quantity=item['quantity'],
                            subtotal=item_subtotal
                        )

                # Sync status logs
                OrderStatusLog.objects.filter(order=order_obj).delete()
                for prev_st, new_st, note, actor in timeline_data:
                    OrderStatusLog.objects.create(
                        order=order_obj,
                        previous_status=prev_st,
                        new_status=new_st,
                        note=note,
                        created_by=actor
                    )

                seeded_orders_count += 1

            self.stdout.write(self.style.SUCCESS(f"[OK] {seeded_orders_count} Multi-Status Orders seeded with Complete Timeline Logs."))

        self.stdout.write(self.style.SUCCESS("\n[SUCCESS] EcoFruit Enterprise Database Seeding Completed 100% Successfully!"))
        self.stdout.write(self.style.NOTICE(f" - Users: {User.objects.count()} (with encrypted passwords & addresses)"))
        self.stdout.write(self.style.NOTICE(f" - Categories: {Category.objects.count()}"))
        self.stdout.write(self.style.NOTICE(f" - Products: {Product.objects.count()} (with gallery images & nutrition facts)"))
        self.stdout.write(self.style.NOTICE(f" - Vouchers: {Voucher.objects.count()} (active with discount validations)"))
        self.stdout.write(self.style.NOTICE(f" - Reviews: {ProductReview.objects.count()} (verified purchases)"))
        self.stdout.write(self.style.NOTICE(f" - Orders: {Order.objects.count()} (with items and audit status logs)"))
