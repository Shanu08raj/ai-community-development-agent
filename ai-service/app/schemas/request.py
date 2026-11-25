from typing import List, Optional
from pydantic import BaseModel, Field


class ClusterCandidate(BaseModel):
    id: str
    title: str
    category: str
    area: str
    summary: Optional[str] = ""


class AnalyzeComplaintRequest(BaseModel):
    complaintId: str = Field(..., pattern=r"^JS-\d{4}-\d{4,6}$")
    title: str = Field(..., min_length=5, max_length=150)
    description: str = Field(..., min_length=10, max_length=3000)
    submittedCategory: Optional[str] = "Other"
    ward: str = Field(..., min_length=2, max_length=120)
    district: str = Field(default="Pune", max_length=80)
    language: Optional[str] = "English"
    existingClusters: Optional[List[ClusterCandidate]] = None
