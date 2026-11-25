from typing import Any, Dict, List, Optional, TypedDict


class ComplaintAnalysisState(TypedDict, total=False):
    # Immutable inputs
    complaintId: str
    rawTitle: str
    rawDescription: str
    submittedCategory: str
    ward: str
    district: str
    declaredLanguage: Optional[str]
    existingClusters: List[Dict[str, Any]]
    startTimeMs: float

    # Node 1: Language Detection
    detectedLanguage: str
    detectedLanguageCode: str
    languageConfidence: int
    languageProcessingMode: str
    normalizedTitle: str
    normalizedDescription: str

    # Node 2: Complaint Understanding
    extractedKeyIssue: str
    extractedLandmarks: List[str]
    problemDuration: Optional[str]
    sanitizedSummary: str

    # Node 3: PII Scrubbing
    redactedTitle: str
    redactedDescription: str
    piiItemsMasked: int

    # Node 4: Out-of-Scope Detection
    isOutOfScope: bool
    outOfScopeCategory: Optional[str]
    outOfScopeReason: Optional[str]
    emergencyGuidance: Optional[str]

    # Node 5: Category Classification
    classifiedCategory: str
    categoryConfidence: int
    categoryReason: str

    # Node 6: Priority Assessment
    priority: str
    priorityScore: int
    priorityReason: str

    # Node 7: Related/Duplicate Clustering
    isDuplicate: bool
    suggestedClusterId: Optional[str]
    clusterSimilarityScore: Optional[float]
    clusterReason: Optional[str]

    # Node 8: Authority Recommendation
    recommendedAuthority: Optional[Dict[str, Any]]

    # Node 9: Structured Output Validation
    validationErrors: List[str]
    isValid: bool
    needsHumanReview: bool

    # Node 10: Final Result Formatting
    engineUsed: str
    processingTimeMs: int
    nodeExecutionHistory: List[str]
    finalResponse: Dict[str, Any]
