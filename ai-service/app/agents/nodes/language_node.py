import re
from typing import Dict
from app.core.constants import SUPPORTED_LANGUAGES
from app.agents.state import ComplaintAnalysisState

MARATHI_CUES = ["आहे", "नाही", "खड्डा", "रस्त्यावर", "पाणी", "दुचाकी", "करा", "जवळ", "गळती", "रस्ता"]
HINGLISH_CUES = ["paani", "sadak", "gaddha", "kachra", "naali", "batti", "hai", "nahi", "karo", "jaldi"]
ENGLISH_COMMON = {
    "water", "road", "pothole", "garbage", "drain", "sewage", "light", "street",
    "near", "broken", "leak", "leaking", "days", "overflow", "supply", "trash",
    "pipe", "wire", "school", "hospital", "police", "market", "block", "ward",
    "help", "need", "issue", "problem", "waterlog", "flood", "smell", "dark",
    "not", "working", "from", "since", "severe", "urgent", "dirty", "contaminated",
    "please", "tap", "manhole", "alley", "outside", "park", "wall", "land", "pension",
}


def language_detection_node(state: ComplaintAnalysisState) -> Dict:
    raw_title = state.get("rawTitle", "")
    raw_desc = state.get("rawDescription", "")
    combined = f"{raw_title} {raw_desc}"
    declared = (state.get("declaredLanguage") or "").strip()

    history = list(state.get("nodeExecutionHistory") or [])
    history.append("LanguageDetectionNode")

    code = "und"
    conf = 40

    # Script-based deterministic checks
    if re.search(r"[\u0B80-\u0BFF]", combined):
        code, conf = "ta", 94
    elif re.search(r"[\u0C80-\u0CFF]", combined):
        code, conf = "kn", 78
    elif re.search(r"[\u0C00-\u0C7F]", combined):
        code, conf = "te", 78
    elif re.search(r"[\uABC0-\uABFF]", combined):
        code, conf = "mni", 78
    elif re.search(r"[\u0980-\u09FF]", combined):
        if "ৰ" in combined or "ৱ" in combined or declared.lower() == "assamese":
            code, conf = "as", 78
        elif "manipuri" in declared.lower():
            code, conf = "mni", 76
        else:
            code, conf = "as", 68
    elif re.search(r"[\u0900-\u097F]", combined):
        marathi_hits = sum(1 for cue in MARATHI_CUES if cue in combined)
        if marathi_hits >= 1 or declared.lower() == "marathi":
            code, conf = "mr", 94
        else:
            code, conf = "hi", 94
    else:
        tokens = re.findall(r"[a-zA-Z]{2,}", combined.lower())
        hinglish_hits = sum(1 for cue in HINGLISH_CUES if cue in tokens)
        english_hits = sum(1 for tok in tokens if tok in ENGLISH_COMMON)

        if hinglish_hits >= 2:
            code, conf = "hi", 84
        elif english_hits >= 2:
            code, conf = "en", 95
        elif english_hits == 1 and len(tokens) <= 6 and declared.lower() == "english":
            code, conf = "en", 65
        else:
            code, conf = "und", 35

    if code in SUPPORTED_LANGUAGES:
        lang_meta = SUPPORTED_LANGUAGES[code]
        lang_name = lang_meta["name"]
        mode = lang_meta["mode"]
    else:
        lang_name = "Undetermined"
        mode = "manual_review_fallback"

    return {
        "detectedLanguage": lang_name,
        "detectedLanguageCode": code,
        "languageConfidence": conf,
        "languageProcessingMode": mode,
        "normalizedTitle": raw_title,
        "normalizedDescription": raw_desc,
        "nodeExecutionHistory": history,
    }
