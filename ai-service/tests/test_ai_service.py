import os
import sys
from pathlib import Path

os.environ["AI_SERVICE_INTERNAL_SECRET"] = "test_shared_secret_12345"
os.environ["ENABLE_OLLAMA"] = "false"

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi.testclient import TestClient
from app.main import app
from app.agents.nodes.language_node import language_detection_node
from app.agents.nodes.understanding_node import complaint_understanding_node
from app.agents.nodes.pii_node import pii_scrubbing_node
from app.agents.nodes.scope_node import out_of_scope_detection_node
from app.agents.nodes.category_node import category_classification_node
from app.agents.nodes.priority_node import priority_assessment_node
from app.agents.nodes.clustering_node import clustering_node
from app.agents.nodes.authority_node import authority_recommendation_node
from app.agents.nodes.validator_node import structured_output_validation_node
from app.agents.nodes.formatter_node import final_result_node
from app.agents.workflows.complaint_graph import run_complaint_analysis

client = TestClient(app)
AUTH_HEADERS = {"X-Internal-Secret": "test_shared_secret_12345"}


def test_health_endpoint():
    resp = client.get("/api/v1/ai/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True
    assert body["defaultEngine"] == "rule-fallback"
    assert body["ollamaEnabled"] is False


def test_internal_secret_enforced():
    payload = {
        "complaintId": "JS-2026-9001",
        "title": "Water pipeline leaking on street",
        "description": "Continuous clean water leakage near junction for two days.",
        "ward": "Ward 12",
    }
    resp_missing = client.post("/api/v1/ai/analyze-complaint", json=payload)
    assert resp_missing.status_code == 403

    resp_wrong = client.post(
        "/api/v1/ai/analyze-complaint",
        json=payload,
        headers={"X-Internal-Secret": "wrong-secret"},
    )
    assert resp_wrong.status_code == 403


def test_node1_language_detection_all_eight_and_uncertain():
    cases = [
        ("Broken water pipeline leaking", "Clean tap water wasting on street since yesterday.", "English", "en", "implemented_lexicon"),
        ("पानी की पाइपलाइन टूटी है", "गली में तीन दिन से गंदा पानी बह रहा है।", "Hindi", "hi", "implemented_lexicon"),
        ("मुख्य रस्त्यावर मोठा खड्डा आहे", "दुचाकी घसरून पडली आहे तातडीने दुरुस्ती करा.", "Marathi", "mr", "implemented_lexicon"),
        ("தெருவிளக்கு எரியவில்லை", "இரவில் சாலை மிகவும் இருட்டாக உள்ளது.", "Tamil", "ta", "implemented_lexicon"),
        ("ನೀರಿನ ಪೈಪ್ ಒಡೆದಿದೆ", "ರಸ್ತೆಯಲ್ಲಿ ನೀರು ಹರಿಯುತ್ತಿದೆ.", "Kannada", "kn", "script_heuristic_fallback"),
        ("వీధి దీపాలు వెలగడం లేదు", "రాత్రి సమయంలో చాలా చీకటిగా ఉంది.", "Telugu", "te", "script_heuristic_fallback"),
        ("ৰাস্তাত ডাঙৰ গাঁত হৈছে", "যাতায়তত বৰ অসুবিধা হৈছে।", "Assamese", "as", "script_heuristic_fallback"),
        ("ꯂꯝꯕꯤ ꯁꯣꯛꯂꯦ", "ꯏꯁꯤꯡ ꯆꯦꯜꯂꯤ꯫", "Manipuri (Meitei)", "mni", "script_heuristic_fallback"),
        ("xyzqwk mnbvcx", "plmokn ijbuhv ygvtfc", "English", "und", "manual_review_fallback"),
    ]

    for title, desc, declared, expected_code, expected_mode in cases:
        out = language_detection_node({
            "rawTitle": title,
            "rawDescription": desc,
            "declaredLanguage": declared,
        })
        assert out["detectedLanguageCode"] == expected_code
        assert out["languageProcessingMode"] == expected_mode
        # Raw text never mutated
        assert out["normalizedTitle"] == title
        assert out["normalizedDescription"] == desc


def test_node2_and_node3_understanding_and_pii_scrubbing():
    title = "Water pipe burst near Model School"
    desc = "My name is Ramesh Patil, contact 9876543210, Aadhaar 1234 5678 9012, email ramesh@example.com for 4 days."

    u_out = complaint_understanding_node({"rawTitle": title, "rawDescription": desc})
    assert u_out["problemDuration"] == "for 4 days"
    assert any("Model School" in lm for lm in u_out["extractedLandmarks"])

    p_out = pii_scrubbing_node({"rawTitle": title, "rawDescription": desc})
    assert "[PHONE_REDACTED]" in p_out["redactedDescription"]
    assert "[AADHAAR_REDACTED]" in p_out["redactedDescription"]
    assert "[EMAIL_REDACTED]" in p_out["redactedDescription"]
    assert "[CITIZEN_NAME]" in p_out["redactedDescription"]
    assert "9876543210" not in p_out["redactedDescription"]
    assert p_out["piiItemsMasked"] >= 4


def test_node4_out_of_scope_and_112_emergency_guidance():
    # Emergency police scenario
    emg = out_of_scope_detection_node({
        "redactedTitle": "Robbery and knife fight on Market Road",
        "redactedDescription": "People with weapons attacking shops, need police immediately.",
    })
    assert emg["isOutOfScope"] is True
    assert emg["classifiedCategory"] == "Out of Scope"
    assert emg["priority"] == "High"
    assert "112" in (emg["emergencyGuidance"] or "")
    assert emg["recommendedAuthority"] is None

    # Non-emergency excluded domain (Land dispute)
    oos = out_of_scope_detection_node({
        "redactedTitle": "Ancestral land dispute with neighbor",
        "redactedDescription": "Need help resolving boundary encroachment case on private plot.",
    })
    assert oos["isOutOfScope"] is True
    assert oos["outOfScopeCategory"] == "Land/Property Dispute"
    assert oos["emergencyGuidance"] is None


def test_node5_node6_category_and_priority_rules():
    cat_out = category_classification_node({
        "redactedTitle": "Sewage drain overflow near school",
        "redactedDescription": "Clogged gutter causing black water stagnation for 3 days.",
        "submittedCategory": "Water Supply",
        "detectedLanguage": "English",
        "languageProcessingMode": "implemented_lexicon",
    })
    assert cat_out["classifiedCategory"] == "Drainage and Sanitation"
    assert cat_out["categoryConfidence"] >= 75
    assert "differing from citizen-selected" in cat_out["categoryReason"]

    prio_out = priority_assessment_node({
        "redactedTitle": "Sewage overflow near school gate",
        "redactedDescription": "Severe flooding risking student safety and accident.",
        "languageProcessingMode": "implemented_lexicon",
    })
    assert prio_out["priority"] == "High"
    assert prio_out["priorityScore"] >= 80


def test_node7_clustering_and_node8_authority():
    clusters = [
        {
            "id": "CI-101",
            "title": "Severe low water pressure and contaminated supply in Ward 12",
            "category": "Water Supply",
            "area": "Ward 12, North Zone",
            "summary": "Tap water contaminated and muddy with low pressure.",
        }
    ]
    c_match = clustering_node({
        "classifiedCategory": "Water Supply",
        "ward": "Ward 12",
        "redactedTitle": "Contaminated tap water and low pressure",
        "redactedDescription": "Muddy drinking water in Block B",
        "existingClusters": clusters,
    })
    assert c_match["isDuplicate"] is True
    assert c_match["suggestedClusterId"] == "CI-101"

    # Different ward must NOT falsely cluster
    c_diff_ward = clustering_node({
        "classifiedCategory": "Water Supply",
        "ward": "Ward 99",
        "redactedTitle": "Contaminated tap water and low pressure",
        "redactedDescription": "Muddy drinking water",
        "existingClusters": clusters,
    })
    assert c_diff_ward["isDuplicate"] is False
    assert c_diff_ward["suggestedClusterId"] is None

    auth_out = authority_recommendation_node({"classifiedCategory": "Streetlights", "isOutOfScope": False})
    assert auth_out["recommendedAuthority"]["id"] == "AUTH-04"


def test_node9_validator_and_node10_formatter_handle_invalid_outputs():
    v_out = structured_output_validation_node({
        "classifiedCategory": "InvalidCat",
        "priority": "Extreme",
        "detectedLanguageCode": "xx",
        "categoryConfidence": 250,
        "languageConfidence": -10,
        "isOutOfScope": False,
        "languageProcessingMode": "implemented_lexicon",
        "engineUsed": "rule-fallback",
    })
    assert v_out["classifiedCategory"] == "Other"
    assert v_out["priority"] == "Medium"
    assert v_out["detectedLanguageCode"] == "und"
    assert v_out["categoryConfidence"] == 100
    assert v_out["languageConfidence"] == 0
    assert v_out["needsHumanReview"] is True
    assert v_out["engineUsed"] == "degraded-safe"

    f_out = final_result_node({**v_out, "complaintId": "JS-2026-9002", "redactedTitle": "Sample test"})
    assert f_out["finalResponse"]["success"] is True
    assert f_out["finalResponse"]["analysis"]["classifiedCategory"] == "Other"


def test_full_langgraph_pipeline_and_fastapi_endpoint():
    resp = client.post(
        "/api/v1/ai/analyze-complaint",
        headers=AUTH_HEADERS,
        json={
            "complaintId": "JS-2026-8909",
            "title": "Contaminated tap water and leaking pipeline near hospital",
            "description": "Dirty water flowing on road. Contact 9876543210 immediately.",
            "submittedCategory": "Water Supply",
            "ward": "Ward 12",
            "district": "Pune",
            "language": "English",
            "existingClusters": [
                {
                    "id": "CI-101",
                    "title": "Low water pressure and contaminated supply in Ward 12",
                    "category": "Water Supply",
                    "area": "Ward 12, North Zone",
                    "summary": "Contaminated tap water reports.",
                }
            ],
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert data["complaintId"] == "JS-2026-8909"
    assert data["analysis"]["classifiedCategory"] == "Water Supply"
    assert data["analysis"]["priority"] == "High"
    assert data["analysis"]["recommendedAuthority"]["id"] == "AUTH-01"
    assert data["analysis"]["suggestedClusterId"] == "CI-101"
    assert "[PHONE_REDACTED]" in data["analysis"]["sanitizedSummary"] or "9876543210" not in data["analysis"]["sanitizedSummary"]
    assert data["meta"]["engine"] == "rule-fallback"
    assert len(data["meta"]["stagesExecuted"]) == 10


def test_planned_language_triggers_safe_human_review_fallback():
    res = run_complaint_analysis(
        complaint_id="JS-2026-9015",
        title="ನೀರಿನ ಪೈಪ್ ಒಡೆದಿದೆ ರಸ್ತೆಯಲ್ಲಿ",
        description="ಕಳೆದ ಮೂರು ದಿನಗಳಿಂದ ಕುಡಿಯುವ ನೀರು ಪೋಲಾಗುತ್ತಿದೆ.",
        submitted_category="Water Supply",
        ward="Ward 4",
        declared_language="Kannada",
    )
    assert res["analysis"]["detectedLanguageCode"] == "kn"
    assert res["analysis"]["languageProcessingMode"] == "script_heuristic_fallback"
    assert res["analysis"]["needsHumanReview"] is True
    assert res["analysis"]["classifiedCategory"] == "Water Supply"
