import inspect
import os
import re
import tempfile
import threading
import wave
from collections import OrderedDict
from pathlib import Path
from typing import Any, Dict, Optional, Tuple
from urllib.request import urlretrieve

from app.core.voice_config import voice_settings
from app.services.language_registry import resolve_language

HF_PIPER_BASE = "https://huggingface.co/rhasspy/piper-voices/resolve/main"


class TTSError(Exception):
    def __init__(self, status_code: int, code: str, message: str, details: Optional[dict] = None):
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message
        self.details = details or {}


_VOICE_CACHE_LOCK = threading.Lock()
_LOADED_VOICES: "OrderedDict[str, Any]" = OrderedDict()
_MAX_CACHED_VOICES = 2


def preprocess_tts_text(text: str) -> str:
    cleaned = re.sub(r"\s+", " ", (text or "").strip())
    # Make alphanumeric reference IDs like JS-2026-8901 clearer when read aloud without altering scripts
    cleaned = re.sub(
        r"\bJS-(\d{4})-(\d{4,6})\b",
        lambda m: f"J S {m.group(1)} {' '.join(m.group(2))}",
        cleaned,
    )
    return cleaned[: voice_settings.MAX_TTS_TEXT_LENGTH]


def _ensure_piper_voice_files(voice_meta: Dict[str, Any]) -> Tuple[Path, Path]:
    voice_id = voice_meta["id"]
    voice_dir = voice_settings.PIPER_VOICES_DIR
    onnx_path = voice_dir / f"{voice_id}.onnx"
    cfg_path = voice_dir / f"{voice_id}.onnx.json"

    if onnx_path.exists() and cfg_path.exists():
        return onnx_path, cfg_path

    if not voice_settings.PIPER_AUTO_DOWNLOAD:
        raise TTSError(
            422,
            "TTS_VOICE_NOT_DOWNLOADED",
            f"Voice checkpoint '{voice_id}' is not cached locally and automatic download is disabled.",
            {"voiceId": voice_id, "browserFallbackAllowed": True},
        )

    subpath = voice_meta.get("hfSubpath")
    if not subpath:
        raise TTSError(
            422,
            "TTS_VOICE_UNAVAILABLE",
            f"No download source configured for voice '{voice_id}'.",
        )

    voice_dir.mkdir(parents=True, exist_ok=True)
    tmp_onnx = voice_dir / f"{voice_id}.onnx.tmp"
    tmp_cfg = voice_dir / f"{voice_id}.onnx.json.tmp"
    try:
        urlretrieve(f"{HF_PIPER_BASE}/{subpath}.onnx", tmp_onnx)
        urlretrieve(f"{HF_PIPER_BASE}/{subpath}.onnx.json", tmp_cfg)
        os.replace(tmp_onnx, onnx_path)
        os.replace(tmp_cfg, cfg_path)
    except Exception as exc:
        for p in (tmp_onnx, tmp_cfg):
            if p.exists():
                p.unlink(missing_ok=True)
        raise TTSError(
            503,
            "TTS_VOICE_DOWNLOAD_FAILED",
            f"Failed to download Piper voice '{voice_id}': {exc}",
        ) from exc

    return onnx_path, cfg_path


def _get_piper_voice(voice_meta: Dict[str, Any]):
    voice_id = voice_meta["id"]
    with _VOICE_CACHE_LOCK:
        if voice_id in _LOADED_VOICES:
            _LOADED_VOICES.move_to_end(voice_id)
            return _LOADED_VOICES[voice_id]

    try:
        from piper import PiperVoice
    except ImportError as exc:
        raise TTSError(
            503,
            "TTS_DEPENDENCY_MISSING",
            "Local TTS dependency (piper-tts) is not installed on the AI service.",
        ) from exc

    onnx_path, cfg_path = _ensure_piper_voice_files(voice_meta)
    try:
        voice = PiperVoice.load(str(onnx_path), config_path=str(cfg_path), use_cuda=False)
    except TypeError:
        voice = PiperVoice.load(str(onnx_path), config_path=str(cfg_path))
    except Exception as exc:
        raise TTSError(
            503,
            "TTS_VOICE_LOAD_FAILED",
            f"Unable to load local Piper voice '{voice_id}': {exc}",
        ) from exc

    with _VOICE_CACHE_LOCK:
        _LOADED_VOICES[voice_id] = voice
        _LOADED_VOICES.move_to_end(voice_id)
        while len(_LOADED_VOICES) > _MAX_CACHED_VOICES:
            _LOADED_VOICES.popitem(last=False)
    return voice


