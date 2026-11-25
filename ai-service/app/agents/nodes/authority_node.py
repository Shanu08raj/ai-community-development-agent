from typing import Dict
from app.agents.state import ComplaintAnalysisState
from app.core.constants import AUTHORITY_DIRECTORY


def authority_recommendation_node(state: ComplaintAnalysisState) -> Dict:
    category = state.get("classifiedCategory", "Other")
    history = list(state.get("nodeExecutionHistory") or [])
    history.append("AuthorityRecommendationNode")

    if state.get("isOutOfScope") or category == "Out of Scope":
        return {
            "recommendedAuthority": None,
            "nodeExecutionHistory": history,
        }

    authority = AUTHORITY_DIRECTORY.get(category, AUTHORITY_DIRECTORY["Other"])
    return {
        "recommendedAuthority": dict(authority),
        "nodeExecutionHistory": history,
    }
