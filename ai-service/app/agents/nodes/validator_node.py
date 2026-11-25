from typing import Dict
from app.agents.state import ComplaintAnalysisState
from app.core.constants import (
    AI_CATEGORIES,
    AUTHORITY_DIRECTORY,
    EMERGENCY_GUIDANCE_TEXT,
    LANGUAGE_CODES,
    PRIORITIES,
)


def structured_output_validation_node(state: ComplaintAnalysisState) -> Dict:
    history = list(state.get("nodeExecutionHistory") or [])
    history.append("StructuredOutputValidationNode")
    errors = []

    category = state.get("classifiedCategory", "Other")
    if category not in AI_CATEGORIES:
        errors.append(f"Invalid category '{category}' coerced to 'Other'.")
        category = "Other"

    priority = state.get("priority", "Medium")
    if priority not in PRIORITIES:
        errors.append(f"Invalid priority '{priority}' coerced to 'Medium'.")
        priority = "Medium"

    lang_code = state.get("detectedLanguageCode", "und")
    if lang_code not in LANGUAGE_CODES:
        errors.append(f"Unsupported language code '{lang_code}' coerced to 'und'.")
        lang_code = "und"

    cat_conf = int(max(0, min(100, state.get("categoryConfidence", 50))))
    lang_conf = int(max(0, min(100, state.get("languageConfidence", 50))))

    is_oos = bool(state.get("isOutOfScope", False))
    recommended_auth = state.get("recommendedAuthority")
    if is_oos or category == "Out of Scope":
        recommended_auth = None
    elif not recommended_auth:
        recommended_auth = dict(AUTHORITY_DIRECTORY.get(category, AUTHORITY_DIRECTORY["Other"]))

    emergency_guidance = state.get("emergencyGuidance")
    if is_oos and state.get("outOfScopeCategory") and "police" in state.get("outOfScopeCategory", "").lower():
        emergency_guidance = emergency_guidance or EMERGENCY_GUIDANCE_TEXT

    needs_human_review = (
        is_oos
        or lang_conf < 60
        or cat_conf < 70
        or state.get("languageProcessingMode") != "implemented_lexicon"
        or bool(errors)
    )

    engine = state.get("engineUsed", "rule-fallback")
    if errors and engine == "rule-fallback":
        engine = "degraded-safe"

    return {
        "classifiedCategory": category,
        "priority": priority,
        "detectedLanguageCode": lang_code,
        "categoryConfidence": cat_conf,
        "languageConfidence": lang_conf,
        "recommendedAuthority": recommended_auth,
        "emergencyGuidance": emergency_guidance,
        "validationErrors": errors,
        "isValid": len(errors) == 0,
        "needsHumanReview": needs_human_review,
        "engineUsed": engine,
        "nodeExecutionHistory": history,
    }
