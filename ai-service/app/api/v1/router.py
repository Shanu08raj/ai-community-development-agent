from fastapi import APIRouter
from app.api.v1 import analyze, health, voice

api_router = APIRouter()
api_router.include_router(health.router, prefix="/ai", tags=["AI Health"])
api_router.include_router(analyze.router, prefix="/ai", tags=["AI Analysis"])
api_router.include_router(voice.router, prefix="/voice", tags=["Voice AI"])
