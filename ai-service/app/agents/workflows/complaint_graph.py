import time
from typing import Any, Dict, List, Optional
from langgraph.graph import END, START, StateGraph

from app.agents.state import ComplaintAnalysisState
from app.agents.nodes.language_node import language_detection_node
from app.agents.nodes.understanding_node import complaint_understanding_node
from app.agents.nodes.pii_node import pii_scrubbing_node
from app.agents.nodes.scope_node import out_of_scope_detection_node
from app.agents.nodes.category_node import category_classification_node
from app.agents.nodes.priority_node import priority_assessment_node
from app.agents.nodes.clustering_node import clustering_node
from app.agents.nodes.authority_node import authority_recommendation_node
from app.agents.nodes.validator_node import structured_output_validation_node
from app.agents.nodes.formatter_node import final_result_node


def _route_after_scope(state: ComplaintAnalysisState) -> str:
    if state.get("isOutOfScope"):
        return "out_of_scope"
    return "in_scope"


def build_complaint_graph():
    builder = StateGraph(ComplaintAnalysisState)

    builder.add_node("LanguageDetectionNode", language_detection_node)
    builder.add_node("ComplaintUnderstandingNode", complaint_understanding_node)
    builder.add_node("PIIScrubbingNode", pii_scrubbing_node)
    builder.add_node("OutOfScopeDetectionNode", out_of_scope_detection_node)
    builder.add_node("CategoryClassificationNode", category_classification_node)
    builder.add_node("PriorityAssessmentNode", priority_assessment_node)
    builder.add_node("ClusteringNode", clustering_node)
    builder.add_node("AuthorityRecommendationNode", authority_recommendation_node)
    builder.add_node("StructuredOutputValidationNode", structured_output_validation_node)
    builder.add_node("FinalResultNode", final_result_node)

    builder.add_edge(START, "LanguageDetectionNode")
    builder.add_edge("LanguageDetectionNode", "ComplaintUnderstandingNode")
    builder.add_edge("ComplaintUnderstandingNode", "PIIScrubbingNode")
    builder.add_edge("PIIScrubbingNode", "OutOfScopeDetectionNode")

    builder.add_conditional_edges(
        "OutOfScopeDetectionNode",
        _route_after_scope,
        {
            "out_of_scope": "StructuredOutputValidationNode",
            "in_scope": "CategoryClassificationNode",
        },
    )

    builder.add_edge("CategoryClassificationNode", "PriorityAssessmentNode")
    builder.add_edge("PriorityAssessmentNode", "ClusteringNode")
    builder.add_edge("ClusteringNode", "AuthorityRecommendationNode")
    builder.add_edge("AuthorityRecommendationNode", "StructuredOutputValidationNode")
    builder.add_edge("StructuredOutputValidationNode", "FinalResultNode")
    builder.add_edge("FinalResultNode", END)

    return builder.compile()


complaint_graph = build_complaint_graph()


def run_complaint_analysis(
    complaint_id: str,
    title: str,
    description: str,
    submitted_category: str,
    ward: str,
    district: str = "Pune",
    declared_language: Optional[str] = "English",
    existing_clusters: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    initial_state: ComplaintAnalysisState = {
        "complaintId": complaint_id,
        "rawTitle": title,
        "rawDescription": description,
        "submittedCategory": submitted_category or "Other",
        "ward": ward,
        "district": district,
        "declaredLanguage": declared_language,
        "existingClusters": existing_clusters or [],
        "startTimeMs": time.perf_counter() * 1000,
        "nodeExecutionHistory": [],
    }

    result_state = complaint_graph.invoke(initial_state)
    return result_state["finalResponse"]
