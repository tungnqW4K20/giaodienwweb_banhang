# 📜 Lịch Sử Thay Đổi & Nhật Ký Phát Triển (Changelog)

Tài liệu này ghi lại toàn bộ lịch sử các lần thay đổi mã nguồn, tính năng mới, sửa lỗi và cập nhật giao diện của dự án **GreenFruit Eco**.

---

## 📌 Quy Tắc Đẩy Code (Git Workflow Rule)
> **Lưu ý quan trọng**: Tất cả các lần chỉnh sửa code sẽ được lưu trữ cục bộ (Local). Hệ thống **CHỈ PUSH LÊN GITHUB KHI BẠN YÊU CẦU CỤ THỂ**.

---

## 🗂️ Nhật Ký Các Phiên Bản & Thay Đổi

### [v2.0.0] - 11/09/2026
#### 🚀 Xây dựng Toàn Bộ Hệ Thống Backend Python Django Doanh Nghiệp (Enterprise Backend)
- **Kiến Trúc & Cơ Sở Dữ Liệu MySQL Typed ORM**:
  - Tách biệt module kiến trúc sạch (Clean Layered Architecture): `apps/common`, `apps/authentication`, `apps/products`, `apps/cart`, `apps/orders`, `apps/payments`, `apps/vouchers`, `apps/reviews`, `apps/notifications`, `apps/ai_assistant`.
  - Kết nối cơ sở dữ liệu MySQL chuẩn công nghiệp với PyMySQL alias và cấu hình `DATABASE_URL` / auto-fallback SQLite cho môi trường dev.
  - Phân tách cấu hình rõ ràng qua `.env`, hỗ trợ bảo mật JWT Authentication (Access Token + Refresh Token).
- **Cơ chế Khóa Hàng Đồng Thời ACID & Xử lý Tất cả tình huống Mua hàng**:
  - Hỗ trợ đầy đủ 2 luồng: **Khách vãng lai (Guest - Không cần đăng nhập)** và **Khách hàng thành viên (Member - Đăng nhập, tích điểm, ví EcoPay)**.
  - Sử dụng `transaction.atomic()` kết hợp `select_for_update()` khóa dòng sản phẩm trong DB khi đặt hàng, loại trừ hoàn toàn nguy cơ âm kho khi có hàng trăm người bấm mua cùng lúc.
  - Tự động đồng bộ giỏ hàng từ LocalStorage vào MySQL (`/api/v1/cart/merge/`) khi đăng nhập.
  - Lưu trữ toàn bộ thông tin người mua, địa chỉ, lịch sử đơn hàng vào database kể cả khi mua không cần đăng nhập.
- **Message Queue Celery & Redis Cache**:
  - Tích hợp Celery 5.6 với Redis Message Broker cho tác vụ bất đồng bộ, gửi email và ghi nhận thống kê.
  - Tối ưu bộ đệm Redis Cache cho danh mục và dữ liệu sản phẩm, tăng tốc độ truy vấn lên hàng micro giây.
- **Thông Báo Tức Thời (Real-time SSE & Redis Pub/Sub)**:
  - Cổng Server-Sent Events (SSE) `/api/v1/notifications/stream/` phát sóng tức thời trạng thái đơn hàng mới.
- **Tích Hợp Trí Tuệ Nhân Tạo AI Tư Vấn & Auto Domain Engine**:
  - Bộ định tuyến AI đa tầng: Tự động kết nối Google Gemini API (`gemini-1.5-flash`), Groq API (`llama-3.3-70b-versatile`), và bộ não suy luận chuyên sâu Offline Domain Intelligence (trích xuất trực tiếp dữ liệu kho hàng, mùa vụ, voucher thực tế).
- **Bộ Dữ Liệu Khởi Tạo Đồ Sộ (Seed Data)**:
  - Tạo sẵn 22+ sản phẩm đặc sản & nhập khẩu cao cấp kèm thẻ Meta SEO, 6 danh mục, 5 voucher ưu đãi, 3 tài khoản mẫu, hàng loạt đánh giá 5 sao thực tế.
