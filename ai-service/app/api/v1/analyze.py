from fastapi import APIRouter, Depends
from app.agents.workflows.complaint_graph import run_complaint_analysis
from app.core.security import verify_internal_secret
from app.schemas.request import AnalyzeComplaintRequest
from app.schemas.response import AnalyzeComplaintResponse
from app.utils.logger import log_event

router = APIRouter()


@router.post(
    "/analyze-complaint",
    response_model=AnalyzeComplaintResponse,
    dependencies=[Depends(verify_internal_secret)],
)
def analyze_complaint_endpoint(payload: AnalyzeComplaintRequest):
    clusters_dicts = (
        [c.model_dump() for c in payload.existingClusters]
        if payload.existingClusters
        else []
    )

    result = run_complaint_analysis(
        complaint_id=payload.complaintId,
        title=payload.title,
        description=payload.description,
        submitted_category=payload.submittedCategory or "Other",
        ward=payload.ward,
        district=payload.district,
        declared_language=payload.language,
        existing_clusters=clusters_dicts,
    )

    log_event(
        "complaint_analyzed",
        complaintId=payload.complaintId,
        category=result["analysis"]["classifiedCategory"],
        priority=result["analysis"]["priority"],
        detectedLanguageCode=result["analysis"]["detectedLanguageCode"],
        isOutOfScope=result["analysis"]["isOutOfScope"],
        engine=result["meta"]["engine"],
        processingTimeMs=result["meta"]["processingTimeMs"],
    )

    return result
