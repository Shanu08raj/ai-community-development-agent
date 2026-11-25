import re
from typing import Dict, List, Optional, Tuple

CATEGORY_LEXICONS: Dict[str, List[str]] = {
    "Water Supply": [
        "water", "pipeline", "pipe", "leak", "leaking", "drinking", "tap water",
        "tanker", "water supply", "low pressure", "contaminated", "muddy water",
        "foul smell", "turbid", "valve", "overhead tank",
        "पानी", "पाइपलाइन", "पाइप", "रिसाव", "नल", "सप्लाई", "गंदा पानी", "टैंकर", "paani",
        "पाणी", "पाईपलाईन", "गळती", "नळ", "पाणीपुरवठा", "दूषित पाणी",
        "தண்ணீர்", "குழாய்", "கசிவு", "குடிநீர்",
    ],
    "Roads and Infrastructure": [
        "pothole", "potholes", "road", "crater", "divider", "asphalt", "tar",
        "speed breaker", "footpath", "pavement", "cave-in", "manhole cover",
        "broken road", "junction", "intersection",
        "गड्ढा", "गड्ढे", "सड़क", "रास्ता", "फुटपाथ", "gaddha", "sadak",
        "खड्डा", "रस्ता", "डांबर", "पदपथ", "दुचाकी", "रस्त्यावर", "खचला",
        "குழி", "சாலை", "நடைபாதை",
    ],
    "Waste Management": [
        "garbage", "trash", "dump", "dumpster", "bin", "waste", "debris",
        "litter", "sweeper", "uncollected", "landfill", "compost", "rubbish",
        "कचरा", "कूड़ा", "कूड़ेदान", "सफाई", "kachra", "kuda",
        "कचराकुंडी", "घाण",
        "குப்பை", "குப்பைத்தொட்டி",
    ],
    "Drainage and Sanitation": [
        "sewage", "drain", "drainage", "gutter", "overflow", "manhole",
        "clogged", "black water", "stormwater", "storm-drain", "stagnant",
        "backflow", "sanitation", "foul odor", "blocked drain",
        "नाली", "गटर", "सीवर", "उफान", "naali", "gatar",
        "गटार", "सांडपाणी", "नाली",
        "சாக்கடை", "கழிவுநீர்",
    ],
    "Streetlights": [
        "streetlight", "streetlights", "street light", "light", "lights",
        "lamp", "pole", "poles", "dark", "darkness", "bulb", "flickering",
        "non-operational", "unlit", "bypass light",
        "स्ट्रीट लाइट", "बत्ती", "खंभा", "अंधेरा", "batti", "andhera",
        "दिवाबत्ती", "खांब", "अंधार",
        "தெருவிளக்கு", "இருள்",
    ],
}

EMERGENCY_RULES = [
    (r"\b(police|robbery|theft|murder|stab|knife|gun|weapon|assault|kidnap|riot|fight|vandaliz\w*)\b", "Police / Law Enforcement"),
    (r"\b(ambulance|cardiac|heart attack|bleeding heavily|unconscious|stroke|medical emergency|dying|overdose)\b", "Medical Emergency"),
    (r"\b(fire brigade|house fire|building fire|explosion|gas cylinder blast|burning building)\b", "Fire Emergency"),
    (r"\b(domestic violence|abuse|suicide|self-harm)\b", "Emergency Safety"),
]

