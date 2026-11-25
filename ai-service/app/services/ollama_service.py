import json
from typing import Any, Dict, Optional
import httpx
from app.core.config import settings
from app.core.constants import CATEGORIES, PRIORITIES
from app.utils.logger import log_event


def try_ollama_classification(
    redacted_title: str,
    redacted_description: str,
    language_name: str,
) -> Optional[Dict[str, Any]]:
    """
    Strictly optional lightweight Ollama inference for MX250 (2 GB VRAM) hardware.
    Returns None immediately unless ENABLE_OLLAMA=true and Ollama responds cleanly < 3s.
    """
    if not settings.ENABLE_OLLAMA:
        return None

    prompt = (
        "Classify this municipal civic complaint into JSON only with keys: "
        "category (one of: Water Supply, Roads and Infrastructure, Waste Management, "
        "Drainage and Sanitation, Streetlights, Other), "
        "priority (High, Medium, Low), summary (1 concise sentence).\n"
        f"Language: {language_name}\n"
        f"Title: {redacted_title}\n"
        f"Description: {redacted_description}\n"
        "JSON:"
    )

    try:
        with httpx.Client(timeout=3.0) as client:
            resp = client.post(
                f"{settings.OLLAMA_BASE_URL.rstrip('/')}/api/generate",
                json={
                    "model": settings.OLLAMA_MODEL,
                    "prompt": prompt,
                    "stream": False,
                    "format": "json",
                    "options": {"temperature": 0.1, "num_predict": 140},
                },
            )
            if resp.status_code != 200:
                return None

            raw_text = resp.json().get("response", "{}")
            parsed = json.loads(raw_text)
            category = parsed.get("category")
            priority = parsed.get("priority")
            summary = parsed.get("summary")

            if category in CATEGORIES and priority in PRIORITIES:
                return {
                    "category": category,
                    "priority": priority,
                    "summary": str(summary or redacted_title)[:220],
                    "engine": f"ollama:{settings.OLLAMA_MODEL}",
                }
    except Exception as exc:
        log_event("ollama_optional_skipped", reason=str(exc))

    return None
