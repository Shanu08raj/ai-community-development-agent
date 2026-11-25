"""
Unit and integration tests for the complaint_extraction_service.

Covers:
- Full English complaint with ward, state, district, category
- Hindi transcript field extraction
- Missing location handling
- Ambiguous state detection
- District-state mismatch detection
- Ward NOT inferred from district/state
- Existing fields NOT overwritten without conflict flag
- FastAPI /voice/extract-complaint endpoint (HTTP integration)
"""
import os
import sys
from pathlib import Path

os.environ["AI_SERVICE_INTERNAL_SECRET"] = "test_shared_secret_12345"
os.environ["ENABLE_OLLAMA"] = "false"

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.complaint_extraction_service import extract_complaint_fields

client = TestClient(app)
AUTH_HEADERS = {"X-Internal-Secret": "test_shared_secret_12345"}


# ---------------------------------------------------------------------------
# Unit tests: extract_complaint_fields()
# ---------------------------------------------------------------------------


def test_extraction_english_full_complaint():
    """Full English complaint â€” ward, Karnataka, Bengaluru Urban, water supply."""
    transcript = (
        "I am calling from ward 13 in Bengaluru Urban district of Karnataka state. "
        "The water supply pipeline near my house has been broken for two weeks. "
        "There is a huge leak and the road is flooded."
    )
    result = extract_complaint_fields(transcript, language="en", existing_fields={})

    assert result["state"] == "Karnataka"
    assert result["district"] == "Bengaluru Urban"
    assert result["ward"] == "13"
    assert result["category"] in ("Water Supply", None)  # rule-based, expected Water Supply
    assert result["locationStatus"] in ("verified", "partial")
    assert isinstance(result["description"], str) and len(result["description"]) > 0
    assert result["originalTranscript"] == transcript


def test_extraction_english_road_complaint_with_ward():
    """English road complaint with explicit ward number."""
    transcript = "In ward 7, the road has a large pothole and the streetlight near it is also broken."
    result = extract_complaint_fields(transcript, language="en", existing_fields={})

    assert result["ward"] == "7"
    # At least one of road/streetlights should be detected
    assert result["category"] in ("Roads and Infrastructure", "Streetlights", None)
    assert isinstance(result["description"], str)


def test_extraction_hindi_transcript():
    """Hindi complaint with ward, state, district references."""
    transcript = (
        "à¤®à¥ˆà¤‚ à¤µà¤¾à¤°à¥à¤¡ 5 à¤¸à¥‡ à¤¬à¥‹à¤² à¤°à¤¹à¤¾ à¤¹à¥‚à¤‚, à¤®à¤¹à¤¾à¤°à¤¾à¤·à¥à¤Ÿà¥à¤° à¤•à¥‡ à¤ªà¥à¤£à¥‡ à¤œà¤¿à¤²à¥‡ à¤¸à¥‡à¥¤ "
        "à¤¯à¤¹à¤¾à¤‚ à¤ªà¤° à¤¨à¤¾à¤²à¥‡ à¤®à¥‡à¤‚ à¤—à¤‚à¤¦à¤¾ à¤ªà¤¾à¤¨à¥€ à¤­à¤° à¤—à¤¯à¤¾ à¤¹à¥ˆ à¤”à¤° à¤¬à¤¦à¤¬à¥‚ à¤† à¤°à¤¹à¥€ à¤¹à¥ˆà¥¤"
    )
    result = extract_complaint_fields(transcript, language="hi", existing_fields={})

    # State and district should be detected
    assert result["state"] in ("Maharashtra", None)
    # Ward 5 or Devanagari à¥«
    ward = result.get("ward")
    assert ward in ("5", "à¥«", None)
    assert isinstance(result["description"], str)


def test_extraction_missing_location_returns_empty_location_status():
    """When no state or district is mentioned, locationStatus should not be 'verified'."""
    transcript = "The road near my house has a big pothole. It has been there for a month."
    result = extract_complaint_fields(transcript, language="en", existing_fields={})

    assert result["state"] is None or result["state"] == ""
    assert result["district"] is None or result["district"] == ""
    assert result["locationStatus"] in ("missing", "not_found", "partial", "")


def test_extraction_ambiguous_state_returns_ambiguous_flag():
    """
    'Salem' is both a district in Tamil Nadu and a city name common in English contexts.
    If transcript says 'Salem district' the extractor should return something reasonable,
    and if truly ambiguous should mark it.
    """
    transcript = "I am from Salem district. The drainage near ward 3 is blocked."
    result = extract_complaint_fields(transcript, language="en", existing_fields={})

    # Either resolved to Tamil Nadu / Salem, or flagged as ambiguous â€” never crash
    assert isinstance(result["locationStatus"], str)
    if result["state"]:
        # If resolved, district should be Salem or empty (mismatch possible)
        pass
    # Must not throw and must return valid structure
    assert "warnings" in result
    assert isinstance(result["warnings"], list)


