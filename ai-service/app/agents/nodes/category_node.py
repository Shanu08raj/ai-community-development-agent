from typing import Dict
from app.agents.state import ComplaintAnalysisState
from app.services.ollama_service import try_ollama_classification
from app.services.rule_fallback import classify_category_rule


def category_classification_node(state: ComplaintAnalysisState) -> Dict:
    redacted_title = state.get("redactedTitle", "")
    redacted_desc = state.get("redactedDescription", "")
    submitted_cat = state.get("submittedCategory", "Other") or "Other"
    lang_name = state.get("detectedLanguage", "English")
    lang_mode = state.get("languageProcessingMode", "implemented_lexicon")

    history = list(state.get("nodeExecutionHistory") or [])
    history.append("CategoryClassificationNode")

    # Safe fallback for languages without tested lexical rules or uncertain language
    if lang_mode != "implemented_lexicon":
        return {
            "classifiedCategory": submitted_cat if submitted_cat != "Out of Scope" else "Other",
            "categoryConfidence": 50,
            "categoryReason": (
                f"Language '{lang_name}' uses script heuristic fallback without full NLP classification; "
                "retained citizen category and flagged for human review."
            ),
            "engineUsed": "rule-fallback",
            "nodeExecutionHistory": history,
        }

    combined = f"{redacted_title} {redacted_desc}"
    category, confidence, reason = classify_category_rule(combined, submitted_cat)
    engine = "rule-fallback"

    # Optional lightweight Ollama enrichment ONLY when ambiguous AND ENABLE_OLLAMA=true
    if confidence < 75:
        llm_res = try_ollama_classification(redacted_title, redacted_desc, lang_name)
        if llm_res:
            category = llm_res["category"]
            confidence = max(confidence, 78)
            reason = f"Lightweight LLM ({llm_res['engine']}) assisted classification on ambiguous text."
            engine = llm_res["engine"]
            return {
                "classifiedCategory": category,
                "categoryConfidence": confidence,
                "categoryReason": reason,
                "sanitizedSummary": llm_res["summary"],
                "engineUsed": engine,
                "nodeExecutionHistory": history,
            }

    return {
        "classifiedCategory": category,
        "categoryConfidence": confidence,
        "categoryReason": reason,
        "engineUsed": engine,
        "nodeExecutionHistory": history,
    }
