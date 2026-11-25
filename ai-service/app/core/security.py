import hmac
import os
from fastapi import Header, HTTPException, status
from app.core.config import settings


def verify_internal_secret(x_internal_secret: str | None = Header(default=None)):
    expected = os.getenv("AI_SERVICE_INTERNAL_SECRET", settings.AI_SERVICE_INTERNAL_SECRET)
    if not expected:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "success": False,
                "error": {
                    "code": "AI_CONFIG_ERROR",
                    "message": "Internal AI authentication secret is not configured.",
                },
            },
        )

    if not x_internal_secret or not hmac.compare_digest(x_internal_secret, expected):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "success": False,
                "error": {
                    "code": "FORBIDDEN",
                    "message": "Invalid or missing internal service secret.",
                },
            },
        )
    return True
