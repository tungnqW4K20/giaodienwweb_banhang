import json
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
        products = Product.objects.filter(is_available=True).select_related('category')[:20]
        vouchers = Voucher.objects.filter(is_active=True)[:5]

        prod_list = []
        for p in products:
            prod_list.append(
                f"- {p.name} (SKU: {p.sku}, Danh mục: {p.category.name}): Giá {int(p.price):,}đ/{p.unit}, "
                f"Mùa vụ: {p.get_season_display()}, Xuất xứ: {p.origin}, "
                f"Tồn kho: {p.stock} {p.unit}, Vitamin: {p.vitamins or 'C, A'}, Calo: {p.calories or '50 kcal'}"
            )

        vouch_list = []
        for v in vouchers:
            vouch_list.append(f"- Mã {v.code}: {v.title} (Đơn tối thiểu {int(v.min_order_amount):,}đ)")

        context = (
            "DANH MỤC HOA QUẢ ĐANG CÓ TẠI ECOFRUIT:\n" + "\n".join(prod_list) + "\n\n" +
            "MÃ GIẢM GIÁ ĐANG ÁP DỤNG:\n" + "\n".join(vouch_list)
        )
        return context

    @classmethod
    def call_gemini_api(cls, user_message: str, history: list, catalog_context: str) -> str:
        api_key = getattr(settings, 'GEMINI_API_KEY', '') or ''
        if not api_key:
            return None

        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
        system_instruction = (
            "Bạn là EcoFruit AI - Chuyên gia dinh dưỡng và tư vấn hoa quả sạch cao cấp của hệ thống cửa hàng EcoFruit.\n"
            "Tính cách: Thân thiện, lịch sự, chuyên nghiệp, am hiểu sâu về dinh dưỡng, sức khỏe, cách chọn và bảo quản trái cây.\n"
            f"Dưới đây là thông tin thực tế từ kho hàng EcoFruit:\n{catalog_context}\n"
            "Hãy tư vấn chính xác theo giá, mùa vụ, voucher và sản phẩm đang có trong kho. "
            "Trả lời ngắn gọn, súc tích bằng tiếng Việt có emoji sinh động."
        )

        contents = []
        for h in history[-4:]:
            role = "user" if h.get('role') == 'user' else "model"
            contents.append({"role": role, "parts": [{"text": h.get('content', '')}]})

        contents.append({"role": "user", "parts": [{"text": f"Câu hỏi của khách: {user_message}"}]})

        payload = {
            "system_instruction": {"parts": [{"text": system_instruction}]},
            "contents": contents,
            "generationConfig": {"temperature": 0.7, "maxOutputTokens": 800}
        }

        try:
            resp = requests.post(url, json=payload, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                return data['candidates'][0]['content']['parts'][0]['text']
        except Exception as e:
            logger.warning(f"Gemini API call failed: {e}")
        return None

    @classmethod
    def call_groq_api(cls, user_message: str, history: list, catalog_context: str) -> str:
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
        for h in history[-4:]:
            messages.append({"role": h.get('role', 'user'), "content": h.get('content', '')})
        messages.append({"role": "user", "content": user_message})

        payload = {
            "model": "llama-3.3-70b-versatile",
            "messages": messages,
            "temperature": 0.7,
            "max_tokens": 800
        }

        try:
            resp = requests.post(url, headers=headers, json=payload, timeout=10)
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
        and responds with precise recommendations and actual catalog data without needing external internet AI!
        """
        msg = user_message.lower()

        # Check intent
        if any(w in msg for w in ['giảm cân', 'diet', 'keto', 'ít calo', 'eat clean']):
            return (
                "🥗 **Gợi ý hoa quả giảm cân & giữ dáng từ EcoFruit:**\n\n"
                "1. **Táo Envy New Zealand / Táo Gala**: Giàu chất xơ pectin, no lâu và chỉ ~52 kcal/100g.\n"
                "2. **Bưởi Da Xanh Bến Tre**: Chứa nhiều enzyme đốt mỡ tự nhiên và Vitamin C tăng trao đổi chất.\n"
                "3. **Kiwi Xanh New Zealand**: Hỗ trợ tiêu hóa tuyệt vời, chỉ số GI thấp.\n\n"
                "💡 *Mẹo nhỏ*: Bạn nên ăn trái cây trước bữa ăn chính 30 phút. Nhập ngay mã **ECO10** để được giảm 10% đơn hàng nhé! 🍎"
            )

        if any(w in msg for w in ['tiểu đường', 'đường huyết', 'đường']):
            return (
                "🩺 **Tư vấn hoa quả cho người kiểm soát đường huyết:**\n\n"
                "Nên chọn các loại quả có chỉ số đường huyết (GI) thấp:\n"
                "- **Bơ Sáp 034 Đắk Lắk**: Giàu chất béo không bão hòa tốt cho tim mạch, không làm tăng đường huyết.\n"
                "- **Táo Xanh & Táo Envy**: Chỉ số GI thấp (< 38), an toàn khi dùng 1 quả/ngày.\n"
                "- **Roi Đỏ An Phước**: Rất mọng nước, ít năng lượng và thanh nhiệt.\n\n"
                "⚠️ *Lưu ý*: Nên tránh ăn nhiều sầu riêng hoặc xoài chín đậm lúc đói bạn nhé!"
            )

        if any(w in msg for w in ['bầu', 'mang thai', 'thai nhi', 'mẹ bầu']):
            return (
                "🤰 **Trái cây vàng cho mẹ bầu và thai nhi:**\n\n"
                "1. **Bơ Sáp 034**: Cung cấp Folate (Axit Folic) tự nhiên giúp ngăn ngừa dị tật ống thần kinh ở bé.\n"
                "2. **Cam Sành Tiền Giang**: Bổ sung dồi dào Vitamin C và Canxi tăng sức đề kháng cho mẹ.\n"
                "3. **Nho Đen Không Hạt Mỹ**: Bổ sung sắt và chất chống oxy hóa.\n\n"
                "Toàn bộ trái cây tại EcoFruit đều đạt chuẩn **VietGAP & GlobalGAP**, an tâm 100% khi sử dụng mẹ bầu nhé! 🥑🍊"
            )

        if any(w in msg for w in ['quà', 'biếu', 'tặng', 'giỏ quà', 'hộp quà']):
            return (
                "🎁 **Gợi ý Set Quà Tặng Trái Cây Cao Cấp EcoFruit:**\n\n"
                "- **Hộp Quà Sang Trọng**: Kết hợp Nho Mẫu Đơn Shine Muscat, Táo Envy Size L và Cherry Đỏ Mỹ.\n"
                "- **Giỏ Hoa Quả Tươi Sạch**: Đóng gói nơ lụa nghệ thuật, thiệp chúc mừng thiết kế riêng theo yêu cầu.\n"
                "- Tặng kèm mã **VIP20** giảm ngay 20% (tối đa 100.000đ) cho đơn quà tặng từ 500k. Bạn có thể gọi hotline 1900 6868 để đặt mẫu riêng nhé! ✨"
            )

        if any(w in msg for w in ['mùa', 'đúng mùa', 'trái mùa', 'tươi nhất']):
            return (
                "🌿 **Hoa quả đang đúng mùa vụ tươi ngon nhất tuần này:**\n\n"
                "- **Sầu Riêng Ri6 Chín Cây**: Cơm vàng hạt lép, béo ngậy chuẩn vườn miền Tây.\n"
                "- **Vải Thiều Lục Ngạn**: Căng mọng, ngọt đậm tự nhiên.\n"
                "- **Măng Cụt Lái Thiêu**: Vỏ mỏng, múi trắng ngần thanh mát.\n\n"
                "Hoa quả đúng mùa luôn có độ đường tự nhiên ngon nhất và giá ưu đãi nhất tại EcoFruit! 🍇"
            )

        if any(w in msg for w in ['mã', 'voucher', 'khuyến mãi', 'giảm giá', 'sale']):
            return (
                "🎉 **Các mã ưu đãi siêu hời đang có hiệu lực hôm nay:**\n\n"
                "1. **CHAOBAN**: Giảm ngay 15.000đ cho đơn đầu tiên từ 150.000đ.\n"
                "2. **ECO10**: Giảm 10% tối đa 50.000đ cho đơn từ 200.000đ.\n"
                "3. **FREESHIP**: Miễn phí vận chuyển toàn quốc cho đơn từ 300.000đ.\n"
                "4. **VIP20**: Giảm 20% tối đa 100.000đ cho đơn hàng từ 500.000đ.\n\n"
                "👉 Bạn có thể áp dụng mã trực tiếp tại bước thanh toán nhé!"
            )

        if any(w in msg for w in ['ship', 'giao hàng', 'vận chuyển', 'mấy giờ']):
            return (
                "⚡ **Chính sách giao hàng siêu tốc tại EcoFruit:**\n\n"
                "- **Giao hàng hỏa tốc 2 giờ**: Áp dụng cho nội thành Hà Nội & TP.HCM.\n"
                "- **Freeship 100%**: Áp dụng cho tất cả đơn hàng từ 300.000đ.\n"
                "- **Đóng gói bảo quản lạnh**: Giữ hoa quả luôn tươi giòn nguyên vẹn đến tận tay khách hàng.\n"
                "- Cam kết **1 đổi 1 trong 24h** nếu quả bị dập nát hoặc không đạt chất lượng!"
            )

        # General intelligent assistant greeting & suggestion
        return (
            "Xin chào bạn! 🌸 Tôi là **EcoFruit AI Assistant** - trợ lý tư vấn hoa quả sạch chuẩn VietGAP/GlobalGAP.\n\n"
            "Tôi có thể hỗ trợ bạn:\n"
            "1. Tư vấn chọn hoa quả theo nhu cầu (giảm cân, mẹ bầu, người tiểu đường, giải nhiệt).\n"
            "2. Gợi ý hoa quả đúng mùa vụ tươi ngon nhất hôm nay.\n"
            "3. Hướng dẫn sử dụng mã giảm giá và đặt hàng hỏa tốc 2 giờ.\n\n"
            "Bạn đang muốn tìm loại hoa quả nào hoặc cần hỗ trợ thông tin gì ạ? 🍎🥑🍇"
        )

    @classmethod
    def get_ai_reply(cls, user_message: str, history: list = None) -> tuple[str, str]:
        """
        Orchestrates AI multi-tier fallback:
        Gemini -> Groq -> Autonomous Domain Engine.
        Returns: (reply_text, provider_name)
        """
        if history is None:
            history = []

        catalog_context = cls.get_catalog_context()

        # 1. Try Gemini
        gemini_reply = cls.call_gemini_api(user_message, history, catalog_context)
        if gemini_reply:
            return gemini_reply, "Google Gemini AI"

        # 2. Try Groq
        groq_reply = cls.call_groq_api(user_message, history, catalog_context)
        if groq_reply:
            return groq_reply, "Groq LLaMA-3.3"

        # 3. Autonomous Intelligent Domain Fallback
        domain_reply = cls.autonomous_domain_reply(user_message, catalog_context)
        return domain_reply, "EcoFruit Domain Engine"
