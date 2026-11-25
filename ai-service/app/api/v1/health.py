from fastapi import APIRouter
from app.core.config import settings

router = APIRouter()


@router.get("/health")
def get_health():
    return {
        "success": True,
        "service": "jansetu-ai-service",
        "status": "ok",
        "ollamaEnabled": settings.ENABLE_OLLAMA,
        "defaultEngine": "rule-fallback",
    }
