from rest_framework.response import Response
from rest_framework import status

def api_response(data=None, message="Thao tác thành công", success=True, status_code=status.HTTP_200_OK, errors=None, meta=None):
    """
    Standardized Enterprise API Response Envelope.
    Format:
    {
        "success": true,
        "message": "...",
        "data": { ... },
        "errors": null,
        "meta": { ... }
    }
    """
    payload = {
        "success": success,
        "message": message,
        "data": data,
        "errors": errors,
    }
    if meta is not None:
        payload["meta"] = meta
    return Response(payload, status=status_code)

def api_error(message="Đã có lỗi xảy ra", errors=None, status_code=status.HTTP_400_BAD_REQUEST):
    """Standardized error response helper."""
    return api_response(
        data=None,
        message=message,
        success=False,
        status_code=status_code,
        errors=errors
    )
