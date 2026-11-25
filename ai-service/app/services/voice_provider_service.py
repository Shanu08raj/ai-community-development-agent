import base64
import io
import wave
from typing import Any, Dict, Optional, Tuple
import httpx

from app.core.voice_config import voice_settings
from app.services.language_registry import BHASHINI_ISO_MAP, resolve_language
from app.services.stt_service import STTError, transcribe_audio_local
from app.services.tts_service import TTSError, preprocess_tts_text, synthesize_speech_local


def _normalize_audio_to_16k_wav(audio_bytes: bytes) -> bytes:
    """Convert browser-recorded WebM/OGG/MP3 containers into 16 kHz mono PCM WAV via PyAV."""
    if len(audio_bytes) >= 12 and audio_bytes[:4] == b"RIFF" and audio_bytes[8:12] == b"WAVE":
        return audio_bytes

    import av

    in_buf = io.BytesIO(audio_bytes)
    pcm_chunks = []
    with av.open(in_buf) as container:
        resampler = av.audio.resampler.AudioResampler(format="s16", layout="mono", rate=16000)
        for frame in container.decode(audio=0):
            for out_frame in resampler.resample(frame):
                pcm_chunks.append(bytes(out_frame.planes[0]))
        for out_frame in resampler.resample(None):
            pcm_chunks.append(bytes(out_frame.planes[0]))

    out_buf = io.BytesIO()
    with wave.open(out_buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(16000)
        wf.writeframes(b"".join(pcm_chunks))
    return out_buf.getvalue()


def is_bhashini_ready() -> bool:
    return bool(
        voice_settings.ENABLE_BHASHINI
        and voice_settings.BHASHINI_USER_ID
        and (voice_settings.BHASHINI_INFERENCE_KEY or voice_settings.BHASHINI_ULCA_API_KEY)
    )


def _bhashini_pipeline_transcribe(audio_bytes: bytes, lang_code: str) -> Dict[str, Any]:
    """Optional Digital India Bhashini Dhruva ASR integration when registered keys are configured."""
    b_lang = BHASHINI_ISO_MAP.get(lang_code, lang_code)
    headers = {
        "Authorization": voice_settings.BHASHINI_INFERENCE_KEY,
        "userID": voice_settings.BHASHINI_USER_ID,
        "ulcaApiKey": voice_settings.BHASHINI_ULCA_API_KEY,
        "Content-Type": "application/json",
    }
    config_payload = {
        "pipelineTasks": [{"taskType": "asr", "config": {"language": {"sourceLanguage": b_lang}}}],
        "pipelineRequestConfig": {"pipelineId": "64392f96daac500b55c543cd"},
    }
    try:
        with httpx.Client(timeout=15.0) as client:
            cfg_resp = client.post(
                voice_settings.BHASHINI_CONFIG_URL,
                json=config_payload,
                headers={"userID": voice_settings.BHASHINI_USER_ID, "ulcaApiKey": voice_settings.BHASHINI_ULCA_API_KEY},
            )
            cfg_resp.raise_for_status()
            cfg_json = cfg_resp.json()
            service_id = cfg_json["pipelineResponseConfig"][0]["config"][0]["serviceId"]
            inference_key = (
                cfg_json.get("pipelineInferenceAPIEndPoint", {})
                .get("inferenceApiKey", {})
                .get("value")
                or voice_settings.BHASHINI_INFERENCE_KEY
            )
            endpoint_url = (
                cfg_json.get("pipelineInferenceAPIEndPoint", {}).get("callbackUrl")
                or voice_settings.BHASHINI_INFERENCE_URL
            )

            wav_bytes = _normalize_audio_to_16k_wav(audio_bytes)
            infer_payload = {
                "pipelineTasks": [
                    {
                        "taskType": "asr",
                        "config": {
                            "language": {"sourceLanguage": b_lang},
                            "serviceId": service_id,
                            "audioFormat": "wav",
                            "samplingRate": 16000,
                        },
                    }
                ],
                "inputData": {"audio": [{"audioContent": base64.b64encode(wav_bytes).decode("ascii")}]},
            }
            inf_resp = client.post(
                endpoint_url,
                json=infer_payload,
                headers={**headers, "Authorization": inference_key},
            )
            inf_resp.raise_for_status()
            inf_json = inf_resp.json()
            transcript = inf_json["pipelineResponse"][0]["output"][0]["source"].strip()
            entry = resolve_language(lang_code)
            return {
                "success": True,
                "transcript": transcript,
                "detectedLanguage": entry["name"] if entry else lang_code,
                "detectedLanguageCode": lang_code,
                "languageConfidence": 85,
                "transcriptConfidence": 80,
                "qualityStatus": "good" if transcript else "empty",
                "durationSeconds": 0.0,
                "rtl": bool(entry["rtl"]) if entry else False,
                "provider": "bhashini-dhruva-optional",
                "model": service_id,
                "recommendHumanReview": True,
                "warnings": [],
            }
    except Exception as exc:
        raise STTError(
            502,
            "BHASHINI_STT_FAILED",
            f"Optional Bhashini ASR request failed cleanly: {exc}",
        ) from exc


def _bhashini_pipeline_synthesize(text: str, lang_code: str) -> Tuple[bytes, Dict[str, Any]]:
    b_lang = BHASHINI_ISO_MAP.get(lang_code, lang_code)
    cleaned = preprocess_tts_text(text)
    try:
        with httpx.Client(timeout=15.0) as client:
            cfg_resp = client.post(
                voice_settings.BHASHINI_CONFIG_URL,
                json={
                    "pipelineTasks": [{"taskType": "tts", "config": {"language": {"sourceLanguage": b_lang}}}],
                    "pipelineRequestConfig": {"pipelineId": "64392f96daac500b55c543cd"},
                },
                headers={"userID": voice_settings.BHASHINI_USER_ID, "ulcaApiKey": voice_settings.BHASHINI_ULCA_API_KEY},
            )
            cfg_resp.raise_for_status()
            cfg_json = cfg_resp.json()
            service_id = cfg_json["pipelineResponseConfig"][0]["config"][0]["serviceId"]
            inference_key = (
                cfg_json.get("pipelineInferenceAPIEndPoint", {})
                .get("inferenceApiKey", {})
                .get("value")
                or voice_settings.BHASHINI_INFERENCE_KEY
            )
            endpoint_url = (
                cfg_json.get("pipelineInferenceAPIEndPoint", {}).get("callbackUrl")
                or voice_settings.BHASHINI_INFERENCE_URL
            )

            inf_resp = client.post(
                endpoint_url,
                json={
                    "pipelineTasks": [
                        {
                            "taskType": "tts",
                            "config": {
                                "language": {"sourceLanguage": b_lang},
                                "serviceId": service_id,
                                "gender": "female",
                            },
                        }
                    ],
                    "inputData": {"input": [{"source": cleaned}]},
                },
                headers={"Authorization": inference_key, "Content-Type": "application/json"},
            )
            inf_resp.raise_for_status()
            audio_b64 = inf_resp.json()["pipelineResponse"][0]["audio"][0]["audioContent"]
            wav_bytes = base64.b64decode(audio_b64)
            entry = resolve_language(lang_code)
            return wav_bytes, {
                "provider": "bhashini-dhruva-optional",
                "voiceId": service_id,
                "voiceLabel": "Bhashini Optional Voice",
                "languageCode": lang_code,
                "languageName": entry["name"] if entry else lang_code,
                "sampleRate": "22050",
            }
    except Exception as exc:
        raise TTSError(
            502,
            "BHASHINI_TTS_FAILED",
            f"Optional Bhashini TTS request failed cleanly: {exc}",
        ) from exc


def route_transcribe(
    audio_bytes: bytes,
    preferred_language: Optional[str] = "auto",
    content_type: Optional[str] = None,
) -> Dict[str, Any]:
    try:
        return transcribe_audio_local(
            audio_bytes=audio_bytes,
            preferred_language=preferred_language,
            content_type=content_type,
        )
    except STTError as local_err:
        entry = resolve_language(preferred_language)
        if local_err.code == "STT_LANGUAGE_UNSUPPORTED_LOCALLY" and entry and is_bhashini_ready():
            return _bhashini_pipeline_transcribe(audio_bytes, entry["code"])
        raise


def route_synthesize(
    text: str,
    language: Optional[str] = "en",
    voice_id: Optional[str] = None,
    speed: float = 1.0,
) -> Tuple[bytes, Dict[str, Any]]:
    try:
        return synthesize_speech_local(
            text=text,
            language=language,
            voice_id=voice_id,
            speed=speed,
        )
    except TTSError as local_err:
        entry = resolve_language(language)
        if local_err.code in ("TTS_VOICE_UNAVAILABLE", "TTS_VOICE_NOT_DOWNLOADED") and entry and is_bhashini_ready():
            return _bhashini_pipeline_synthesize(text, entry["code"])
        raise
