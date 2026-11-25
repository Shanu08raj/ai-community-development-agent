import os
import struct
import sys
import wave
from pathlib import Path
from unittest.mock import patch

os.environ["AI_SERVICE_INTERNAL_SECRET"] = "test_shared_secret_12345"
os.environ["ENABLE_OLLAMA"] = "false"

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi.testclient import TestClient
from app.main import app
from app.services.language_detection_service import detect_text_language
from app.services.language_registry import LANGUAGE_CAPABILITIES, list_public_language_capabilities
from app.services.tts_service import preprocess_tts_text

client = TestClient(app)
AUTH_HEADERS = {"X-Internal-Secret": "test_shared_secret_12345"}


def make_test_wav(duration_sec: float = 0.5, sample_rate: int = 16000) -> bytes:
    """Create a synthetic valid RIFF/WAVE mono PCM audio buffer cleanly using stdlib."""
    import io
    buf = io.BytesIO()
    n_frames = int(duration_sec * sample_rate)
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(struct.pack("<" + "h" * n_frames, *([0] * n_frames)))
    return buf.getvalue()


def test_voice_languages_registry_covers_all_22_scheduled_plus_english():
    resp = client.get("/api/v1/voice/languages")
    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True
    langs = body["languages"]
    assert len(langs) == 23

    scheduled = [l for l in langs if l["scheduledEighth"]]
    assert len(scheduled) == 22

    by_code = {l["code"]: l for l in langs}
    for initial in ("en", "hi", "kn", "ta", "te", "mr", "as", "mni"):
        assert initial in by_code
        assert by_code[initial]["initialSupported"] is True

    # Honest capability transparency: Manipuri unsupported locally by Whisper
    assert by_code["mni"]["sttAvailable"] is False
    assert "typing" in by_code["mni"]["qualityStatus"]

    # Right-to-left scripts explicitly marked
    assert by_code["ur"]["rtl"] is True
    assert by_code["sd"]["rtl"] is True
    assert by_code["ks"]["rtl"] is True


def test_multilingual_script_and_devanagari_discrimination():
    assert detect_text_language("मुख्य रस्त्यावर मोठा खड्डा आहे तातडीने दुरुस्ती करा", "Marathi")["detectedLanguageCode"] == "mr"
    assert detect_text_language("वार्ड 12 में गंदा पानी आ रहा है कृपया जांच करें", "Hindi")["detectedLanguageCode"] == "hi"
    assert detect_text_language("यहाँ बाटो मर्मत गर्नुपर्छ छैन पानी", "Nepali")["detectedLanguageCode"] == "ne"
    assert detect_text_language("कृपया जलम् अस्ति मार्गः न सम्यक्", "Sanskrit")["detectedLanguageCode"] == "sa"
    assert detect_text_language("পাণীত কচৰা আৰু বাটত গাঁত ৰাস্তা", "Assamese")["detectedLanguageCode"] == "as"
    assert detect_text_language("রাস্তা খারাপ জল জমে আছে সমস্যা", "Bengali")["detectedLanguageCode"] == "bn"
    assert detect_text_language("પાણીની પાઈપ તૂટી ગઈ છે", "Gujarati")["detectedLanguageCode"] == "gu"
    assert detect_text_language("റോഡിൽ വലിയ കുഴി വെള്ളം കെട്ടിനിൽക്കുന്നു", "Malayalam")["detectedLanguageCode"] == "ml"
    assert detect_text_language("ਪਾਣੀ ਦੀ ਪਾਈਪ ਟੁੱਟੀ ਹੋਈ ਹੈ", "Punjabi")["detectedLanguageCode"] == "pa"
    assert detect_text_language("ରାସ୍ତାରେ ବଡ଼ ଗାତ ହୋଇଛି ପାଣି ଜମିଛି", "Odia")["detectedLanguageCode"] == "or"
    assert detect_text_language("وارڈ 12 میں گندا پانی آ رہا ہے", "Urdu")["detectedLanguageCode"] == "ur"
    assert detect_text_language("ᱥᱟᱱᱛᱟᱲᱤ ᱫᱟᱜ ᱰᱟᱦᱟᱨ", "Santali")["detectedLanguageCode"] == "sat"


