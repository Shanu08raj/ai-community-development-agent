import io
import math
import re
import threading
from typing import Any, Dict, Optional

import av
import numpy as np

from app.core.voice_config import voice_settings
from app.services.language_detection_service import detect_text_language
from app.services.language_registry import BY_CODE, resolve_language


class STTError(Exception):
    def __init__(self, status_code: int, code: str, message: str):
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message


_MODEL_LOCK = threading.Lock()
_WHISPER_MODEL = None


def _get_whisper_model():
    global _WHISPER_MODEL
    if _WHISPER_MODEL is not None:
        return _WHISPER_MODEL

    with _MODEL_LOCK:
        if _WHISPER_MODEL is not None:
            return _WHISPER_MODEL
        try:
            from faster_whisper import WhisperModel
        except ImportError as exc:
            raise STTError(
                503,
                "STT_DEPENDENCY_MISSING",
                "Speech recognition dependency (faster-whisper) is not installed on the AI service.",
            ) from exc

        try:
            selected_size = voice_settings.WHISPER_MODEL_SIZE
            local_whisper_dir = voice_settings.VOICE_MODELS_DIR / f"whisper-{selected_size}"
            if not (local_whisper_dir / "model.bin").exists() and selected_size != "base":
                fallback_base_dir = voice_settings.VOICE_MODELS_DIR / "whisper-base"
                if (fallback_base_dir / "model.bin").exists():
                    local_whisper_dir = fallback_base_dir
            whisper_cache_dir = voice_settings.VOICE_MODELS_DIR / "whisper-cache"
            if (local_whisper_dir / "model.bin").exists():
                _WHISPER_MODEL = WhisperModel(
                    str(local_whisper_dir),
                    device=voice_settings.WHISPER_DEVICE,
                    compute_type=voice_settings.WHISPER_COMPUTE_TYPE,
                    local_files_only=True,
                )
            else:
                whisper_cache_dir.mkdir(parents=True, exist_ok=True)
                _WHISPER_MODEL = WhisperModel(
                    selected_size,
                    device=voice_settings.WHISPER_DEVICE,
                    compute_type=voice_settings.WHISPER_COMPUTE_TYPE,
                    download_root=str(whisper_cache_dir),
                )
        except Exception as exc:
            raise STTError(
                503,
                "STT_MODEL_LOAD_FAILED",
                f"Unable to initialize Whisper '{voice_settings.WHISPER_MODEL_SIZE}' model: {exc}",
            ) from exc

        return _WHISPER_MODEL


def validate_audio_payload(audio_bytes: bytes, content_type: Optional[str] = None) -> str:
    if not audio_bytes or len(audio_bytes) < 64:
        raise STTError(
            422,
            "EMPTY_AUDIO_RECORDING",
            "Recorded audio is empty or too short. Please speak clearly and try again.",
        )

    if len(audio_bytes) > voice_settings.MAX_AUDIO_BYTES:
        raise STTError(
            413,
            "AUDIO_TOO_LARGE",
            f"Audio exceeds the {voice_settings.MAX_AUDIO_BYTES // (1024 * 1024)} MB limit.",
        )

    head = audio_bytes[:16]
    # Recognize common browser & standard container signatures before invoking decoders
    if head.startswith(b"RIFF") and head[8:12] == b"WAVE":
        return ".wav"
    if head.startswith(b"\x1a\x45\xdf\xa3"):
        return ".webm"
    if head.startswith(b"OggS"):
        return ".ogg"
    if head.startswith(b"fLaC"):
        return ".flac"
    if head.startswith(b"ID3") or (len(head) >= 2 and head[0] == 0xFF and (head[1] & 0xE0) == 0xE0):
        return ".mp3"
    if len(head) >= 8 and head[4:8] == b"ftyp":
        return ".m4a"

    ctype = (content_type or "").lower()
    if "webm" in ctype:
        return ".webm"
    if "ogg" in ctype:
        return ".ogg"
    if "wav" in ctype:
        return ".wav"

    raise STTError(
        422,
        "INVALID_AUDIO_FORMAT",
        "Unsupported or corrupted audio format. Please record using microphone or upload WAV/WebM/OGG/MP3.",
    )