- **Sẵn Sàng Triển Khai Production**:
  - Cung cấp file cấu hình [render.yaml](file:///d:/giaodienwweb_banhang/render.yaml), [Dockerfile](file:///d:/giaodienwweb_banhang/Dockerfile), [docker-compose.yml](file:///d:/giaodienwweb_banhang/docker-compose.yml), [Procfile](file:///d:/giaodienwweb_banhang/Procfile), và script [backend/build.sh](file:///d:/giaodienwweb_banhang/backend/build.sh).

### [v1.3.0] - 11/09/2026
#### ✨ Tính năng mới (Features)
- **Nút Cuộn Lên Đầu Trang (Back to Top)**:
  - Tự động hiện mượt mà khi cuộn chuột qua 280px.
  - Tích hợp hiệu ứng cuộn êm (`smooth scrolling`) lên đỉnh trang.
  - Vị trí nổi thông minh ở góc phải, tối ưu không che khuất Chatbot AI và thanh điều hướng Mobile.
  - File liên quan: [js/common.js](file:///d:/giaodienwweb_banhang/js/common.js), [css/global.css](file:///d:/giaodienwweb_banhang/css/global.css).

---

### [v1.2.0] - 11/09/2026
#### 🎨 Cải tiến giao diện & Sửa lỗi (Fixes & UI Refinements)
- **Cố định cân bằng lưới sản phẩm 2 cột trên Mobile**:
  - Khắc phục lỗi lệch chiều cao giữa các thẻ sản phẩm Flash Sale trên điện thoại.
  - Cố định chiều cao dòng tồn kho Flash Sale `Đã bán / Còn lại` (`white-space: nowrap; font-size: 11.5px`).
  - Chuẩn hóa chiều cao khung giá `product-price-box` (`min-height: 44px`) và lọc gọn tên đơn vị (`kg`, `hộp 500g`).
  - Khóa chân nút *"Mua ngay"* bằng cơ chế `mt-auto pt-2` giúp các nút trên cùng 1 hàng luôn thẳng tắp.
- **Sửa lỗi thanh Menu Header bị rớt dọc**:
  - Thay thế class `.navbar-nav` của Bootstrap bằng `.site-nav-menu` tùy biến độc lập.
  - Ép cứng `flex-direction: row !important; white-space: nowrap !important;` giúp các mục menu luôn nằm trên 1 hàng ngang duy nhất.
  - Tinh chỉnh nút Hotline dạng viên thuốc (`.nav-hotline-pill`) tự động co giãn theo kích thước màn hình.
  - File liên quan: [css/global.css](file:///d:/giaodienwweb_banhang/css/global.css), [css/home.css](file:///d:/giaodienwweb_banhang/css/home.css), [js/home.js](file:///d:/giaodienwweb_banhang/js/home.js), [js/common.js](file:///d:/giaodienwweb_banhang/js/common.js), [index.html](file:///d:/giaodienwweb_banhang/index.html), [products.html](file:///d:/giaodienwweb_banhang/products.html), [product-detail.html](file:///d:/giaodienwweb_banhang/product-detail.html), [cart.html](file:///d:/giaodienwweb_banhang/cart.html), [checkout.html](file:///d:/giaodienwweb_banhang/checkout.html), [profile.html](file:///d:/giaodienwweb_banhang/profile.html), [contact.html](file:///d:/giaodienwweb_banhang/contact.html).

---

### [v1.1.0] - 11/09/2026
#### 🚀 Nâng cấp tính năng trọng tâm (Core Upgrades)
- **Thuật toán tính độ tương đồng sản phẩm (`calculateProductSimilarity`)**:
  - Tính điểm % tương đồng thông minh theo Danh mục (+35%), Mùa vụ (+30%), Mức giá (+20%), Chứng nhận (+15%).
  - Gắn huy hiệu tương đồng (ví dụ: `🎯 95% Tương đồng`) trên trang chi tiết sản phẩm.
- **Hệ thống đánh giá khách hàng đa chiều**:
  - Bảng thống kê xếp hạng sao thực tế (5★-1★ progress bars).
  - Bộ lọc xem đánh giá theo từng mức sao.
  - Huy hiệu người mua xác thực (*Verified Buyer*), lượt bấm hữu ích và form gửi đánh giá mới.
- **Thiết kế lại toàn diện trang Giỏ hàng ([cart.html](file:///d:/giaodienwweb_banhang/cart.html))**:
  - Quy trình 3 bước đặt hàng (`Giỏ hàng` ➔ `Thanh toán` ➔ `Hoàn tất`).
  - Thanh tiến độ Freeship thông minh theo mốc 500.000đ.
  - Gợi ý mã Voucher 1-Click (`FRESH2026`, `FREESHIP`, `ORGANIC50K`).
- **Thiết kế lại bộ tăng giảm số lượng (`.quantity-control`)**:
  - Dạng viên thuốc bo tròn công thái học, hiệu ứng chuyển màu xanh lá phát sáng, tự động disabled khi số lượng = 1.
  - File liên quan: [js/data.js](file:///d:/giaodienwweb_banhang/js/data.js), [js/product-detail.js](file:///d:/giaodienwweb_banhang/js/product-detail.js), [css/product-detail.css](file:///d:/giaodienwweb_banhang/css/product-detail.css), [js/cart.js](file:///d:/giaodienwweb_banhang/js/cart.js), [css/cart.css](file:///d:/giaodienwweb_banhang/css/cart.css).

---

### [v1.0.0] - 10/09/2026
#### 🍏 Khởi tạo toàn bộ dự án GreenFruit Eco (Initial Release)
- Xây dựng 8 trang web tĩnh chuẩn SEO với kiến trúc tách biệt từng file HTML, CSS, JS:
  - `index.html`: Trang chủ (Hero banner, Flash Sale, Lọc mùa vụ, Bán chạy, Giá trị cốt lõi).
  - `products.html`: Cửa hàng (Bộ lọc danh mục, mùa vụ đúng/trái mùa, khoảng giá, sắp xếp, tìm kiếm tức thì).
  - `product-detail.html`: Chi tiết sản phẩm (Thư viện ảnh, thông số Brix/VietGAP, tab dinh dưỡng, bảo quản).
  - `cart.html`: Giỏ hàng (Tính phí ship, áp mã voucher, cập nhật số lượng).
  - `checkout.html`: Thanh toán (Giao hàng hỏa tốc, thanh toán COD, Chuyển khoản QR, Ví điện tử).
  - `profile.html`: Trang cá nhân (Thông tin cá nhân, sửa hồ sơ, lịch sử đơn hàng, Nạp ví VNPay).
  - `contact.html`: Liên hệ (Cam kết bao ăn 1 đổi 1 trong 24h, form phản hồi, bản đồ).
  - `auth.html`: Đăng nhập & Đăng ký tài khoản (Tích hợp tài khoản Demo 1-Click).
- **Cổng thanh toán Sandbox VNPay Test ([js/vnpay-simulator.js](file:///d:/giaodienwweb_banhang/js/vnpay-simulator.js))**:
  - Giả lập quét mã VNPay-QR, nhập thẻ ATM nội địa, thẻ Visa/Mastercard và xác thực mã OTP.
- **Trợ lý AI Chatbot Tư vấn ([js/chatbot.js](file:///d:/giaodienwweb_banhang/js/chatbot.js))**:
  - Hỗ trợ kết nối Gemini API Key miễn phí + Chế độ Offline thông minh tự động tư vấn hoa quả theo mùa.
- **Cơ sở dữ liệu Database LocalStorage ([js/data.js](file:///d:/giaodienwweb_banhang/js/data.js))**:
  - Mock DB quản lý sản phẩm, đơn hàng, người dùng, giỏ hàng, vouchers, đánh giá.
- **Tối ưu SEO Kỹ Thuật (Technical SEO)**:
  - Thẻ Meta Title/Description chuẩn, JSON-LD Schema (`Product`, `WebSite`, `Store`), `sitemap.xml`, `robots.txt`.

---

## 🛠️ Hướng Dẫn Các Lệnh Git Nhanh Cho Bạn

```bash
# 1. Kiểm tra trạng thái các file đã sửa đổi:
git status

# 2. Xem lịch sử các commit:
git log --oneline

# 3. Khi bạn muốn lưu commit cục bộ:
git add .
git commit -m "mô tả nội dung thay đổi"

# 4. Khi bạn muốn đẩy lên GitHub:
git push origin main
```