def test_voice_endpoints_enforce_internal_secret():
    wav_bytes = make_test_wav()
    r1 = client.post("/api/v1/voice/transcribe", files={"audio": ("test.wav", wav_bytes, "audio/wav")})
    assert r1.status_code == 403

    r2 = client.post("/api/v1/voice/synthesize", json={"text": "Hello", "language": "en"})
    assert r2.status_code == 403


def test_stt_rejects_empty_invalid_oversized_and_unsupported_languages():
    # Empty recording (<64 bytes)
    empty_resp = client.post(
        "/api/v1/voice/transcribe",
        headers=AUTH_HEADERS,
        files={"audio": ("empty.wav", b"123", "audio/wav")},
        data={"language": "auto"},
    )
    assert empty_resp.status_code == 422
    assert empty_resp.json()["detail"]["code"] == "EMPTY_AUDIO_RECORDING"

    # Invalid format bytes
    bad_fmt = client.post(
        "/api/v1/voice/transcribe",
        headers=AUTH_HEADERS,
        files={"audio": ("bad.txt", b"not an audio buffer at all " * 10, "text/plain")},
        data={"language": "auto"},
    )
    assert bad_fmt.status_code == 422
    assert bad_fmt.json()["detail"]["code"] == "INVALID_AUDIO_FORMAT"

    # Unsupported language locally (Manipuri / Santali) -> honest error
    wav_bytes = make_test_wav()
    mni_resp = client.post(
        "/api/v1/voice/transcribe",
        headers=AUTH_HEADERS,
        files={"audio": ("voice.wav", wav_bytes, "audio/wav")},
        data={"language": "mni"},
    )
    assert mni_resp.status_code == 422
    assert mni_resp.json()["detail"]["code"] == "STT_LANGUAGE_UNSUPPORTED_LOCALLY"

    # Unknown language -> 422
    unk_resp = client.post(
        "/api/v1/voice/transcribe",
        headers=AUTH_HEADERS,
        files={"audio": ("voice.wav", wav_bytes, "audio/wav")},
        data={"language": "klingon"},
    )
    assert unk_resp.status_code == 422
    assert unk_resp.json()["detail"]["code"] == "UNSUPPORTED_LANGUAGE"


def test_tts_preprocess_validation_and_unavailable_language():
    assert preprocess_tts_text("Report JS-2026-8901 submitted") == "Report J S 2026 8 9 0 1 submitted"

    # Empty text rejected by Pydantic validation -> 422
    r_empty = client.post(
        "/api/v1/voice/synthesize",
        headers=AUTH_HEADERS,
        json={"text": "", "language": "en"},
    )
    assert r_empty.status_code == 422

    # Speed out of range rejected cleanly -> 422
    r_speed = client.post(
        "/api/v1/voice/synthesize",
        headers=AUTH_HEADERS,
        json={"text": "Hello", "language": "en", "speed": 5.0},
    )
    assert r_speed.status_code == 422

    # Tamil has no local Piper checkpoint -> explicit 422 with browserFallbackAllowed
    r_ta = client.post(
        "/api/v1/voice/synthesize",
        headers=AUTH_HEADERS,
        json={"text": "தெருவிளக்கு எரியவில்லை", "language": "ta"},
    )
    assert r_ta.status_code == 422
    detail = r_ta.json()["detail"]
    assert detail["code"] == "TTS_VOICE_UNAVAILABLE"
    assert detail["browserFallbackAllowed"] is True


