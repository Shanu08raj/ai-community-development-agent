import time
from datetime import datetime, timezone
from typing import Dict
from app.agents.state import ComplaintAnalysisState
from app.schemas.response import (
    AnalysisMeta,
    AnalyzeComplaintResponse,
    ComplaintAnalysisOutput,
    RecommendedAuthorityResponse,
)


def final_result_node(state: ComplaintAnalysisState) -> Dict:
    history = list(state.get("nodeExecutionHistory") or [])
    history.append("FinalResultNode")

    start_ms = state.get("startTimeMs") or (time.perf_counter() * 1000)
    elapsed_ms = max(1, int((time.perf_counter() * 1000) - start_ms))

    auth_dict = state.get("recommendedAuthority")
    auth_model = RecommendedAuthorityResponse(**auth_dict) if auth_dict else None

    analysis = ComplaintAnalysisOutput(
        detectedLanguage=state.get("detectedLanguage", "Undetermined"),
        detectedLanguageCode=state.get("detectedLanguageCode", "und"),
        languageConfidence=state.get("languageConfidence", 50),
        languageProcessingMode=state.get("languageProcessingMode", "manual_review_fallback"),
        sanitizedSummary=state.get("sanitizedSummary") or state.get("redactedTitle", ""),
        classifiedCategory=state.get("classifiedCategory", "Other"),
        categoryConfidence=state.get("categoryConfidence", 50),
        categoryReason=state.get("categoryReason", "Automated classification advisory."),
        priority=state.get("priority", "Medium"),
        priorityReason=state.get("priorityReason", "Advisory priority score."),
        isDuplicate=bool(state.get("isDuplicate", False)),
        suggestedClusterId=state.get("suggestedClusterId"),
        clusterSimilarityScore=state.get("clusterSimilarityScore"),
        clusterReason=state.get("clusterReason"),
        recommendedAuthority=auth_model,
        isOutOfScope=bool(state.get("isOutOfScope", False)),
        outOfScopeCategory=state.get("outOfScopeCategory"),
        outOfScopeReason=state.get("outOfScopeReason"),
        emergencyGuidance=state.get("emergencyGuidance"),
        needsHumanReview=bool(state.get("needsHumanReview", True)),
    )

    meta = AnalysisMeta(
        processingTimeMs=elapsed_ms,
        engine=state.get("engineUsed", "rule-fallback"),
        version="1.0.0",
        timestamp=datetime.now(timezone.utc).isoformat(),
        stagesExecuted=history,
    )

    response = AnalyzeComplaintResponse(
        success=True,
        complaintId=state.get("complaintId", "JS-2026-0000"),
        analysis=analysis,
        meta=meta,
    )

    return {
        "processingTimeMs": elapsed_ms,
        "nodeExecutionHistory": history,
        "finalResponse": response.model_dump(),
    }
