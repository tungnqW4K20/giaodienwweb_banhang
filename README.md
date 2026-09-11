# 🍏 GreenFruit Eco - Hệ Thống Bán Hoa Quả Sạch Trực Tuyến

Website thương mại điện tử chuyên cung cấp hoa quả hữu cơ VietGAP, trái cây đặc sản vùng miền theo mùa và hoa quả nhập khẩu cao cấp.

---

## 🚀 Công Nghệ Sử Dụng
- **Giao diện & Cấu trúc**: HTML5, Vanilla CSS3 (Custom Design System), Bootstrap 5.3.3
- **Xử lý Logic**: Vanilla JavaScript ES6+ (Modular theo từng trang)
- **Cơ sở dữ liệu**: LocalStorage Database (Hỗ trợ đầy đủ CRUD Sản phẩm, Giỏ hàng, Người dùng, Đơn hàng, Vouchers, Đánh giá)
- **Cổng thanh toán**: VNPay Sandbox Simulator (QR Code, ATM, OTP)
- **Trí tuệ nhân tạo**: AI Chatbot tư vấn hoa quả theo mùa (Hỗ trợ Gemini API Key miễn phí + Offline Smart Engine)
- **Biểu tượng & Phông chữ**: Font Awesome 6.5.1, Google Fonts (Outfit & Plus Jakarta Sans)
- **Tối ưu hóa**: Technical SEO (JSON-LD Structured Data, Sitemap XML, Robots.txt)

---

## 📂 Cấu Trúc Thư Mục
```
giaodienwweb_banhang/
├── css/
│   ├── auth.css            # Style trang Đăng nhập / Đăng ký
│   ├── cart.css            # Style trang Giỏ hàng cao cấp
│   ├── checkout.css        # Style trang Thanh toán & Đặt hàng
│   ├── contact.css         # Style trang Liên hệ & Hỗ trợ
│   ├── global.css          # Design system, Header/Footer, Back to Top, Chatbot
│   ├── home.css            # Style trang Chủ & Flash Sale
│   ├── product-detail.css  # Style trang Chi tiết, Đánh giá, Gợi ý tương đồng
│   ├── products.css        # Style trang Cửa hàng & Bộ lọc đa năng
│   └── profile.css         # Style trang Cá nhân & Quản lý đơn hàng
├── js/
│   ├── auth.js             # Logic đăng nhập, đăng ký, demo account
│   ├── cart.js             # Logic giỏ hàng, freeship tracker, 1-click voucher
│   ├── chatbot.js          # Trợ lý AI Chatbot tư vấn hoa quả
│   ├── checkout.js         # Xử lý đơn hàng, địa chỉ, chọn cổng thanh toán
│   ├── common.js           # Xử lý dùng chung (Badge giỏ, Search, Back to Top, Toast)
│   ├── contact.js          # Xử lý gửi phản hồi, cam kết bảo hành
│   ├── data.js             # Database LocalStorage (Sản phẩm, User, Orders, Reviews)
│   ├── home.js             # Đếm ngược Flash Sale, lọc mùa vụ trang chủ
│   ├── product-detail.js   # Thuật toán tính độ tương đồng, Review Breakdown
│   ├── products.js         # Bộ lọc đa tiêu chí (mùa vụ, danh mục, giá, tìm kiếm)
│   ├── profile.js          # Quản lý tài khoản, lịch sử đơn hàng, nạp ví
│   └── vnpay-simulator.js  # Giả lập cổng thanh toán VNPay Sandbox
├── auth.html               # Trang đăng nhập / đăng ký
├── cart.html               # Trang giỏ hàng
├── checkout.html           # Trang thanh toán
├── contact.html            # Trang liên hệ
├── index.html              # Trang chủ
├── product-detail.html     # Trang chi tiết sản phẩm
├── products.html           # Trang cửa hàng
├── profile.html            # Trang cá nhân
├── CHANGELOG.md            # Nhật ký thay đổi & lịch sử phiên bản
├── README.md               # Giới thiệu dự án
├── robots.txt              # Cấu hình Robot SEO
├── sitemap.xml             # Sơ đồ trang web SEO
└── .gitignore              # Bộ lọc file không cần thiết trên Git
```

---

## 📜 Xem Lịch Sử Thay Đổi
Xem chi tiết các phiên bản và lịch sử cập nhật mã nguồn tại file [CHANGELOG.md](file:///d:/giaodienwweb_banhang/CHANGELOG.md).