def _decode_audio_to_float32_16k(audio_bytes: bytes):
    """Decode WAV/WebM/OGG/MP3/M4A/FLAC in-memory via PyAV into 16 kHz mono float32 PCM (avoids PyAV metadata_errors mismatch)."""
    pcm_chunks = []
    try:
        with av.open(io.BytesIO(audio_bytes), mode="r") as container:
            audio_streams = [s for s in container.streams if s.type == "audio"]
            if not audio_streams:
                raise ValueError("No audio stream found")
            resampler = av.audio.resampler.AudioResampler(format="s16", layout="mono", rate=16000)
            for frame in container.decode(audio_streams[0]):
                for out_frame in resampler.resample(frame):
                    pcm_chunks.append(bytes(out_frame.planes[0]))
            for out_frame in resampler.resample(None):
                pcm_chunks.append(bytes(out_frame.planes[0]))
    except Exception as exc:
        raise STTError(
            422,
            "INVALID_AUDIO_FORMAT",
            f"Unable to decode uploaded audio stream cleanly: {exc}",
        ) from exc

    if not pcm_chunks:
        return np.zeros(0, dtype=np.float32), 0.0

    pcm_int16 = np.frombuffer(b"".join(pcm_chunks), dtype=np.int16)
    samples = pcm_int16.astype(np.float32) / 32768.0
    duration = float(samples.shape[0]) / 16000.0
    return samples, duration


