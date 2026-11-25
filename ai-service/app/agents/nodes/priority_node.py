from typing import Dict
from app.agents.state import ComplaintAnalysisState
from app.services.rule_fallback import assess_priority_rule


def priority_assessment_node(state: ComplaintAnalysisState) -> Dict:
    combined = f"{state.get('redactedTitle', '')} {state.get('redactedDescription', '')}"
    lang_mode = state.get("languageProcessingMode", "implemented_lexicon")

    history = list(state.get("nodeExecutionHistory") or [])
    history.append("PriorityAssessmentNode")

    if lang_mode != "implemented_lexicon":
        return {
            "priority": "Medium",
            "priorityScore": 50,
            "priorityReason": "Default Medium priority assigned due to regional script fallback; human admin assessment required.",
            "nodeExecutionHistory": history,
        }

    priority, score, reason = assess_priority_rule(combined)
    return {
        "priority": priority,
        "priorityScore": score,
        "priorityReason": reason,
        "nodeExecutionHistory": history,
    }