def test_tts_and_stt_graceful_fallback_when_disabled():
    with patch("app.services.tts_service.voice_settings.ENABLE_VOICE_TTS", False):
        r_tts = client.post(
            "/api/v1/voice/synthesize",
            headers=AUTH_HEADERS,
            json={"text": "Test speech", "language": "en"},
        )
        assert r_tts.status_code == 503
        assert r_tts.json()["detail"]["code"] == "VOICE_TTS_DISABLED"

    with patch("app.services.stt_service.voice_settings.ENABLE_VOICE_STT", False):
        r_stt = client.post(
            "/api/v1/voice/transcribe",
            headers=AUTH_HEADERS,
            files={"audio": ("voice.wav", make_test_wav(), "audio/wav")},
            data={"language": "en"},
        )
        assert r_stt.status_code == 503
        assert r_stt.json()["detail"]["code"] == "VOICE_STT_DISABLED"


def test_language_capability_matrix_integrity():
    assert len(LANGUAGE_CAPABILITIES) == 23
    caps = list_public_language_capabilities()
    codes = [c["code"] for c in caps]
    assert len(set(codes)) == 23


def test_bhashini_optional_routing_fallback_when_enabled():
    import base64
    from unittest.mock import MagicMock

    mock_cfg_resp = MagicMock()
    mock_cfg_resp.raise_for_status = lambda: None
    mock_cfg_resp.json.return_value = {
        "pipelineResponseConfig": [{"config": [{"serviceId": "ai4bharat/conformer-mni-asr"}]}],
        "pipelineInferenceAPIEndPoint": {
            "callbackUrl": "https://dhruva-api.bhashini.gov.in/services/inference/pipeline",
            "inferenceApiKey": {"value": "mock-key"},
        },
    }
    mock_inf_resp = MagicMock()
    mock_inf_resp.raise_for_status = lambda: None
    mock_inf_resp.json.return_value = {
        "pipelineResponse": [
            {"output": [{"source": "ମୋ ଅଞ୍ଚଳରେ ପାଣି ସମସ୍ୟା"}], "audio": [{"audioContent": base64.b64encode(make_test_wav(0.2)).decode("ascii")}]}
        ]
    }

    mock_client = MagicMock()
    mock_client.__enter__.return_value = mock_client
    mock_client.post.side_effect = [mock_cfg_resp, mock_inf_resp, mock_cfg_resp, mock_inf_resp]

    with (
        patch("app.services.voice_provider_service.voice_settings.ENABLE_BHASHINI", True),
        patch("app.services.voice_provider_service.voice_settings.BHASHINI_USER_ID", "demo_user"),
        patch("app.services.voice_provider_service.voice_settings.BHASHINI_ULCA_API_KEY", "demo_ulca"),
        patch("app.services.voice_provider_service.httpx.Client", return_value=mock_client),
    ):
        r_stt = client.post(
            "/api/v1/voice/transcribe",
            headers=AUTH_HEADERS,
            files={"audio": ("odia.wav", make_test_wav(0.3), "audio/wav")},
            data={"language": "or"},
        )
        assert r_stt.status_code == 200
        assert r_stt.json()["provider"] == "bhashini-dhruva-optional"
        assert r_stt.json()["detectedLanguageCode"] == "or"

        r_tts = client.post(
            "/api/v1/voice/synthesize",
            headers=AUTH_HEADERS,
            json={"text": "ମୋ ଅଞ୍ଚଳରେ ପାଣି ସମସ୍ୟା", "language": "or"},
        )
        assert r_tts.status_code == 200
        assert r_tts.headers["X-Voice-Provider"] == "bhashini-dhruva-optional"
        assert r_tts.content[:4] == b"RIFF"