def transcribe_audio_local(
    audio_bytes: bytes,
    preferred_language: Optional[str] = "auto",
    content_type: Optional[str] = None,
) -> Dict[str, Any]:
    if not voice_settings.ENABLE_VOICE_STT:
        raise STTError(
            503,
            "VOICE_STT_DISABLED",
            "Local Speech-to-Text is disabled in configuration. Please type your complaint directly.",
        )

    validate_audio_payload(audio_bytes, content_type=content_type)

    requested_entry = None
    is_auto = not preferred_language or preferred_language.strip().lower() == "auto"
    if not is_auto:
        requested_entry = resolve_language(preferred_language)
        if not requested_entry:
            raise STTError(
                422,
                "UNSUPPORTED_LANGUAGE",
                f"Language '{preferred_language}' is not recognized in the JanSetu AI registry.",
            )
        if not requested_entry.get("whisperCode"):
            raise STTError(
                422,
                "STT_LANGUAGE_UNSUPPORTED_LOCALLY",
                f"Local Whisper STT does not support {requested_entry['name']}. Please type in {requested_entry['name']} or enable optional Bhashini cloud STT.",
            )

    audio_samples, duration = _decode_audio_to_float32_16k(audio_bytes)
    if duration > voice_settings.MAX_AUDIO_DURATION_SECONDS:
        raise STTError(
            422,
            "AUDIO_DURATION_EXCEEDED",
            f"Recording duration ({duration:.1f}s) exceeds the {int(voice_settings.MAX_AUDIO_DURATION_SECONDS)}s limit.",
        )

    if audio_samples.shape[0] < 1600:
        return {
            "success": True,
            "transcript": "",
            "detectedLanguage": requested_entry["name"] if requested_entry else "Undetermined",
            "detectedLanguageCode": requested_entry["code"] if requested_entry else "und",
            "languageConfidence": 0,
            "transcriptConfidence": 0,
            "qualityStatus": "empty",
            "durationSeconds": round(duration, 2),
            "rtl": bool(requested_entry["rtl"]) if requested_entry else False,
            "provider": "faster-whisper",
            "model": f"{voice_settings.WHISPER_MODEL_SIZE}-{voice_settings.WHISPER_COMPUTE_TYPE}",
            "recommendHumanReview": True,
            "warnings": [
                "Recorded audio contains no clear speech. Please speak closer to the microphone or type directly."
            ],
        }

    model = _get_whisper_model()
    requested_code = requested_entry["code"] if requested_entry else None
    # Use greedy decoding + repetition guards on scripts where beam_size=3 causes >30s CPU latency
    use_fast_beam = (
        voice_settings.WHISPER_MODEL_SIZE == "small"
        and requested_code in ("te", "kn", "ta", "as", "ml", "gu", "pa")
    )
    transcribe_kwargs: Dict[str, Any] = {
        "beam_size": 1 if use_fast_beam else 3,
        "vad_filter": True,
        "condition_on_previous_text": False,
        "no_repeat_ngram_size": 3,
        "repetition_penalty": 1.15,
    }
    if requested_entry and requested_entry.get("whisperCode"):
        transcribe_kwargs["language"] = requested_entry["whisperCode"]

    segments_iter, info = model.transcribe(audio_samples, **transcribe_kwargs)
    segments = list(segments_iter)
    duration = float(getattr(info, "duration", duration) or duration)

    transcript = " ".join((seg.text or "").strip() for seg in segments if (seg.text or "").strip()).strip()
    transcript = re.sub(r"\s+", " ", transcript)

    warnings = []
    if not transcript:
        return {
            "success": True,
            "transcript": "",
            "detectedLanguage": requested_entry["name"] if requested_entry else "Undetermined",
            "detectedLanguageCode": requested_entry["code"] if requested_entry else "und",
            "languageConfidence": 0,
            "transcriptConfidence": 0,
            "qualityStatus": "empty",
            "durationSeconds": round(duration, 2),
            "rtl": bool(requested_entry["rtl"]) if requested_entry else False,
            "provider": "faster-whisper",
            "model": f"{voice_settings.WHISPER_MODEL_SIZE}-{voice_settings.WHISPER_COMPUTE_TYPE}",
            "recommendHumanReview": True,
            "warnings": [
                "No clear speech was detected in the recording. Please speak closer to the microphone or type directly."
            ],
        }

    avg_logprobs = [float(getattr(s, "avg_logprob", -1.0)) for s in segments]
    no_speech_probs = [float(getattr(s, "no_speech_prob", 0.0)) for s in segments]
    mean_logprob = sum(avg_logprobs) / max(1, len(avg_logprobs))
    mean_no_speech = sum(no_speech_probs) / max(1, len(no_speech_probs))

    # Convert avg_logprob (~ -0.15 excellent .. -1.5 poor) cleanly into 0..100 confidence
    raw_prob = math.exp(max(-3.0, min(0.0, mean_logprob)))
    transcript_confidence = int(max(5, min(99, round(raw_prob * (1.0 - 0.5 * mean_no_speech) * 100))))

    whisper_lang = (getattr(info, "language", None) or "en").lower()
    lang_prob = float(getattr(info, "language_probability", 0.0) or 0.0)
    lang_conf = int(max(10, min(99, round(lang_prob * 100))))

    if requested_entry:
        final_entry = requested_entry
    else:
        # Refine Whisper auto-detection using Devanagari/Arabic script disambiguation without forcing translation
        refined = detect_text_language(transcript)
        if refined["detectedLanguageCode"] != "und" and whisper_lang in ("hi", "mr", "ne", "sa", "ur", "sd", "as", "bn"):
            final_entry = BY_CODE.get(refined["detectedLanguageCode"]) or BY_CODE.get(whisper_lang) or BY_CODE["en"]
        else:
            final_entry = BY_CODE.get(whisper_lang) or resolve_language(whisper_lang)

    lang_name = final_entry["name"] if final_entry else whisper_lang.upper()
    lang_code = final_entry["code"] if final_entry else whisper_lang
    is_rtl = bool(final_entry.get("rtl", False)) if final_entry else False

    quality_status = "good"
    recommend_review = bool(final_entry.get("recommendHumanReview", True)) if final_entry else True
    if transcript_confidence < 55 or mean_no_speech > 0.6:
        quality_status = "low_confidence"
        recommend_review = True
        warnings.append(
            "Recognition confidence is low (background noise or accented pronunciation). Please review and edit the transcript before submitting."
        )

    expected_indic_scripts = {
        "hi": r"[\u0900-\u097F]",
        "mr": r"[\u0900-\u097F]",
        "ne": r"[\u0900-\u097F]",
        "sa": r"[\u0900-\u097F]",
        "te": r"[\u0C00-\u0C7F]",
        "ta": r"[\u0B80-\u0BFF]",
        "kn": r"[\u0C80-\u0CFF]",
        "ml": r"[\u0D00-\u0D7F]",
        "bn": r"[\u0980-\u09FF]",
        "as": r"[\u0980-\u09FF]",
        "gu": r"[\u0A80-\u0AFF]",
        "pa": r"[\u0A00-\u0A7F]",
    }
    expected_pat = expected_indic_scripts.get(lang_code)
    has_spurious_foreign_script = bool(
        re.search(r"[\u3040-\u30FF\uAC00-\uD7AF\u0590-\u05FF\u0400-\u04FF]", transcript)
    )
    if expected_pat and not re.search(expected_pat, transcript):
        recommend_review = True
        warnings.append(
            f"Whisper '{voice_settings.WHISPER_MODEL_SIZE}' produced phonetic Latin or alternate-script text instead of native {lang_name} script. Please review and edit carefully, or type directly."
        )
    elif has_spurious_foreign_script:
        recommend_review = True
        warnings.append(
            f"Transcript contains unexpected non-Indic characters from '{voice_settings.WHISPER_MODEL_SIZE}'. Please review and edit before submitting."
        )

    return {
        "success": True,
        "transcript": transcript,
        "detectedLanguage": lang_name,
        "detectedLanguageCode": lang_code,
        "languageConfidence": lang_conf if is_auto else max(lang_conf, 90),
        "transcriptConfidence": transcript_confidence,
        "qualityStatus": quality_status,
        "durationSeconds": round(duration, 2),
        "rtl": is_rtl,
        "provider": "faster-whisper",
        "model": f"{voice_settings.WHISPER_MODEL_SIZE}-{voice_settings.WHISPER_COMPUTE_TYPE}",
        "recommendHumanReview": recommend_review,
        "warnings": warnings,
    }
