from rest_framework import views, status
from rest_framework.permissions import AllowAny
from apps.common.response import api_response, api_error
from .services import AIAssistantService

class AIChatView(views.APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        message = request.data.get('message', '').strip()
        if not message:
            return api_error(message="Vui lòng nhập nội dung câu hỏi.")

        history = request.data.get('history', [])
        reply, provider = AIAssistantService.get_ai_reply(message, history)

        return api_response(
            data={
                "reply": reply,
                "provider": provider,
                "user_message": message
            },
            message="Tư vấn AI thành công."
        )

class AISuggestionsView(views.APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        suggestions = [
            "Tư vấn hoa quả giảm cân giữ dáng hiệu quả",
            "Trái cây nào tốt nhất cho mẹ bầu?",
            "Hoa quả đang đúng mùa vụ tươi ngon hôm nay",
            "Có những mã giảm giá nào đang áp dụng?",
            "Chính sách giao hàng hỏa tốc 2 giờ",
            "Gợi ý giỏ quà trái cây sang trọng biếu tặng"
        ]
        return api_response(data=suggestions, message="Lấy gợi ý câu hỏi AI thành công.")
