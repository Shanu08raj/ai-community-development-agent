from typing import Dict
from app.agents.state import ComplaintAnalysisState
from app.core.constants import EMERGENCY_GUIDANCE_TEXT
from app.services.rule_fallback import detect_out_of_scope


def out_of_scope_detection_node(state: ComplaintAnalysisState) -> Dict:
    redacted_text = f"{state.get('redactedTitle', '')} {state.get('redactedDescription', '')}"

    history = list(state.get("nodeExecutionHistory") or [])
    history.append("OutOfScopeDetectionNode")

    is_oos, oos_cat, reason, is_emergency = detect_out_of_scope(redacted_text)

    if is_oos:
        return {
            "isOutOfScope": True,
            "outOfScopeCategory": oos_cat,
            "outOfScopeReason": reason,
            "emergencyGuidance": EMERGENCY_GUIDANCE_TEXT if is_emergency else None,
            "classifiedCategory": "Out of Scope",
            "categoryConfidence": 95,
            "categoryReason": reason,
            "priority": "High" if is_emergency else "Medium",
            "priorityScore": 95 if is_emergency else 55,
            "priorityReason": (
                "Immediate emergency threat identified; citizen instructed to contact official emergency helpline 112."
                if is_emergency
                else "Flagged as out-of-scope domain for manual administrative triage."
            ),
            "isDuplicate": False,
            "suggestedClusterId": None,
            "clusterSimilarityScore": None,
            "clusterReason": "Excluded from clustering due to out-of-scope classification.",
            "recommendedAuthority": None,
            "engineUsed": "rule-fallback",
            "nodeExecutionHistory": history,
        }

    return {
        "isOutOfScope": False,
        "outOfScopeCategory": None,
        "outOfScopeReason": None,
        "emergencyGuidance": None,
        "nodeExecutionHistory": history,
    }
