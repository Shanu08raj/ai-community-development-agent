from typing import Dict
from app.agents.state import ComplaintAnalysisState
from app.services.language_detection_service import detect_text_language


def language_detection_node(state: ComplaintAnalysisState) -> Dict:
    raw_title = state.get("rawTitle", "")
    raw_desc = state.get("rawDescription", "")
    combined = f"{raw_title} {raw_desc}"
    declared = (state.get("declaredLanguage") or "").strip()

    history = list(state.get("nodeExecutionHistory") or [])
    history.append("LanguageDetectionNode")

    detected = detect_text_language(combined, declared_language=declared)

    return {
        "detectedLanguage": detected["detectedLanguage"],
        "detectedLanguageCode": detected["detectedLanguageCode"],
        "languageConfidence": detected["languageConfidence"],
        "languageProcessingMode": detected["languageProcessingMode"],
        "normalizedTitle": raw_title,
        "normalizedDescription": raw_desc,
        "nodeExecutionHistory": history,
    }
