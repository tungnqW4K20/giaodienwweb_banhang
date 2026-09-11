import logging
import requests
from django.conf import settings
from apps.products.models import Product
from apps.vouchers.models import Voucher

logger = logging.getLogger(__name__)

class AIAssistantService:
    @classmethod
    def get_catalog_context(cls) -> str:
        """Retrieves real-time product & voucher data from database for AI grounding."""
        products = Product.objects.filter(is_available=True).select_related('category')[:25]
        vouchers = Voucher.objects.filter(is_active=True)[:6]

        prod_list = []
        for p in products:
            prod_list.append(
                f"- ID: {p.id} | {p.name} (SKU: {p.sku}, Danh mục: {p.category.name}): Giá {int(p.price):,}đ/{p.unit}, "
                f"Mùa vụ: {p.get_season_display()}, Xuất xứ: {p.origin}, Chứng nhận: {p.certification}, "
                f"Tồn kho: {p.stock} {p.unit}, Vitamin: {p.vitamins or 'C, A'}, Calo: {p.calories or '50 kcal'}, "
                f"Đặc điểm: {p.short_description or ''}"
            )

        vouch_list = []
        for v in vouchers:
            vouch_list.append(f"- Mã {v.code}: {v.title} (Đơn tối thiểu {int(v.min_order_amount):,}đ, Giảm {int(v.discount_value):,}{'%' if v.discount_type == 'PERCENT' else 'đ'})")

        context = (
            "DANH MỤC HOA QUẢ THỰC TẾ TẠI KHO ECOFRUIT:\n" + "\n".join(prod_list) + "\n\n" +
            "MÃ GIẢM GIÁ ĐANG ÁP DỤNG:\n" + "\n".join(vouch_list)
        )
        return context

    @classmethod
    def call_gemini_api(cls, user_message: str, history: list | None, catalog_context: str) -> str | None:
        api_key = getattr(settings, 'GEMINI_API_KEY', '') or ''
        if not api_key:
            return None

        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
        system_instruction = (
            "Bạn là EcoFruit AI - Chuyên gia dinh dưỡng và tư vấn hoa quả sạch cao cấp của hệ thống cửa hàng EcoFruit.\n"
            "Tính cách: Thân thiện, lịch sự, chuyên nghiệp, am hiểu sâu về dinh dưỡng, y học thường thức, sức khỏe, cách chọn và bảo quản trái cây.\n"
            f"Dưới đây là thông tin thực tế từ kho hàng EcoFruit:\n{catalog_context}\n"
            "Hãy tư vấn chính xác theo giá, mùa vụ, voucher và sản phẩm đang có trong kho.\n"
            "Nếu khách hỏi về bệnh lý (như tiểu đường, tim mạch, gút, béo phì), phân tích khoa học các loại quả GI thấp, chỉ số đường huyết an toàn.\n"
            "Trả lời ngắn gọn, súc tích bằng tiếng Việt có emoji sinh động."
        )

        contents = []
        for h in (history or [])[-4:]:
            role = "user" if h.get('role') == 'user' else "model"
            contents.append({"role": role, "parts": [{"text": h.get('content', '')}]})

        contents.append({"role": "user", "parts": [{"text": f"Câu hỏi của khách: {user_message}"}]})

        payload = {
            "system_instruction": {"parts": [{"text": system_instruction}]},
            "contents": contents,
            "generationConfig": {"temperature": 0.7, "maxOutputTokens": 800}
        }

        try:
            resp = requests.post(url, json=payload, timeout=8)
            if resp.status_code == 200:
                data = resp.json()
                return data['candidates'][0]['content']['parts'][0]['text']
        except Exception as e:
            logger.warning(f"Gemini API call failed: {e}")
        return None

    @classmethod
    def call_groq_api(cls, user_message: str, history: list | None, catalog_context: str) -> str | None:
        api_key = getattr(settings, 'GROQ_API_KEY', '') or ''
        if not api_key:
            return None

        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}

        messages = [
            {
                "role": "system",
                "content": (
                    "Bạn là EcoFruit AI - Chuyên gia tư vấn hoa quả sạch EcoFruit.\n"
                    f"Dữ liệu kho hàng thực tế:\n{catalog_context}\n"
                    "Tư vấn thân thiện, chuẩn xác, khuyên dùng sản phẩm đúng mùa vụ và tặng mã giảm giá."
                )
            }
        ]
        for h in (history or [])[-4:]:
            messages.append({"role": h.get('role', 'user'), "content": h.get('content', '')})
        messages.append({"role": "user", "content": user_message})

        payload = {
            "model": "llama-3.3-70b-versatile",
            "messages": messages,
            "temperature": 0.7,
            "max_tokens": 800
        }

        try:
            resp = requests.post(url, headers=headers, json=payload, timeout=8)
            if resp.status_code == 200:
                return resp.json()['choices'][0]['message']['content']
        except Exception as e:
            logger.warning(f"Groq API call failed: {e}")
        return None

    @classmethod
    def autonomous_domain_reply(cls, user_message: str, catalog_context: str) -> str:
        """
        High-IQ Offline Domain Intelligence Engine.
        Automatically analyzes user intent (diet, vitamins, pregnancy, diabetes, gifts, season, vouchers, delivery)
        and responds with precise recommendations and actual catalog data.
        """
        msg = user_message.lower()

        # 1. Tiểu đường / Đường huyết
        if any(w in msg for w in ['tiểu đường', 'đường huyết', 'tiểu duong', 'đường', 'insulin', 'gi thấp']):
            return (
                "🩺 **Tư vấn dinh dưỡng cho người kiểm soát đường huyết & tiểu đường:**\n\n"
                "Người có chỉ số đường huyết cao nên chọn các loại hoa quả có **chỉ số đường huyết (GI) thấp (< 55)**, giàu chất xơ hòa tan và enzyme tự nhiên:\n\n"
                "1. **Bưởi Da Xanh Bến Tre (GI ~25)**: Chứa hợp chất naringenin tự nhiên giúp tăng độ nhạy insulin, hỗ trợ điều hòa đường huyết và đốt cháy mỡ thừa.\n"
                "2. **Bơ Sáp 034 Đắk Lắk (GI ~15)**: Gần như không chứa đường bột, rất giàu axit béo không no MUFA tốt cho tim mạch và ổn định đường huyết.\n"
                "3. **Kiwi Vàng Zespri & Kiwi Xanh (GI ~38-42)**: Rất giàu Vitamin C và chất xơ, giúp làm chậm quá trình hấp thu đường vào máu sau ăn.\n"
                "4. **Táo Envy New Zealand / Táo Xanh (GI ~36)**: Chứa chất xơ Pectin làm no lâu, hạn chế cảm giác thèm ngọt.\n"
                "5. **Dâu Tây Hữu Cơ Mộc Châu (GI ~40)**: Lượng đường tự nhiên thấp, giàu anthocyanin chống oxy hóa mạnh mẽ.\n\n"
                "⚠️ *Lời khuyên*: Nên ăn cả quả tươi (không ép lấy nước bỏ bã), chia nhỏ bữa phụ cách bữa chính 1.5 - 2 giờ. Hạn chế ăn quá nhiều sầu riêng hoặc xoài chín đậm lúc đói nhé!"
            )

        # 2. Giảm cân / Eat clean / Diet
        if any(w in msg for w in ['giảm cân', 'diet', 'keto', 'ít calo', 'eat clean', 'giữ dáng', 'đốt mỡ', 'calo']):
            return (
                "🥗 **Gợi ý hoa quả giảm cân & giữ dáng từ EcoFruit:**\n\n"
                "1. **Bưởi Da Xanh**: Calo cực thấp (~38 kcal/100g), giàu enzyme đốt mỡ và thanh lọc độc tố.\n"
                "2. **Táo Envy / Táo Xanh**: Giàu chất xơ pectin giúp no lâu, giảm hấp thụ chất béo xấu.\n"
                "3. **Kiwi Vàng / Xanh**: Bổ sung enzyme actinidin thúc đẩy tiêu hóa đạm hiệu quả.\n"
                "4. **Dâu Tây Mộc Châu**: Chỉ 32 kcal/100g, vị thanh mát lý tưởng cho bữa phụ.\n\n"
                "💡 *Mẹo nhỏ*: Bạn có thể kết hợp làm salad hoa quả hoặc dùng trước bữa chính 30 phút. Đừng quên áp mã **ECO10** để được giảm 10% đơn hàng nhé! 🍎"
            )

        # 3. Mẹ bầu / Mang thai / Sau sinh
        if any(w in msg for w in ['bầu', 'mang thai', 'thai nhi', 'mẹ bầu', 'sau sinh', 'cho con bú']):
            return (
                "🤰 **Trái cây vàng bổ sung dưỡng chất cho mẹ bầu và thai nhi:**\n\n"
                "1. **Bơ Sáp 034**: Cung cấp Folate (Axit Folic) tự nhiên phòng ngừa dị tật ống thần kinh, giàu Omega-3 giúp phát triển trí não bé.\n"
                "2. **Cam Sành Tuyên Quang / Tiền Giang**: Dồi dào Vitamin C và Canxi tự nhiên, chống ốm nghén và tăng đề kháng cho mẹ.\n"
                "3. **Nho Mẫu Đơn & Nho Đen Không Hạt**: Bổ sung Sắt, Kali và Resveratrol chống thiếu máu thai kỳ.\n"
                "4. **Kiwi Vàng SunGold**: Giàu Vitamin E và Folate dễ hấp thu.\n\n"
                "Toàn bộ trái cây tại EcoFruit đều đạt chuẩn **VietGAP & GlobalGAP**, an tâm 100% khi sử dụng mẹ bầu nhé! 🥑🍊"
            )

        # 4. Giỏ quà / Quà biếu / Hộp quà
        if any(w in msg for w in ['quà', 'biếu', 'tặng', 'giỏ quà', 'hộp quà', 'set quà', 'đối tác', 'thăm hỏi']):
            return (
                "🎁 **Bộ sưu tập Giỏ Quà & Hộp Quà Trái Cây Cao Cấp EcoFruit:**\n\n"
                "- **Set Hộp Quà Eco VIP Phú Quý (950.000đ)**: Thiết kế nắp kính trong suốt, nơ lụa nghệ thuật, kết hợp Nho Mẫu Đơn Shine Muscat Nhật, Táo Envy Size L và Cherry Đỏ Mỹ.\n"
                "- **Giỏ Quà Đại Cát Đại Lợi (1.250.000đ - 1.850.000đ)**: Đóng gói sang trọng kèm hoa tươi và thiệp chúc mừng thiết kế riêng.\n"
                "- **Hộp Quà Sức Khỏe Vàng (650.000đ)**: Combo Kiwi Vàng, Táo hữu cơ và Bưởi da xanh thượng hạng.\n\n"
                "🚚 *Dịch vụ đặc biệt*: Giao hỏa tốc 2 giờ nội thành bằng thùng xốp giữ nhiệt, tặng kèm thiệp thiết kế theo yêu cầu! Áp ngay mã **VIP20** để giảm 20% nhé! ✨"
            )

        # 5. Hoa quả nhập khẩu
        if any(w in msg for w in ['nhập khẩu', 'nhap khau', 'úc', 'mỹ', 'nhật', 'new zealand', 'korea', 'hàn quốc']):
            return (
                "✈️ **Top Trái Cây Nhập Khẩu Trực Tiếp Đường Bay Tươi Ngon Nhất:**\n\n"
                "1. **Nho Mẫu Đơn Shine Muscat Okayama (Nhật Bản)**: Trái to đanh giòn, ngọt lịm thơm mùi hoa hồng xạ hương quý phái.\n"
                "2. **Cherry Đỏ Mỹ Size 9.0 (Washington/California)**: Căng mọng, giòn rụm phát ra tiếng tanh tách khi cắn, cuống xanh tươi rói.\n"
                "3. **Kiwi Vàng SunGold Zespri (New Zealand)**: Ruột vàng ươm, vị ngọt thanh mát, đạt chuẩn GlobalGAP.\n"
                "4. **Táo Envy Size L (New Zealand)**: Giòn ngọt đậm đà, thịt táo trắng ráo không bị xốp thâm.\n\n"
                "Tất cả sản phẩm nhập khẩu đều có đầy đủ chứng chỉ kiểm dịch thực vật và được bảo quản lạnh chuẩn 0-4°C."
            )

        # 6. Mùa vụ (Đúng mùa / Trái mùa)
        if any(w in msg for w in ['mùa', 'đúng mùa', 'trái mùa', 'chính vụ', 'mùa này', 'tháng']):
            return (
                "🍂 **Hoa quả đúng mùa vụ thu hoạch rộ & Trái mùa CNC tại EcoFruit:**\n\n"
                "**1. Trái cây ĐÚNG MÙA VỤ (Độ ngọt cao nhất, giá tốt nhất):**\n"
                "- **Sầu Riêng Ri6 Chín Cây Chợ Lách**: Cơm vàng ươm, dẻo quánh béo ngậy chuẩn vườn.\n"
                "- **Bưởi Da Xanh Bến Tre**: Tép hồng mọng nước, ngọt lịm không the.\n"
                "- **Cam Sành Hàm Yên**: Vắt nước cực nhiều, thơm mát tự nhiên.\n\n"
                "**2. Trái cây TRÁI MÙA TUYỂN CHỌN (Nông nghiệp công nghệ cao / Nhập khẩu):**\n"
                "- **Dâu Tây Hữu Cơ Mộc Châu**: Trồng nhà kính công nghệ Isarel, quả căng mọng đỏ au.\n"
                "- **Cherry Đỏ Mỹ & Nho Mẫu Đơn**: Vận chuyển bay 48h từ các nông trường đối ứng.\n\n"
                "👉 Bạn có thể bấm nút bên dưới để xem danh sách hoa quả đúng mùa thu hoạch nhé!"
            )

        # 7. Giá / Mã giảm giá / Voucher / Khuyến mãi
        if any(w in msg for w in ['giá', 'voucher', 'mã', 'khuyến mãi', 'giảm giá', 'sale', 'rẻ', 'ưu đãi']):
            return (
                "🎉 **Bảng mã Voucher & Ưu Đãi Đang Áp Dụng Hôm Nay:**\n\n"
                "1. **CHAOBAN**: Giảm ngay 15.000đ cho đơn hàng đầu tiên từ 150.000đ.\n"
                "2. **ECO10**: Giảm 10% (tối đa 50.000đ) cho đơn từ 200.000đ.\n"
                "3. **FREESHIP**: Miễn phí vận chuyển hỏa tốc toàn quốc cho đơn từ 300.000đ.\n"
                "4. **VIP20**: Giảm 20% (tối đa 100.000đ) cho đơn hàng quà tặng hoặc từ 500.000đ.\n\n"
                "💰 *Cam kết giá tốt*: Giá niêm yết luôn đi kèm chính sách bao ăn 1 đổi 1 trong 24h và tích điểm hoàn tiền 5% cho thành viên!"
            )

        # 8. Chính sách đổi trả & Giao hàng
        if any(w in msg for w in ['đổi trả', 'bảo hành', 'ship', 'giao hàng', 'hỏng', 'dập', 'lỗi']):
            return (
                "🛡️ **Chính sách bảo hành & Giao hàng chuẩn 5 sao tại EcoFruit:**\n\n"
                "- **Bao ăn 1 đổi 1 trong 24h**: Nếu quả bị sượng, nhạt, dập nát hoặc sâu hỏng bên trong, EcoFruit đổi mới 100% hoặc hoàn tiền ngay trong ngày.\n"
                "- **Giao hàng hỏa tốc 2 giờ**: Áp dụng khu vực nội thành Hà Nội & TP.HCM bằng thùng xốp bảo ôn chuyên dụng.\n"
                "- **Hotline hỗ trợ 24/7**: 1900 6868."
            )

        # 9. Tìm theo loại quả cụ thể
        fruit_keywords = {
            'sầu riêng': 'Sầu Riêng Ri6',
            'nho': 'Nho Mẫu Đơn',
            'dâu': 'Dâu Tây Mộc Châu',
            'táo': 'Táo Envy',
            'bơ': 'Bơ Sáp 034',
            'bưởi': 'Bưởi Da Xanh',
            'cherry': 'Cherry Đỏ Mỹ',
            'cam': 'Cam Sành',
            'kiwi': 'Kiwi Vàng Zespri'
        }
        for kw, fruit_name in fruit_keywords.items():
            if kw in msg:
                return (
                    f"🍎 **Thông tin sản phẩm {fruit_name} tại EcoFruit:**\n\n"
                    f"- Được tuyển chọn từ vùng trồng đạt chuẩn VietGAP/GlobalGAP.\n"
                    f"- Thu hoạch đúng độ chín tự nhiên, độ ngọt Brix cao, không chất bảo quản.\n"
                    f"- Đóng gói thùng xốp/hộp giấy bảo vệ, giao hỏa tốc 2 giờ.\n\n"
                    f"👉 Bạn có thể bấm vào thẻ sản phẩm bên dưới để xem chi tiết và đặt hàng ngay nhé!"
                )

        # 10. Default General Assistant
        return (
            "Xin chào quý khách! 🌸 Tôi là **EcoBot AI** - Trợ lý thông minh chuyên về hoa quả sạch và dinh dưỡng của **GreenFruit Eco**.\n\n"
            "Tôi có thể hỗ trợ quý khách:\n"
            "1. Tư vấn hoa quả theo sức khỏe: **Người tiểu đường, giảm cân, mẹ bầu, trẻ nhỏ**.\n"
            "2. Gợi ý hoa quả **đúng mùa thu hoạch rộ** và **trái cây nhập khẩu tươi ngon**.\n"
            "3. Tư vấn **set giỏ quà biếu tặng** cao cấp và **mã voucher giảm giá**.\n\n"
            "Quý khách đang quan tâm đến loại trái cây nào hoặc muốn tìm hoa quả cho nhu cầu gì ạ? 🍇🥑🍓"
        )

    @classmethod
    def extract_suggested_products_and_actions(cls, user_message: str, reply_text: str) -> tuple[list[dict], list[dict]]:
        """
        Extracts relevant products from DB and builds interactive action buttons based on user query intent.
        """
        msg = user_message.lower()
        suggested_products = []
        suggested_actions = []

        all_products = list(Product.objects.filter(is_available=True).select_related('category'))

        # Intent: Tiểu đường / đường huyết
        if any(w in msg for w in ['tiểu đường', 'đường huyết', 'tiểu duong', 'insulin', 'gi thấp', 'đường']):
            # Filter low GI fruits (Bưởi, Bơ, Táo, Kiwi, Dâu tây)
            matched = [p for p in all_products if any(k in p.name.lower() for k in ['bưởi', 'bơ', 'táo', 'kiwi', 'dâu'])]
            suggested_products = matched[:4] if matched else all_products[:4]
            suggested_actions = [
                {"label": "🩺 Xem danh sách quả cho người tiểu đường", "url": "products.html?health=tieu-duong", "icon": "fa-solid fa-heart-pulse", "color": "btn-success"},
                {"label": "🥑 Xem Bơ Sáp 034 Đắk Lắk", "url": "product-detail.html?id=" + str(next((p.id for p in all_products if 'bơ' in p.name.lower()), 5)), "icon": "fa-solid fa-apple-whole", "color": "btn-outline-gf"},
                {"label": "🍊 Xem Bưởi Da Xanh Bến Tre", "url": "product-detail.html?id=" + str(next((p.id for p in all_products if 'bưởi' in p.name.lower()), 6)), "icon": "fa-solid fa-leaf", "color": "btn-outline-gf"}
            ]

        # Intent: Giảm cân / Diet
        elif any(w in msg for w in ['giảm cân', 'diet', 'keto', 'ít calo', 'eat clean', 'giữ dáng', 'calo']):
            matched = [p for p in all_products if any(k in p.name.lower() for k in ['bưởi', 'táo', 'kiwi', 'dâu'])]
            suggested_products = matched[:4] if matched else all_products[:4]
            suggested_actions = [
                {"label": "🥗 Xem hoa quả ăn kiêng & giảm cân", "url": "products.html?health=giam-can", "icon": "fa-solid fa-fire", "color": "btn-success"},
                {"label": "🥝 Xem Kiwi Vàng Zespri", "url": "product-detail.html?id=" + str(next((p.id for p in all_products if 'kiwi' in p.name.lower()), 9)), "icon": "fa-solid fa-circle-check", "color": "btn-outline-gf"}
            ]

        # Intent: Mẹ bầu / Thai kỳ
        elif any(w in msg for w in ['bầu', 'mang thai', 'thai nhi', 'mẹ bầu', 'sau sinh']):
            matched = [p for p in all_products if any(k in p.name.lower() for k in ['bơ', 'cam', 'nho', 'kiwi'])]
            suggested_products = matched[:4] if matched else all_products[:4]
            suggested_actions = [
                {"label": "🤰 Xem hoa quả bổ dưỡng cho mẹ bầu", "url": "products.html?health=me-bau", "icon": "fa-solid fa-person-breastfeeding", "color": "btn-success"},
                {"label": "🥑 Xem Bơ Sáp 034 (Giàu Folate)", "url": "product-detail.html?id=" + str(next((p.id for p in all_products if 'bơ' in p.name.lower()), 5)), "icon": "fa-solid fa-shield-heart", "color": "btn-outline-gf"}
            ]

        # Intent: Giỏ quà / Quà tặng
        elif any(w in msg for w in ['quà', 'biếu', 'tặng', 'giỏ quà', 'hộp quà', 'set quà']):
            matched = [p for p in all_products if any(k in p.name.lower() for k in ['hộp quà', 'giỏ', 'quà', 'nho', 'cherry', 'envy'])]
            suggested_products = matched[:4] if matched else all_products[:4]
            suggested_actions = [
                {"label": "🎁 Xem bộ sưu tập Giỏ Quà Biếu VIP", "url": "products.html?category=hop-qua", "icon": "fa-solid fa-gift", "color": "btn-warning text-dark"},
                {"label": "🍇 Xem Nho Mẫu Đơn Nhật Okayama", "url": "product-detail.html?id=" + str(next((p.id for p in all_products if 'nho' in p.name.lower()), 2)), "icon": "fa-solid fa-crown", "color": "btn-outline-gf"}
            ]

        # Intent: Nhập khẩu
        elif any(w in msg for w in ['nhập khẩu', 'nhap khau', 'cherry', 'úc', 'mỹ', 'nhật']):
            matched = [p for p in all_products if p.category.slug == 'nhap-khau' or any(k in p.name.lower() for k in ['cherry', 'nho', 'kiwi', 'envy'])]
            suggested_products = matched[:4] if matched else all_products[:4]
            suggested_actions = [
                {"label": "✈️ Xem toàn bộ Trái Cây Nhập Khẩu", "url": "products.html?category=nhap-khau", "icon": "fa-solid fa-plane-arrival", "color": "btn-primary-gf"},
                {"label": "🍒 Xem Cherry Đỏ Mỹ Size 9.0", "url": "product-detail.html?id=" + str(next((p.id for p in all_products if 'cherry' in p.name.lower()), 7)), "icon": "fa-solid fa-star", "color": "btn-outline-gf"}
            ]

        # Intent: Mùa vụ / Đúng mùa / Trái mùa
        elif any(w in msg for w in ['mùa', 'đúng mùa', 'trái mùa', 'chính vụ', 'mùa này']):
            if 'trái mùa' in msg:
                matched = [p for p in all_products if p.season == 'OFF_SEASON']
                suggested_products = matched[:4] if matched else all_products[:4]
                suggested_actions = [
                    {"label": "🌿 Xem hoa quả Trái Mùa Công Nghệ Cao", "url": "products.html?season=trai-mua", "icon": "fa-solid fa-seedling", "color": "btn-success"}
                ]
            else:
                matched = [p for p in all_products if p.season == 'IN_SEASON']
                suggested_products = matched[:4] if matched else all_products[:4]
                suggested_actions = [
                    {"label": "🍂 Xem hoa quả Đúng Mùa Thu Hoạch", "url": "products.html?season=dung-mua", "icon": "fa-solid fa-leaf", "color": "btn-success"},
                    {"label": "👑 Xem Sầu Riêng Ri6 Chín Cây", "url": "product-detail.html?id=" + str(next((p.id for p in all_products if 'sầu riêng' in p.name.lower()), 1)), "icon": "fa-solid fa-award", "color": "btn-outline-gf"}
                ]

        # Intent: Giá / Khuyến mãi / Voucher
        elif any(w in msg for w in ['giá', 'voucher', 'mã', 'khuyến mãi', 'giảm giá', 'sale']):
            matched = [p for p in all_products if p.discount_percent > 10 or p.is_bestseller]
            suggested_products = matched[:4] if matched else all_products[:4]
            suggested_actions = [
                {"label": "🔥 Xem sản phẩm Hot Sale giảm giá", "url": "products.html?sale=true", "icon": "fa-solid fa-percent", "color": "btn-danger"},
                {"label": "🛒 Mở giỏ hàng & áp mã Voucher", "url": "cart.html", "icon": "fa-solid fa-bag-shopping", "color": "btn-primary-gf"}
            ]

        # Intent: Specific Fruit Search
        else:
            matched = [p for p in all_products if any(w in p.name.lower() for w in msg.split())]
            if matched:
                suggested_products = matched[:3]
                first_p = matched[0]
                suggested_actions = [
                    {"label": f"👁️ Xem chi tiết {first_p.name}", "url": f"product-detail.html?id={first_p.id}", "icon": "fa-solid fa-eye", "color": "btn-primary-gf"},
                    {"label": "🛒 Xem tất cả sản phẩm", "url": "products.html", "icon": "fa-solid fa-store", "color": "btn-outline-gf"}
                ]
            else:
                suggested_products = all_products[:3]
                suggested_actions = [
                    {"label": "🛒 Khám phá Danh mục Sản phẩm", "url": "products.html", "icon": "fa-solid fa-store", "color": "btn-primary-gf"},
                    {"label": "🎁 Xem BST Giỏ Quà Tặng", "url": "products.html?category=hop-qua", "icon": "fa-solid fa-gift", "color": "btn-outline-gf"}
                ]

        # Format suggested products to light JSON data
        formatted_prods = []
        for p in suggested_products:
            formatted_prods.append({
                "id": p.id,
                "name": p.name,
                "price": int(p.price),
                "original_price": int(p.original_price or p.price),
                "unit": p.unit,
                "image": p.image,
                "origin": p.origin,
                "cert": p.certification,
                "rating": float(p.rating),
                "review_count": p.review_count,
                "season": p.get_season_display(),
                "short_description": p.short_description or p.name
            })

        return formatted_prods, suggested_actions

    @classmethod
    def get_ai_reply(cls, user_message: str, history: list | None = None) -> tuple[str, str, list[dict], list[dict]]:
        """
        Orchestrates AI multi-tier fallback:
        Gemini -> Groq -> Autonomous Domain Engine.
        Returns: (reply_text, provider_name, suggested_products, suggested_actions)
        """
        if history is None:
            history = []

        catalog_context = cls.get_catalog_context()

        # 1. Try Gemini
        gemini_reply = cls.call_gemini_api(user_message, history, catalog_context)
        if gemini_reply:
            prods, actions = cls.extract_suggested_products_and_actions(user_message, gemini_reply)
            return gemini_reply, "Google Gemini AI (Live)", prods, actions

        # 2. Try Groq
        groq_reply = cls.call_groq_api(user_message, history, catalog_context)
        if groq_reply:
            prods, actions = cls.extract_suggested_products_and_actions(user_message, groq_reply)
            return groq_reply, "Groq LLaMA-3.3 (High-Speed)", prods, actions

        # 3. Autonomous Intelligent Domain Fallback
        domain_reply = cls.autonomous_domain_reply(user_message, catalog_context)
        prods, actions = cls.extract_suggested_products_and_actions(user_message, domain_reply)
        return domain_reply, "EcoFruit Domain Knowledge RAG", prods, actions
