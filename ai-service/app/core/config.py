from dotenv import load_dotenv
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(BASE_DIR / ".env")


class Settings:
    HOST: str = os.getenv("HOST", "127.0.0.1")
    PORT: int = int(os.getenv("PORT", "8000"))
    ENABLE_OLLAMA: bool = os.getenv("ENABLE_OLLAMA", "false").lower() == "true"
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "qwen2.5:0.5b")
    BACKEND_URL: str = os.getenv("BACKEND_URL", "http://localhost:5000")
    AI_SERVICE_INTERNAL_SECRET: str = os.getenv("AI_SERVICE_INTERNAL_SECRET", "")


settings = Settings()
