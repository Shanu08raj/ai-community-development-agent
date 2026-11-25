from typing import Dict
from app.agents.state import ComplaintAnalysisState
from app.services.similarity_service import match_cluster


def clustering_node(state: ComplaintAnalysisState) -> Dict:
    category = state.get("classifiedCategory", "Other")
    ward = state.get("ward", "")
    combined = f"{state.get('redactedTitle', '')} {state.get('redactedDescription', '')}"
    candidates = state.get("existingClusters") or []

    history = list(state.get("nodeExecutionHistory") or [])
    history.append("ClusteringNode")

    is_dup, cluster_id, sim_score, reason = match_cluster(
        category=category,
        ward=ward,
        complaint_text=combined,
        candidates=candidates,
    )

    return {
        "isDuplicate": is_dup,
        "suggestedClusterId": cluster_id,
        "clusterSimilarityScore": sim_score,
        "clusterReason": reason,
        "nodeExecutionHistory": history,
    }