def synthesize_speech_local(
    text: str,
    language: Optional[str] = "en",
    voice_id: Optional[str] = None,
    speed: float = 1.0,
) -> Tuple[bytes, Dict[str, Any]]:
    if not voice_settings.ENABLE_VOICE_TTS:
        raise TTSError(
            503,
            "VOICE_TTS_DISABLED",
            "Server Text-to-Speech is disabled in configuration.",
            {"browserFallbackAllowed": True},
        )

    cleaned_text = preprocess_tts_text(text)
    if not cleaned_text:
        raise TTSError(422, "EMPTY_TTS_TEXT", "Text to synthesize cannot be empty.")

    lang_entry = resolve_language(language or "en")
    if not lang_entry:
        raise TTSError(
            422,
            "UNSUPPORTED_LANGUAGE",
            f"Language '{language}' is not recognized in the JanSetu AI registry.",
        )

    piper_voices = lang_entry.get("piperVoices") or []
    if not piper_voices:
        raise TTSError(
            422,
            "TTS_VOICE_UNAVAILABLE",
            f"No local neural voice is available for {lang_entry['name']}. JanSetu AI will never silently speak {lang_entry['name']} using an unrelated language.",
            {
                "languageCode": lang_entry["code"],
                "languageName": lang_entry["name"],
                "browserFallbackAllowed": True,
            },
        )

    selected_voice = piper_voices[0]
    if voice_id:
        match = next((v for v in piper_voices if v["id"] == voice_id), None)
        if not match:
            raise TTSError(
                422,
                "INVALID_VOICE_ID",
                f"Voice '{voice_id}' is not registered for {lang_entry['name']}.",
            )
        selected_voice = match

    voice = _get_piper_voice(selected_voice)
    length_scale = round(max(0.5, min(1.6, 1.0 / max(0.5, speed))), 3)

    tmp_wav = None
    try:
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp_wav = tmp.name

        with wave.open(tmp_wav, "wb") as wav_file:
            # Compatibility across piper-tts v1.3..v1.8 synthesize_wav / synthesize signatures
            if hasattr(voice, "synthesize_wav"):
                syn_cfg = None
                try:
                    from piper.config import SynthesisConfig

                    syn_cfg = SynthesisConfig(length_scale=length_scale)
                except Exception:
                    syn_cfg = None

                sig = inspect.signature(voice.synthesize_wav)
                if syn_cfg is not None and "syn_config" in sig.parameters:
                    voice.synthesize_wav(cleaned_text, wav_file, syn_config=syn_cfg)
                else:
                    voice.synthesize_wav(cleaned_text, wav_file)
            else:
                sig = inspect.signature(voice.synthesize)
                if "length_scale" in sig.parameters:
                    voice.synthesize(cleaned_text, wav_file, length_scale=length_scale)
                else:
                    voice.synthesize(cleaned_text, wav_file)

        with open(tmp_wav, "rb") as rf:
            wav_bytes = rf.read()

        if len(wav_bytes) <= 44:
            raise TTSError(500, "TTS_EMPTY_OUTPUT", "Generated audio output was unexpectedly empty.")

        sample_rate = getattr(getattr(voice, "config", None), "sample_rate", 22050)
        return wav_bytes, {
            "provider": "piper-tts",
            "voiceId": selected_voice["id"],
            "voiceLabel": selected_voice["label"],
            "languageCode": lang_entry["code"],
            "languageName": lang_entry["name"],
            "sampleRate": str(sample_rate),
        }
    finally:
        if tmp_wav and os.path.exists(tmp_wav):
            try:
                os.unlink(tmp_wav)
            except OSError:
                pass