NON_EMERGENCY_OOS_RULES = [
    (r"\b(land dispute|property dispute|encroachment case|ancestral land|tenancy dispute|rent agreement|eviction)\b", "Land/Property Dispute", "Private property, tenancy, or land revenue disputes fall outside municipal civic service tracking."),
    (r"\b(pension|ration card|subsidy|welfare scheme|bpl card|scholarship|pmay|widow allowance)\b", "Welfare Benefits", "Government welfare, pension, and subsidy queries are outside the civic infrastructure MVP scope."),
    (r"\b(school teacher|school fee|syllabus|admission|college exam|curriculum|principal)\b", "Education", "School administration, fee, and curriculum issues are excluded from civic infrastructure tracking."),
    (r"\b(hospital doctor|clinic medicine|opd queue|surgery|prescription|ward nurse)\b", "Healthcare", "Clinical healthcare and hospital operations are excluded from municipal civic tracking."),
    (r"\b(electricity bill|meter reading|high[- ]voltage|substation|transformer blast|power grid outage|mseb|bescom)\b", "Electricity", "Power distribution grids and utility billing fall under state electricity boards rather than this civic MVP."),
]

HIGH_PRIORITY_TERMS = [
    "accident", "danger", "hospital", "school", "death", "injury", "severe",
    "flooding", "overflow", "overflowing", "sparking", "exposed wire", "cave-in",
    "contaminated", "crater", "uncovered manhole", "दुचाकीस्वार", "गंभीर", "अपघात", "दुर्घटना",
]

MEDIUM_PRIORITY_TERMS = [
    "broken", "stinking", "backlog", "traffic", "delay", "blocked", "flickering",
    "low pressure", "multiple days", "consecutive", "for 3 days", "for 4 days",
]


def detect_out_of_scope(text: str) -> Tuple[bool, Optional[str], Optional[str], bool]:
    lowered = text.lower()
    for pattern, oos_cat in EMERGENCY_RULES:
        if re.search(pattern, lowered):
            return (
                True,
                oos_cat,
                f"Active {oos_cat.lower()} situation detected. Excluded from civic infrastructure platform; dial 112 immediately.",
                True,
            )

    for pattern, oos_cat, reason in NON_EMERGENCY_OOS_RULES:
        if re.search(pattern, lowered):
            return True, oos_cat, reason, False

    return False, None, None, False


def classify_category_rule(text: str, submitted_category: str = "Other") -> Tuple[str, int, str]:
    lowered = text.lower()
    scores: Dict[str, int] = {}

    for category, terms in CATEGORY_LEXICONS.items():
        hits = sum(1 for term in terms if term in lowered)
        if hits > 0:
            scores[category] = hits

    if not scores:
        fallback_cat = submitted_category if submitted_category in CATEGORY_LEXICONS else "Other"
        return (
            fallback_cat,
            55 if fallback_cat != "Other" else 48,
            "No strong domain lexicon match found; retained submitted category with low confidence for admin review.",
        )

    ranked = sorted(scores.items(), key=lambda kv: kv[1], reverse=True)
    top_cat, top_hits = ranked[0]
    confidence = min(98, 72 + top_hits * 7)

    if submitted_category and submitted_category != top_cat and submitted_category in CATEGORY_LEXICONS:
        reason = (
            f"Lexicon matched {top_hits} domain term(s) for '{top_cat}', differing from citizen-selected '{submitted_category}'. Flagged for human verification."
        )
    else:
        reason = f"Deterministic lexicon matched {top_hits} civic domain indicator(s) for '{top_cat}'."

    return top_cat, confidence, reason


def assess_priority_rule(text: str) -> Tuple[str, int, str]:
    lowered = text.lower()
    high_hits = [t for t in HIGH_PRIORITY_TERMS if t in lowered]
    if high_hits:
        return (
            "High",
            min(96, 82 + len(high_hits) * 4),
            f"High priority assigned due to public health/safety hazard indicator(s): {', '.join(high_hits[:3])}.",
        )

    med_hits = [t for t in MEDIUM_PRIORITY_TERMS if t in lowered]
    if med_hits:
        return (
            "Medium",
            min(80, 62 + len(med_hits) * 5),
            f"Medium priority assigned due to recurring service disruption indicator(s): {', '.join(med_hits[:3])}.",
        )

    return (
        "Low",
        40,
        "Low priority estimated; no acute safety hazard or severe disruption keywords matched.",
    )