def test_real_local_piper_tts_and_whisper_base_roundtrip():
    import pytest
    from app.core.voice_config import voice_settings

    whisper_ready = (voice_settings.VOICE_MODELS_DIR / f"whisper-{voice_settings.WHISPER_MODEL_SIZE}" / "model.bin").exists()
    piper_ready = all(
        (voice_settings.PIPER_VOICES_DIR / f"{vid}.onnx").exists()
        for vid in ("en_US-lessac-medium", "hi_IN-rohan-medium", "mr_IN-google-medium", "te_IN-maya-medium")
    )
    if not (whisper_ready and piper_ready):
        pytest.skip("Local Piper sample voices or Whisper base checkpoint not present in CI")

    # 1. All 4 approved Piper sample voices synthesize valid RIFF WAV via FastAPI endpoint
    for code, text in [
        ("en", "Water supply pipe is leaking near Ward 12 primary school."),
        ("hi", "वार्ड 12 में पानी की मुख्य पाइपलाइन टूटी हुई है।"),
        ("mr", "प्रभाग 12 मधील मुख्य पाण्याची पाईपलाईन फुटली आहे."),
        ("te", "వార్డు 12 లోని నీటి పైపులైన్ పగిలిపోయింది."),
    ]:
        tts_resp = client.post(
            "/api/v1/voice/synthesize",
            headers=AUTH_HEADERS,
            json={"text": text, "language": code, "speed": 1.1},
        )
        assert tts_resp.status_code == 200
        assert tts_resp.headers["content-type"].startswith("audio/wav")
        assert tts_resp.content[:4] == b"RIFF"
        assert len(tts_resp.content) > 10000

        if code == "en":
            en_wav = tts_resp.content
        elif code == "hi":
            hi_wav = tts_resp.content

    # 2. Whisper base INT8 transcribes synthesized English speech back accurately via HTTP endpoint
    stt_en = client.post(
        "/api/v1/voice/transcribe",
        headers=AUTH_HEADERS,
        files={"audio": ("en.wav", en_wav, "audio/wav")},
        data={"language": "en"},
    )
    assert stt_en.status_code == 200
    en_data = stt_en.json()
    assert en_data["detectedLanguageCode"] == "en"
    assert "water" in en_data["transcript"].lower()
    assert "school" in en_data["transcript"].lower()

    # 3. Hindi check verifies Devanagari output on Whisper small OR honest script-drift warning on base
    stt_hi = client.post(
        "/api/v1/voice/transcribe",
        headers=AUTH_HEADERS,
        files={"audio": ("hi.wav", hi_wav, "audio/wav")},
        data={"language": "hi"},
    )
    assert stt_hi.status_code == 200
    hi_data = stt_hi.json()
    assert hi_data["detectedLanguageCode"] == "hi"
    assert hi_data["recommendHumanReview"] is True
    if "small" in hi_data["model"]:
        import re
        assert re.search(r"[\u0900-\u097F]", hi_data["transcript"])

    # 4. Pure silence audio safely returns empty without crashing Silero VAD
    sil_resp = client.post(
        "/api/v1/voice/transcribe",
        headers=AUTH_HEADERS,
        files={"audio": ("silence.wav", make_test_wav(0.6), "audio/wav")},
        data={"language": "auto"},
    )
    assert sil_resp.status_code == 200
    assert sil_resp.json()["qualityStatus"] == "empty"


def test_stt_explicit_language_and_script_drift_detection():
    from types import SimpleNamespace
    from unittest.mock import MagicMock

    mock_model = MagicMock()
    # Simulate Whisper emitting Perso-Arabic script when Hindi is requested -> must flag warning & human review
    mock_model.transcribe.return_value = (
        [SimpleNamespace(text="وارڈ 12 میں پانی بند ہے", avg_logprob=-0.45, no_speech_prob=0.05)],
        SimpleNamespace(language="ur", language_probability=0.92, duration=2.1),
    )

    with patch("app.services.stt_service._get_whisper_model", return_value=mock_model):
        resp = client.post(
            "/api/v1/voice/transcribe",
            headers=AUTH_HEADERS,
            files={"audio": ("hi.wav", make_test_wav(0.5), "audio/wav")},
            data={"language": "hi"},
        )
    assert resp.status_code == 200
    body = resp.json()
    assert body["detectedLanguageCode"] == "hi"
    assert body["recommendHumanReview"] is True
    assert any("native Hindi script" in w for w in body["warnings"])
    assert mock_model.transcribe.call_args.kwargs.get("language") == "hi"
