from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
import logging

logger = logging.getLogger(__name__)

def custom_exception_handler(exc, context):
    """
    Custom exception handler to ensure all errors adhere to the standard JSON format.
    """
    response = exception_handler(exc, context)

    if response is not None:
        message = "Yêu cầu không hợp lệ"
        if isinstance(response.data, dict):
            if 'detail' in response.data:
                message = str(response.data['detail'])
            elif response.data:
                first_key = next(iter(response.data))
                first_val = response.data[first_key]
                if isinstance(first_val, list) and len(first_val) > 0:
                    message = f"{first_key}: {first_val[0]}"
                else:
                    message = f"{first_key}: {first_val}"

        response.data = {
            "success": False,
            "message": message,
            "data": None,
            "errors": response.data,
        }
        return response

    # Unhandled 500 exceptions
    logger.error(f"Unhandled Exception: {str(exc)}", exc_info=True)
    return Response(
        {
            "success": False,
            "message": "Lỗi máy chủ nội bộ. Vui lòng thử lại sau.",
            "data": None,
            "errors": str(exc),
        },
        status=status.HTTP_500_INTERNAL_SERVER_ERROR
    )