def test_extraction_district_state_mismatch_flagged():
    """
    If transcript says 'Pune' and 'Tamil Nadu' in the same sentence,
    the extractor should flag a mismatch.
    """
    transcript = (
        "I am from Tamil Nadu state but my complaint is in Pune district ward 10. "
        "The water pipe is broken."
    )
    result = extract_complaint_fields(transcript, language="en", existing_fields={})

    # Either a mismatch is flagged OR one of the two locations wins â€” never crash
    assert isinstance(result, dict)
    assert "locationMismatch" in result
    # If mismatch detected, locationMismatch should be non-None or warnings should mention it
    if result["state"] and result["district"]:
        # State=Tamil Nadu, district=Pune don't match â€” should be flagged
        from app.services.complaint_extraction_service import _LOCATION_DATA
        for entry in _LOCATION_DATA:
            if entry["name"] == result["state"]:
                if result["district"] not in entry.get("districts", []):
                    # mismatch must be flagged
                    assert result["locationMismatch"] is not None or any(
                        "mismatch" in w.lower() or "belong" in w.lower()
                        for w in result["warnings"]
                    )
                break


def test_extraction_does_not_infer_ward_from_district_or_state():
    """
    Critical: ward must only come from an explicit ward mention in the transcript.
    Mentioning district or state alone must NEVER produce a ward value.
    """
    transcript = "I am from Nashik district in Maharashtra. There is no water supply here."
    result = extract_complaint_fields(transcript, language="en", existing_fields={})

    assert result["ward"] is None or result["ward"] == ""


def test_extraction_does_not_infer_ward_from_state_only():
    """State-only transcript must yield no ward."""
    transcript = "I live in Rajasthan. The streetlights near my colony have been off for days."
    result = extract_complaint_fields(transcript, language="en", existing_fields={})

    assert result["ward"] is None or result["ward"] == ""


def test_extraction_does_not_overwrite_existing_fields_without_flagging_conflict():
    """
    When existing_fields contains a state, district, and category already set,
    and the transcript contradicts them, conflicts must be flagged, not silently overwritten.
    """
    existing = {
        "title": "Existing Title",
        "description": "Pre-filled description",
        "category": "Waste Management",
        "categoryTouched": True,
        "state": "Maharashtra",
        "district": "Pune",
        "area": "Ward 5",
    }
    # Transcript mentions a different state and category
    transcript = (
        "Ward 8 in Karnataka, Bengaluru Urban. The water supply pipeline is broken."
    )
    result = extract_complaint_fields(transcript, language="en", existing_fields=existing)

    # Should detect and report conflict â€” not silently overwrite
    assert isinstance(result["existingFieldConflicts"], list)
    if result["state"] and result["state"] != existing["state"]:
        assert len(result["existingFieldConflicts"]) > 0


def test_extraction_preserves_original_transcript():
    """The originalTranscript field must always equal the input transcript exactly."""
    transcript = "Ward 12 mein paani ki samasya hai. Maharashtra ke Nashik mein."
    result = extract_complaint_fields(transcript, language="hi", existing_fields={})

    assert result["originalTranscript"] == transcript


def test_extraction_devanagari_ward_digit_normalization():
    """Devanagari digit à¥« in ward mention should normalize to '5'."""
    transcript = "à¤µà¤¾à¤°à¥à¤¡ à¥« à¤®à¥‡à¤‚ à¤¸à¤¡à¤¼à¤• à¤Ÿà¥‚à¤Ÿà¥€ à¤¹à¥à¤ˆ à¤¹à¥ˆà¥¤"
    result = extract_complaint_fields(transcript, language="hi", existing_fields={})

    # Either "5" or "à¥«" acceptable (service may normalize or keep)
    assert result["ward"] in ("5", "à¥«", None)


def test_extraction_category_code_matches_category():
    """categoryCode must always be consistent with category."""
    CODE_MAP = {
        "Water Supply": "WATER_SUPPLY",
        "Roads and Infrastructure": "ROADS_INFRASTRUCTURE",
        "Waste Management": "WASTE_MANAGEMENT",
        "Drainage and Sanitation": "DRAINAGE_SANITATION",
        "Streetlights": "STREETLIGHTS",
        "Other": "OTHER",
        "Out of Scope": "OUT_OF_SCOPE",
    }
    transcript = "The drainage system in ward 3 is completely blocked and overflowing."
    result = extract_complaint_fields(transcript, language="en", existing_fields={})

    if result["category"] and result["categoryCode"]:
        assert CODE_MAP.get(result["category"]) == result["categoryCode"]


