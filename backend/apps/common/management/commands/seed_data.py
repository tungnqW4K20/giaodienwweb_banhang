from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from apps.authentication.models import User, UserAddress
from apps.products.models import Category, Product, ProductImage
from apps.vouchers.models import Voucher
from apps.reviews.models import ProductReview
from apps.orders.models import Order, OrderItem, OrderStatusLog

class Command(BaseCommand):
    help = 'Seeds initial enterprise-grade demo data for EcoFruit Clean Fruit Store'

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("[INFO] Starting database seeding for EcoFruit..."))

        # 1. Create Users
        admin_user, _ = User.objects.get_or_create(
            email='admin@ecofruit.vn',
            defaults={
                'full_name': 'Quản Trị Viên EcoFruit',
                'phone_number': '0901234567',
                'role': User.Role.ADMIN,
                'is_staff': True,
                'is_superuser': True,
                'balance': 10000000,
                'loyalty_points': 5000,
            }
        )
        admin_user.set_password('Admin@123456')
        admin_user.save()

        demo_user, _ = User.objects.get_or_create(
            email='khachhang@gmail.com',
            defaults={
                'full_name': 'Nguyễn Văn An',
                'phone_number': '0988776655',
                'role': User.Role.CUSTOMER,
                'balance': 500000,
                'loyalty_points': 350,
            }
        )
        demo_user.set_password('Customer@123456')
        demo_user.save()

        # Addresses for demo user
        UserAddress.objects.get_or_create(
            user=demo_user,
            detail_address='Tầng 8, Tòa nhà Keangnam Landmark 72',
            defaults={
                'recipient_name': 'Nguyễn Văn An',
                'phone_number': '0988776655',
                'province': 'Hà Nội',
                'district': 'Nam Từ Liêm',
                'ward': 'Mễ Trì',
                'is_default': True
            }
        )
        UserAddress.objects.get_or_create(
            user=demo_user,
            detail_address='Số 15 ngõ 120 Hoàng Quốc Việt',
            defaults={
                'recipient_name': 'Nguyễn Văn An (Nhà riêng)',
                'phone_number': '0988776655',
                'province': 'Hà Nội',
                'district': 'Cầu Giấy',
                'ward': 'Nghĩa Đô',
                'is_default': False
            }
        )

        self.stdout.write(self.style.SUCCESS("[OK] Users & Addresses created."))

        # 2. Create Categories
        categories_data = [
            {"name": "Hoa Quả Nhập Khẩu", "slug": "nhap-khau", "icon": "bi-globe", "display_order": 1, "description": "Trái cây tuyển chọn nhập khẩu trực tiếp từ Mỹ, New Zealand, Nhật Bản, Hàn Quốc."},
            {"name": "Trái Cây Nội Địa", "slug": "noi-dia", "icon": "bi-geo-alt", "display_order": 2, "description": "Đặc sản các vùng miền Việt Nam chuẩn VietGAP, thu hái tươi tại vườn."},
            {"name": "Hoa Quả Hữu Cơ (Organic)", "slug": "organic", "icon": "bi-shield-check", "display_order": 3, "description": "Chứng nhận 100% hữu cơ USDA/EU, không hóa chất bảo quản."},
            {"name": "Trái Cây Sấy & Chế Biến", "slug": "trai-cay-say", "icon": "bi-box2-heart", "display_order": 4, "description": "Trái cây sấy dẻo, sấy thăng hoa giòn rụm nguyên hương vị tự nhiên."},
            {"name": "Hộp Quà & Giỏ Quà Tặng", "slug": "hop-qua", "icon": "bi-gift", "display_order": 5, "description": "Set quà sang trọng lịch sự cho dịp lễ tết, mừng tân gia, sinh nhật."},
            {"name": "Combo Tiết Kiệm", "slug": "combo", "icon": "bi-tags", "display_order": 6, "description": "Gói trái cây tuần đủ dinh dưỡng cho cả gia đình với giá siêu hời."},
        ]

        cat_map = {}
        for c in categories_data:
            cat_obj, _ = Category.objects.get_or_create(slug=c['slug'], defaults=c)
            cat_map[c['slug']] = cat_obj

        self.stdout.write(self.style.SUCCESS("[OK] Categories created."))

        # 3. Create 25+ Products
        products_data = [
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
                "origin": "New Zealand",
                "certification": "GlobalGAP / Tiêu chuẩn New Zealand",
                "calories": "52 kcal / 100g",
                "vitamins": "Vitamin C, Kali, Chất xơ Pectin",
                "storage_guide": "Bảo quản ngăn mát 4 - 8°C, tránh để cạnh thực phẩm có mùi nồng.",
                "shelf_life": "7 - 10 ngày trong tủ mát",
                "short_description": "Táo Envy New Zealand giòn tan, vị ngọt đậm đà, thơm nức mùi hoa cỏ mùa xuân.",
                "description": "Táo Envy là giống táo cao cấp nhất của New Zealand với lớp vỏ đỏ ruby bắt mắt cùng những tia vàng tinh tế. Thịt táo giòn đanh, mọng nước, để lâu trong không khí vẫn giữ được màu trắng sữa tinh khiết mà không bị thâm.",
                "image": "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=600",
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
                "vitamins": "Resveratrol, Vitamin B6, C",
                "storage_guide": "Bọc túi kín bảo quản ngăn mát 2 - 4°C, không rửa trước khi cất.",
                "shelf_life": "10 - 14 ngày",
                "short_description": "Nho Mẫu Đơn quả to tròn, vỏ mỏng không chát, hương thơm hoa hồng xạ hương quý phái.",
                "description": "Được mệnh danh là 'vua của các loài nho', Shine Muscat trồng theo phương pháp 1 cành 1 chùm tại Nhật Bản để đạt độ ngọt hoàn hảo trên 18 độ Brix.",
                "image": "https://images.unsplash.com/photo-1596363505729-4190a9506133?w=600",
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
                "origin": "New Zealand",
                "certification": "GlobalGAP Zespri Standard",
                "calories": "60 kcal / 100g",
                "vitamins": "Vitamin C gấp 3 lần cam, Vitamin E, Folate",
                "storage_guide": "Bảo quản nhiệt độ phòng khi chưa chín, cất tủ lạnh khi quả mềm tay.",
                "shelf_life": "7 ngày",
                "short_description": "Kiwi vàng ruột vàng ươm mọng nước, vị ngọt dịu thanh mát như mật ong nhiệt đới.",
                "description": "Kiwi Zespri SunGold New Zealand là nguồn bổ sung Vitamin C tự nhiên xuất sắc giúp tăng cường hệ miễn dịch và làm đẹp da.",
                "image": "https://images.unsplash.com/photo-1618897996318-5a901fa6ca71?w=600",
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
                "origin": "Hoa Kỳ",
                "certification": "USDA Organic",
                "calories": "57 kcal / 100g",
                "vitamins": "Anthocyanin, Vitamin K, Mangan",
                "storage_guide": "Bảo quản ngăn mát 2 - 5°C trong hộp thoáng khí.",
                "shelf_life": "7 - 10 ngày",
                "short_description": "Việt quất quả to tròn đều, phủ lớp phấn trắng tự nhiên bảo vệ quả tươi lâu.",
                "description": "Việt quất là siêu thực phẩm bổ mắt, tăng cường trí nhớ và phòng chống lão hóa hiệu quả.",
                "image": "https://images.unsplash.com/photo-1498557850523-fd3d118b962e?w=600",
                "tags": "việt quất, blueberry, mỹ, siêu thực phẩm, eat clean",
                "rating": 4.7,
                "review_count": 38,
                "sold_count": 270,
                "is_featured": False,
                "is_bestseller": False,
                "is_organic": True
            },
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
                "tags": "cam sành, vắt nước, vitamin c, tăng đề kháng",
                "rating": 4.7,
                "review_count": 95,
                "sold_count": 620,
                "is_featured": False,
                "is_bestseller": True,
                "is_organic": True
            },
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
                "tags": "thanh long, thanh long đỏ, organic, bình thuận",
                "rating": 4.7,
                "review_count": 41,
                "sold_count": 290,
                "is_featured": False,
                "is_bestseller": False,
                "is_organic": True
            },
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
                "tags": "granola, hạt dinh dưỡng, mix hạt, ăn kiêng, eat clean",
                "rating": 5.0,
                "review_count": 68,
                "sold_count": 420,
                "is_featured": False,
                "is_bestseller": False,
                "is_organic": True
            },
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
                "tags": "hộp quà, mica, hoa tươi, quà sinh nhật, tinh tế",
                "rating": 4.9,
                "review_count": 27,
                "sold_count": 160,
                "is_featured": False,
                "is_bestseller": False,
                "is_organic": True
            },
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
                "tags": "eat clean, giảm cân, keto, healthy, combo",
                "rating": 4.8,
                "review_count": 46,
                "sold_count": 280,
                "is_featured": False,
                "is_bestseller": False,
                "is_organic": True
            }
        ]

        created_products = []
        for p_data in products_data:
            p_obj, created = Product.objects.get_or_create(sku=p_data['sku'], defaults=p_data)
            created_products.append(p_obj)
            # Add gallery images
            ProductImage.objects.get_or_create(
                product=p_obj,
                image_url=p_obj.image,
                defaults={'alt_text': f"Ảnh chính {p_obj.name}", 'display_order': 0}
            )

        self.stdout.write(self.style.SUCCESS(f"[OK] {len(created_products)} Products created with SEO meta."))

        # 4. Create Vouchers
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
                "start_date": now - timedelta(days=10),
                "end_date": now + timedelta(days=90),
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
                "start_date": now - timedelta(days=5),
                "end_date": now + timedelta(days=60),
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
                "start_date": now - timedelta(days=15),
                "end_date": now + timedelta(days=180),
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
                "start_date": now - timedelta(days=2),
                "end_date": now + timedelta(days=45),
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
                "start_date": now - timedelta(days=1),
                "end_date": now + timedelta(days=30),
                "is_active": True
            },
        ]

        for v in vouchers_data:
            Voucher.objects.get_or_create(code=v['code'], defaults=v)

        self.stdout.write(self.style.SUCCESS("[OK] 5 Vouchers created."))

        # 5. Create Realistic Product Reviews
        reviews_templates = [
            ("Chị Mai Lan", 5, "Trái cây rất tươi ngon, giao hàng đúng 1 tiếng sau khi đặt là nhận được rồi. Táo giòn ngọt đanh!"),
            ("Anh Tuấn Anh", 5, "Sầu riêng Ri6 bao ăn cực kỳ chuẩn, cơm vàng óng và hạt lép xẹp. Xứng đáng 5 sao."),
            ("Cô Hoàng Yến", 5, "Giỏ quà đóng gói rất sang trọng và đẹp mắt, đối tác của mình khen nức nở. Sẽ ủng hộ lâu dài!"),
            ("Bạn Minh Trang", 4, "Nho Mẫu Đơn thơm lừng mùi hoa hồng, ăn rất thích. Shop bọc chống sốc cẩn thận."),
            ("Bác Thành Nam", 5, "Bưởi da xanh mọng nước không bị the, ăn giải nhiệt rất tốt. Đóng gói chuyên nghiệp."),
        ]

        for idx, prod in enumerate(created_products[:8]):
            reviewer_name, rating, comment = reviews_templates[idx % len(reviews_templates)]
            ProductReview.objects.get_or_create(
                product=prod,
                reviewer_name=reviewer_name,
                defaults={
                    'rating': rating,
                    'comment': comment,
                    'is_verified_purchase': True,
                    'likes_count': 12 + idx
                }
            )

        self.stdout.write(self.style.SUCCESS("[OK] Product Reviews seeded."))

        # 6. Create Demo Order for Demo User
        p1 = created_products[0]
        p2 = created_products[6]
        order_code = "ECO-20260911-DEMO01"
        order, created = Order.objects.get_or_create(
            order_code=order_code,
            defaults={
                'user': demo_user,
                'is_guest': False,
                'customer_name': demo_user.full_name,
                'customer_phone': demo_user.phone_number,
                'customer_email': demo_user.email,
                'delivery_address': 'Tầng 8, Tòa nhà Keangnam Landmark 72, Mễ Trì, Nam Từ Liêm',
                'delivery_city': 'Hà Nội',
                'delivery_district': 'Nam Từ Liêm',
                'delivery_ward': 'Mễ Trì',
                'delivery_note': 'Giao giờ hành chính, gọi trước khi giao 15 phút',
                'payment_method': Order.PaymentMethod.VNPAY,
                'payment_status': Order.PaymentStatus.PAID,
                'order_status': Order.OrderStatus.SHIPPING,
                'subtotal': p1.price + (p2.price * 2),
                'discount_amount': 20000,
                'shipping_fee': 0,
                'total_amount': (p1.price + (p2.price * 2)) - 20000,
                'voucher_code': 'ECO10',
                'loyalty_points_earned': 25,
            }
        )

        if created:
            OrderItem.objects.create(
                order=order,
                product=p1,
                product_name=p1.name,
                product_sku=p1.sku,
                product_image=p1.image,
                unit_price=p1.price,
                quantity=1,
                subtotal=p1.price
            )
            OrderItem.objects.create(
                order=order,
                product=p2,
                product_name=p2.name,
                product_sku=p2.sku,
                product_image=p2.image,
                unit_price=p2.price,
                quantity=2,
                subtotal=p2.price * 2
            )
            OrderStatusLog.objects.create(
                order=order,
                previous_status=None,
                new_status=Order.OrderStatus.PENDING,
                note="Đơn hàng được đặt thành công",
                created_by="CUSTOMER"
            )
            OrderStatusLog.objects.create(
                order=order,
                previous_status=Order.OrderStatus.PENDING,
                new_status=Order.OrderStatus.SHIPPING,
                note="Đang giao hàng hỏa tốc trong 2h",
                created_by="STAFF"
            )

        self.stdout.write(self.style.SUCCESS("[SUCCESS] Seeding completed successfully! EcoFruit database is fully populated!"))
