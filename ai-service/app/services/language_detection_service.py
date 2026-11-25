import re
from typing import Dict, Optional
from app.core.constants import SUPPORTED_LANGUAGES

MARATHI_CUES = ["आहे", "नाही", "खड्डा", "रस्त्यावर", "पाणी", "दुचाकी", "करा", "जवळ", "गळती", "रस्ता", "खचला"]
NEPALI_CUES = ["छैन", "छ", "गर्नुहोस्", "बाटो", "सडक", "खानेपानी", "नेपाली", "भएको", "होला"]
SANSKRIT_CUES = ["अस्ति", "नास्ति", "सन्ति", "भवति", "कृपया", "मार्गः", "जलम्"]
MAITHILI_CUES = ["अछि", "छै", "हमर", "मैथिली", "नहि"]
KONKANI_CUES = ["आसा", "कोंकणी", "नाका", "रस्तो"]
BODO_CUES = ["बड़ो", "आरो", "दं", "गैया"]
DOGRI_CUES = ["डोगरी", "ते", "ऐ", "नेईं"]
BENGALI_CUES = ["আছে", "হয়েছে", "রাস্তা", "জল", "সমস্যা", "দয়া", "নর্দমা", "আবর্জনা"]
ASSAMESE_EXTRA_CHARS = ("ৰ", "ৱ")
SINDHI_URDU_DISTINCTION = ("ٺ", "ٻ", "ڳ", "سنڌي", "پاڻي")
KASHMIRI_DISTINCTION = ("کٲشُر", "ۄ", "ژ")

HINGLISH_CUES = ["paani", "sadak", "gaddha", "kachra", "naali", "batti", "hai", "nahi", "karo", "jaldi"]
ENGLISH_COMMON = {
    "water", "road", "pothole", "garbage", "drain", "sewage", "light", "street",
    "near", "broken", "leak", "leaking", "days", "overflow", "supply", "trash",
    "pipe", "wire", "school", "hospital", "police", "market", "block", "ward",
    "help", "need", "issue", "problem", "waterlog", "flood", "smell", "dark",
    "not", "working", "from", "since", "severe", "urgent", "dirty", "contaminated",
    "please", "tap", "manhole", "alley", "outside", "park", "wall", "land", "pension",
}


def detect_text_language(text: str, declared_language: Optional[str] = None) -> Dict[str, object]:
    combined = (text or "").strip()
    declared = (declared_language or "").strip()
    declared_low = declared.lower()

    code = "und"
    conf = 40

    if re.search(r"[\u0B80-\u0BFF]", combined):
        code, conf = "ta", 94
    elif re.search(r"[\u0C80-\u0CFF]", combined):
        code, conf = "kn", 82
    elif re.search(r"[\u0C00-\u0C7F]", combined):
        code, conf = "te", 82
    elif re.search(r"[\u0D00-\u0D7F]", combined):
        code, conf = "ml", 82
    elif re.search(r"[\u0A80-\u0AFF]", combined):
        code, conf = "gu", 82
    elif re.search(r"[\u0A00-\u0A7F]", combined):
        code, conf = "pa", 82
    elif re.search(r"[\u0B00-\u0B7F]", combined):
        code, conf = "or", 82
    elif re.search(r"[\u1C50-\u1C7F]", combined):
        code, conf = "sat", 82
    elif re.search(r"[\uABC0-\uABFF]", combined):
        code, conf = "mni", 80
    elif re.search(r"[\u0980-\u09FF]", combined):
        if any(ch in combined for ch in ASSAMESE_EXTRA_CHARS) or declared_low == "assamese":
            code, conf = "as", 82
        elif "manipuri" in declared_low:
            code, conf = "mni", 78
        elif declared_low == "bengali" or any(cue in combined for cue in BENGALI_CUES):
            code, conf = "bn", 82
        else:
            code, conf = "as", 68
    elif re.search(r"[\u0600-\u06FF]", combined):
        if any(ch in combined for ch in KASHMIRI_DISTINCTION) or declared_low == "kashmiri":
            code, conf = "ks", 80
        elif any(ch in combined for ch in SINDHI_URDU_DISTINCTION) or declared_low == "sindhi":
            code, conf = "sd", 80
        else:
            code, conf = "ur", 84
    elif re.search(r"[\u0900-\u097F]", combined):
        # Discriminate Devanagari languages cleanly instead of collapsing all to Hindi
        marathi_hits = sum(1 for cue in MARATHI_CUES if cue in combined)
        nepali_hits = sum(1 for cue in NEPALI_CUES if cue in combined)
        sanskrit_hits = sum(1 for cue in SANSKRIT_CUES if cue in combined)
        maithili_hits = sum(1 for cue in MAITHILI_CUES if cue in combined)
        konkani_hits = sum(1 for cue in KONKANI_CUES if cue in combined)

        if declared_low == "marathi" or marathi_hits >= 1:
            code, conf = "mr", 94
        elif declared_low == "nepali" or nepali_hits >= 2:
            code, conf = "ne", 84
        elif declared_low == "sanskrit" or sanskrit_hits >= 2:
            code, conf = "sa", 82
        elif declared_low == "maithili" or maithili_hits >= 2:
            code, conf = "mai", 80
        elif declared_low == "konkani" or konkani_hits >= 2:
            code, conf = "kok", 80
        elif declared_low == "bodo" or any(cue in combined for cue in BODO_CUES):
            code, conf = "brx", 78
        elif declared_low == "dogri" or any(cue in combined for cue in DOGRI_CUES):
            code, conf = "doi", 78
        elif declared_low == "kashmiri":
            code, conf = "ks", 76
        elif declared_low == "sindhi":
            code, conf = "sd", 76
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
        elif english_hits == 1 and len(tokens) <= 6 and declared_low == "english":
            code, conf = "en", 65
        else:
            code, conf = "und", 35

    if code in SUPPORTED_LANGUAGES:
        lang_meta = SUPPORTED_LANGUAGES[code]
        lang_name = lang_meta["name"]
        mode = lang_meta["mode"]
        rtl = bool(lang_meta.get("rtl", False))
    else:
        lang_name = "Undetermined"
        mode = "manual_review_fallback"
        rtl = False

    return {
        "detectedLanguage": lang_name,
        "detectedLanguageCode": code,
        "languageConfidence": conf,
        "languageProcessingMode": mode,
        "rtl": rtl,
    }
