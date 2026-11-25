import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(BASE_DIR / ".env")


class VoiceSettings:
    ENABLE_VOICE_STT: bool = os.getenv("ENABLE_VOICE_STT", "true").lower() == "true"
    ENABLE_VOICE_TTS: bool = os.getenv("ENABLE_VOICE_TTS", "true").lower() == "true"
    WHISPER_MODEL_SIZE: str = os.getenv("WHISPER_MODEL_SIZE", "base").strip() or "base"
    WHISPER_DEVICE: str = os.getenv("WHISPER_DEVICE", "cpu").strip() or "cpu"
    WHISPER_COMPUTE_TYPE: str = os.getenv("WHISPER_COMPUTE_TYPE", "int8").strip() or "int8"

    VOICE_MODELS_DIR: Path = Path(
        os.getenv("VOICE_MODELS_DIR", str(BASE_DIR / "models" / "voice"))
    )
    PIPER_VOICES_DIR: Path = VOICE_MODELS_DIR / "piper"
    PIPER_AUTO_DOWNLOAD: bool = os.getenv("PIPER_AUTO_DOWNLOAD", "false").lower() == "true"

    MAX_AUDIO_BYTES: int = int(os.getenv("VOICE_MAX_AUDIO_BYTES", str(10 * 1024 * 1024)))
    MAX_AUDIO_DURATION_SECONDS: float = float(os.getenv("VOICE_MAX_AUDIO_SECONDS", "120"))
    MAX_TTS_TEXT_LENGTH: int = int(os.getenv("VOICE_MAX_TTS_CHARS", "1500"))

    # Optional Bhashini ULCA / Dhruva integration (disabled unless registered credentials are supplied)
    ENABLE_BHASHINI: bool = os.getenv("ENABLE_BHASHINI", "false").lower() == "true"
    BHASHINI_USER_ID: str = os.getenv("BHASHINI_USER_ID", "").strip()
    BHASHINI_ULCA_API_KEY: str = os.getenv("BHASHINI_ULCA_API_KEY", "").strip()
    BHASHINI_INFERENCE_KEY: str = os.getenv("BHASHINI_INFERENCE_KEY", "").strip()
    BHASHINI_CONFIG_URL: str = os.getenv(
        "BHASHINI_CONFIG_URL",
        "https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline",
    )
    BHASHINI_INFERENCE_URL: str = os.getenv(
        "BHASHINI_INFERENCE_URL",
        "https://dhruva-api.bhashini.gov.in/services/inference/pipeline",
    )


voice_settings = VoiceSettings()
