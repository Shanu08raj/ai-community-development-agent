from typing import List, Optional
from pydantic import BaseModel, Field


class PiperVoiceInfo(BaseModel):
    id: str
    label: str
    locale: str
    sizeMb: int
    downloaded: bool
    preloadedRecommended: bool = False


class LanguageCapabilityItem(BaseModel):
    code: str
    name: str
    nativeName: str
    script: str
    rtl: bool
    scheduledEighth: bool
    initialSupported: bool
    sttAvailable: bool
    sttSupportLevel: str
    sttProvider: str
    ttsAvailable: bool
    ttsSupportLevel: str
    ttsProvider: str
    piperVoices: List[PiperVoiceInfo] = Field(default_factory=list)
    voiceDownloaded: bool = False
    qualityStatus: str
    limitations: str
    recommendHumanReview: bool


class VoiceLanguagesResponse(BaseModel):
    success: bool = True
    languages: List[LanguageCapabilityItem]
    providers: dict


class VoiceTranscribeResponse(BaseModel):
    success: bool = True
    transcript: str
    detectedLanguage: str
    detectedLanguageCode: str
    languageConfidence: int = Field(ge=0, le=100)
    transcriptConfidence: Optional[int] = Field(default=None, ge=0, le=100)
    qualityStatus: str
    durationSeconds: float = Field(ge=0.0)
    rtl: bool = False
    provider: str
    model: str
    recommendHumanReview: bool = True
    warnings: List[str] = Field(default_factory=list)


class VoiceSynthesizeRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=1500)
    language: str = Field(default="en", min_length=1, max_length=64)
    voiceId: Optional[str] = Field(default=None, max_length=100)
    speed: float = Field(default=1.0, ge=0.75, le=1.5)


class AmbiguousLocationItem(BaseModel):
    field: str
    state: str = ""
    district: str = ""


class ComplaintExtractRequest(BaseModel):
    transcript: str = Field(..., min_length=1, max_length=3000)
    language: str = Field(default="auto", max_length=64)
    existingFields: Optional[dict] = None


class ComplaintExtractResponse(BaseModel):
    success: bool = True
    originalTranscript: str
    detectedLanguage: str
    detectedLanguageCode: str
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    categoryCode: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None
    ward: Optional[str] = None
    area: Optional[str] = None
    locationStatus: str
    ambiguousLocations: List[AmbiguousLocationItem] = Field(default_factory=list)
    locationMismatch: Optional[str] = None
    existingFieldConflicts: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
