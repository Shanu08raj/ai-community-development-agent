from typing import Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile

from app.core.security import verify_internal_secret
from app.core.voice_config import voice_settings
from app.schemas.voice import (
    ComplaintExtractRequest,
    ComplaintExtractResponse,
    VoiceLanguagesResponse,
    VoiceSynthesizeRequest,
    VoiceTranscribeResponse,
)
from app.services.complaint_extraction_service import extract_complaint_fields
from app.services.language_registry import list_public_language_capabilities
from app.services.stt_service import STTError
from app.services.tts_service import TTSError
from app.services.voice_provider_service import is_bhashini_ready, route_synthesize, route_transcribe
from app.utils.logger import log_event

router = APIRouter()


@router.get("/languages", response_model=VoiceLanguagesResponse)
def get_voice_languages():
    return {
        "success": True,
        "languages": list_public_language_capabilities(),
        "providers": {
            "localSttEnabled": voice_settings.ENABLE_VOICE_STT,
            "localSttModel": f"faster-whisper-{voice_settings.WHISPER_MODEL_SIZE}-{voice_settings.WHISPER_COMPUTE_TYPE}",
            "localTtsEnabled": voice_settings.ENABLE_VOICE_TTS,
            "localTtsEngine": "piper-tts",
            "piperAutoDownload": voice_settings.PIPER_AUTO_DOWNLOAD,
            "optionalBhashiniEnabled": is_bhashini_ready(),
        },
    }


@router.post(
    "/transcribe",
    response_model=VoiceTranscribeResponse,
    dependencies=[Depends(verify_internal_secret)],
)
async def transcribe_endpoint(
    audio: UploadFile = File(...),
    language: Optional[str] = Form(default="auto"),
):
    audio_bytes = await audio.read()
    try:
        result = route_transcribe(
            audio_bytes=audio_bytes,
            preferred_language=language,
            content_type=audio.content_type,
        )
        log_event(
            "voice_transcribed",
            detectedLanguageCode=result["detectedLanguageCode"],
            qualityStatus=result["qualityStatus"],
            provider=result["provider"],
            durationSeconds=result["durationSeconds"],
        )
        return result
    except STTError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail={"code": exc.code, "message": exc.message},
        ) from exc


@router.post(
    "/synthesize",
    dependencies=[Depends(verify_internal_secret)],
)
def synthesize_endpoint(payload: VoiceSynthesizeRequest):
    try:
        wav_bytes, meta = route_synthesize(
            text=payload.text,
            language=payload.language,
            voice_id=payload.voiceId,
            speed=payload.speed,
        )
        log_event(
            "voice_synthesized",
            languageCode=meta["languageCode"],
            provider=meta["provider"],
            voiceId=meta["voiceId"],
            bytesGenerated=len(wav_bytes),
        )
        return Response(
            content=wav_bytes,
            media_type="audio/wav",
            headers={
                "Cache-Control": "no-store",
                "X-Voice-Provider": meta["provider"],
                "X-Voice-Id": meta["voiceId"],
                "X-Voice-Language": meta["languageCode"],
                "X-Voice-Sample-Rate": meta["sampleRate"],
            },
        )
    except TTSError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail={"code": exc.code, "message": exc.message, **exc.details},
        ) from exc


@router.post(
    "/extract-complaint",
    response_model=ComplaintExtractResponse,
    dependencies=[Depends(verify_internal_secret)],
)
def extract_complaint_endpoint(payload: ComplaintExtractRequest):
    result = extract_complaint_fields(
        transcript=payload.transcript,
        language=payload.language,
        existing_fields=payload.existingFields,
    )
    log_event(
        "voice_complaint_extracted",
        detectedLanguageCode=result["detectedLanguageCode"],
        categoryCode=result["categoryCode"],
        locationStatus=result["locationStatus"],
        hasWard=bool(result["ward"]),
    )
    return result
