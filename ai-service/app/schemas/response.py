from typing import List, Literal, Optional
from pydantic import BaseModel, Field


class RecommendedAuthorityResponse(BaseModel):
    id: str
    name: str
    department: str
    jurisdiction: Optional[str] = None


class ComplaintAnalysisOutput(BaseModel):
    detectedLanguage: str
    detectedLanguageCode: Literal[
        "as", "bn", "brx", "doi", "en", "gu", "hi", "kn", "ks", "kok",
        "mai", "ml", "mni", "mr", "ne", "or", "pa", "sa", "sat", "sd",
        "ta", "te", "ur", "und",
    ]
    languageConfidence: int = Field(ge=0, le=100)
    languageProcessingMode: str
    sanitizedSummary: str
    classifiedCategory: Literal[
        "Water Supply",
        "Roads and Infrastructure",
        "Waste Management",
        "Drainage and Sanitation",
        "Streetlights",
        "Other",
        "Out of Scope",
    ]
    categoryConfidence: int = Field(ge=0, le=100)
    categoryReason: str
    priority: Literal["High", "Medium", "Low"]
    priorityReason: str
    isDuplicate: bool
    suggestedClusterId: Optional[str] = None
    clusterSimilarityScore: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    clusterReason: Optional[str] = None
    recommendedAuthority: Optional[RecommendedAuthorityResponse] = None
    isOutOfScope: bool
    outOfScopeCategory: Optional[str] = None
    outOfScopeReason: Optional[str] = None
    emergencyGuidance: Optional[str] = None
    needsHumanReview: bool = True
    advisoryNotice: str = (
        "Advisory only. Human administrator review is required before verification, forwarding, or resolution."
    )


class AnalysisMeta(BaseModel):
    processingTimeMs: int = Field(ge=0)
    engine: str
    version: str = "1.0.0"
    timestamp: str
    stagesExecuted: List[str] = Field(default_factory=list)


class AnalyzeComplaintResponse(BaseModel):
    success: bool = True
    complaintId: str
    analysis: ComplaintAnalysisOutput
    meta: AnalysisMeta