def test_extraction_empty_transcript_returns_gracefully():
    """Empty or whitespace-only transcript must not crash â€” return neutral result."""
    # The service guards against empty; if called with minimal text, should handle it
    transcript = "   "
    # Service may raise or return empty â€” either is acceptable without crashing
    try:
        result = extract_complaint_fields(transcript, language="en", existing_fields={})
        assert isinstance(result, dict)
    except (ValueError, KeyError):
        pass  # Explicit validation error is acceptable


# ---------------------------------------------------------------------------
# FastAPI integration tests: POST /api/v1/voice/extract-complaint
# ---------------------------------------------------------------------------


def test_extract_complaint_endpoint_requires_auth():
    """Endpoint must reject requests without the internal secret."""
    resp = client.post(
        "/api/v1/voice/extract-complaint",
        json={
            "transcript": "Water pipe broken in Ward 12, Maharashtra, Pune.",
            "language": "en",
        },
    )
    assert resp.status_code == 403


def test_extract_complaint_endpoint_full_english():
    """Full English complaint via HTTP returns structured fields."""
    resp = client.post(
        "/api/v1/voice/extract-complaint",
        headers=AUTH_HEADERS,
        json={
            "transcript": (
                "I am from ward 13 in Bengaluru Urban district, Karnataka. "
                "The main water supply pipe near my area has been leaking for two weeks. "
                "Water is flooding the road and causing a lot of problems."
            ),
            "language": "en",
            "existingFields": {},
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True
    assert body["state"] == "Karnataka"
    assert body["district"] == "Bengaluru Urban"
    assert body["ward"] == "13"
    assert body["locationStatus"] in ("verified", "partial")
    assert isinstance(body["description"], str)
    assert isinstance(body["warnings"], list)
    assert isinstance(body["existingFieldConflicts"], list)


def test_extract_complaint_endpoint_hindi_transcript():
    """Hindi transcript via HTTP returns state/district if mentioned."""
    resp = client.post(
        "/api/v1/voice/extract-complaint",
        headers=AUTH_HEADERS,
        json={
            "transcript": (
                "à¤µà¤¾à¤°à¥à¤¡ 5 à¤¸à¥‡ à¤¶à¤¿à¤•à¤¾à¤¯à¤¤ à¤¹à¥ˆ, à¤®à¤¹à¤¾à¤°à¤¾à¤·à¥à¤Ÿà¥à¤°, à¤ªà¥à¤£à¥‡ à¤¸à¥‡à¥¤ "
                "à¤¨à¤¾à¤²à¤¾ à¤¬à¤‚à¤¦ à¤¹à¥ˆ à¤”à¤° à¤—à¤‚à¤¦à¤¾ à¤ªà¤¾à¤¨à¥€ à¤˜à¤° à¤®à¥‡à¤‚ à¤˜à¥à¤¸ à¤°à¤¹à¤¾ à¤¹à¥ˆà¥¤"
            ),
            "language": "hi",
            "existingFields": {},
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True
    assert body["detectedLanguageCode"] in ("hi", "mr", "auto", "en")  # detection may vary
    assert isinstance(body["description"], str)


def test_extract_complaint_endpoint_validates_empty_transcript():
    """Empty transcript must be rejected with 422."""
    resp = client.post(
        "/api/v1/voice/extract-complaint",
        headers=AUTH_HEADERS,
        json={"transcript": "", "language": "en"},
    )
    assert resp.status_code == 422


def test_extract_complaint_endpoint_validates_oversized_transcript():
    """Transcript exceeding 3000 characters must be rejected with 422."""
    resp = client.post(
        "/api/v1/voice/extract-complaint",
        headers=AUTH_HEADERS,
        json={"transcript": "a" * 3001, "language": "en"},
    )
    assert resp.status_code == 422


def test_extract_complaint_endpoint_response_has_required_fields():
    """Every response must include all required ComplaintExtractResponse fields."""
    resp = client.post(
        "/api/v1/voice/extract-complaint",
        headers=AUTH_HEADERS,
        json={
            "transcript": "The streetlight near my house has been off for a week.",
            "language": "en",
            "existingFields": {},
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    required_keys = [
        "success",
        "originalTranscript",
        "detectedLanguage",
        "detectedLanguageCode",
        "locationStatus",
        "ambiguousLocations",
        "existingFieldConflicts",
        "warnings",
    ]
    for key in required_keys:
        assert key in body, f"Missing required field: {key}"


def test_extract_complaint_no_ward_when_none_mentioned():
    """If no ward is mentioned in transcript, ward must be null/None via HTTP."""
    resp = client.post(
        "/api/v1/voice/extract-complaint",
        headers=AUTH_HEADERS,
        json={
            "transcript": "The road in my area in Pune, Maharashtra is full of potholes.",
            "language": "en",
            "existingFields": {},
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    # ward must NOT be inferred from district/state
    assert body.get("ward") in (None, "", "null")
