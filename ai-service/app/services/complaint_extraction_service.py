import difflib
import json
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from app.services.language_detection_service import detect_text_language
from app.services.rule_fallback import classify_category_rule, detect_out_of_scope

DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "india_locations.json"

CATEGORY_CODE_MAP: Dict[str, str] = {
    "Water Supply": "WATER_SUPPLY",
    "Roads and Infrastructure": "ROADS_INFRASTRUCTURE",
    "Waste Management": "WASTE_MANAGEMENT",
    "Drainage and Sanitation": "DRAINAGE_SANITATION",
    "Streetlights": "STREETLIGHTS",
    "Other": "OTHER",
    "Out of Scope": "OUT_OF_SCOPE",
}

CANONICAL_TITLE_MAP: Dict[str, str] = {
    "Water Supply": "Water Supply Problem",
    "Roads and Infrastructure": "Road and Infrastructure Issue",
    "Waste Management": "Waste Management Issue",
    "Drainage and Sanitation": "Drainage and Sanitation Issue",
    "Streetlights": "Streetlight Issue",
}

MULTILINGUAL_CATEGORY_EXTRA: Dict[str, List[str]] = {
    "Water Supply": [
        "నీరు", "నీటి", "పైపులైన్", "మంచినీరు", "తాగునీరు",
        "ನೀರು", "ನೀರಿನ", "ಪೈಪ್", "ಕುಡಿಯುವ ನೀರು",
        "পানী", "খোৱা পানী", "জল", "পাইপ",
        "ইশিং", "ঈশিং",
    ],
    "Roads and Infrastructure": [
        "రోడ్డు", "గుంత", "గుంతలు", "రహదారి",
        "ರಸ್ತೆ", "ಗುಂಡಿ", "ಹೊಂಡ",
        "ৰাস্তা", "পথ", "গাত", "খাল",
        "লম্বী",
    ],
    "Waste Management": [
        "చెత్త", "పారిశుధ్యం", "మురుగు",
        "ಕಸ", "ತ್ಯಾಜ್ಯ",
        "আৱৰ্জনা", "জাবৰ", "ময়লা",
        "অমোৎ",
    ],
    "Drainage and Sanitation": [
        "డ్రైనేజీ", "మురుగునీరు", "మ్యాన్ హోల్",
        "ಚರಂಡಿ", "ಗಟಾರ", "ಕೊಳಚೆ",
        "নৰ্দমা", "ড্ৰেইন",
    ],
    "Streetlights": [
        "వీధి దీపం", "వీధి దీపాలు", "లైట్", "చీకటి",
        "ಬೀದಿ ದೀಪ", "ದೀಪ", "ಕತ್ತಲೆ",
        "ষ্ট্ৰীট লাইট", "লাইট", "পোহৰ",
    ],
}

STATE_ALIASES: Dict[str, str] = {
    "andaman and nicobar": "Andaman and Nicobar Islands",
    "andaman & nicobar": "Andaman and Nicobar Islands",
    "andhra": "Andhra Pradesh",
    "andhra pradesh": "Andhra Pradesh",
    "आंध्र प्रदेश": "Andhra Pradesh",
    "आंध्रप्रदेश": "Andhra Pradesh",
    "ఆంధ్రప్రదేశ్": "Andhra Pradesh",
    "arunachal": "Arunachal Pradesh",
    "arunachal pradesh": "Arunachal Pradesh",
    "अरुणाचल प्रदेश": "Arunachal Pradesh",
    "assam": "Assam",
    "असम": "Assam",
    "অসম": "Assam",
    "बिहार": "Bihar",
    "bihar": "Bihar",
    "chandigarh": "Chandigarh",
    "चंडीगढ़": "Chandigarh",
    "chhattisgarh": "Chhattisgarh",
    "chattisgarh": "Chhattisgarh",
    "छत्तीसगढ़": "Chhattisgarh",
    "dadra and nagar haveli": "Dadra and Nagar Haveli and Daman and Diu",
    "daman and diu": "Dadra and Nagar Haveli and Daman and Diu",
    "delhi": "Delhi",
    "new delhi": "Delhi",
    "दिल्ली": "Delhi",
    "नई दिल्ली": "Delhi",
    "goa": "Goa",
    "गोवा": "Goa",
    "gujarat": "Gujarat",
    "गुजरात": "Gujarat",
    "ગુજરાત": "Gujarat",
    "haryana": "Haryana",
    "हरियाणा": "Haryana",
    "himachal": "Himachal Pradesh",
    "himachal pradesh": "Himachal Pradesh",
    "हिमाचल प्रदेश": "Himachal Pradesh",
    "jammu and kashmir": "Jammu and Kashmir",
    "jammu & kashmir": "Jammu and Kashmir",
    "जम्मू और कश्मीर": "Jammu and Kashmir",
    "जम्मू कश्मीर": "Jammu and Kashmir",
    "jharkhand": "Jharkhand",
    "झारखंड": "Jharkhand",
    "karnataka": "Karnataka",
    "कर्नाटक": "Karnataka",
    "कर्नाटका": "Karnataka",
    "ಕರ್ನಾಟಕ": "Karnataka",
    "கர்நாடகா": "Karnataka",
    "కర్ణాటక": "Karnataka",
    "kerala": "Kerala",
    "केरल": "Kerala",
    "കേരളം": "Kerala",
    "ladakh": "Ladakh",
    "लद्दाख": "Ladakh",
    "lakshadweep": "Lakshadweep",
    "madhya pradesh": "Madhya Pradesh",
    "मध्य प्रदेश": "Madhya Pradesh",
    "maharashtra": "Maharashtra",
    "महाराष्ट्र": "Maharashtra",
    "ಮಹಾರಾಷ್ಟ್ರ": "Maharashtra",
    "மகாராஷ்டிரா": "Maharashtra",
    "మహారాష్ట్ర": "Maharashtra",
    "manipur": "Manipur",
    "मणिपुर": "Manipur",
    "মণিপুর": "Manipur",
    "মেইতেই": "Manipur",
    "meghalaya": "Meghalaya",
    "मेघालय": "Meghalaya",
    "mizoram": "Mizoram",
    "मिजोरम": "Mizoram",
    "nagaland": "Nagaland",
    "नागालैंड": "Nagaland",
    "odisha": "Odisha",
    "orissa": "Odisha",
    "ओडिशा": "Odisha",
    "उड़ीसा": "Odisha",
    "ଓଡ଼ିଶା": "Odisha",
    "puducherry": "Puducherry",
    "pondicherry": "Puducherry",
    "पुदुचेरी": "Puducherry",
    "punjab": "Punjab",
    "पंजाब": "Punjab",
    "ਪੰਜਾਬ": "Punjab",
    "rajasthan": "Rajasthan",
    "राजस्थान": "Rajasthan",
    "sikkim": "Sikkim",
    "सिक्किम": "Sikkim",
    "tamil nadu": "Tamil Nadu",
    "tamilnadu": "Tamil Nadu",
    "तमिलनाडु": "Tamil Nadu",
    "தமிழ்நாடு": "Tamil Nadu",
    "தமிழ் நாடு": "Tamil Nadu",
    "తమిళనాడు": "Tamil Nadu",
    "telangana": "Telangana",
    "तेलंगाना": "Telangana",
    "తెలంగాణ": "Telangana",
    "tripura": "Tripura",
    "त्रिपुरा": "Tripura",
    "uttar pradesh": "Uttar Pradesh",
    "उत्तर प्रदेश": "Uttar Pradesh",
    "uttarakhand": "Uttarakhand",
    "उत्तराखंड": "Uttarakhand",
    "west bengal": "West Bengal",
    "पश्चिम बंगाल": "West Bengal",
    "পশ্চিমবঙ্গ": "West Bengal",
}

DISTRICT_ALIASES: Dict[str, List[Tuple[str, str]]] = {
    "bengaluru urban": [("Karnataka", "Bengaluru Urban")],
    "bangalore urban": [("Karnataka", "Bengaluru Urban")],
    "बेंगलुरु अर्बन": [("Karnataka", "Bengaluru Urban")],
    "bengaluru rural": [("Karnataka", "Bengaluru Rural")],
    "bangalore rural": [("Karnataka", "Bengaluru Rural")],
    "bengaluru": [("Karnataka", "Bengaluru Urban"), ("Karnataka", "Bengaluru Rural")],
    "bangalore": [("Karnataka", "Bengaluru Urban"), ("Karnataka", "Bengaluru Rural")],
    "बेंगलुरु": [("Karnataka", "Bengaluru Urban"), ("Karnataka", "Bengaluru Rural")],
    "बैंगलोर": [("Karnataka", "Bengaluru Urban"), ("Karnataka", "Bengaluru Rural")],
    "ಬೆಂಗಳೂರು": [("Karnataka", "Bengaluru Urban"), ("Karnataka", "Bengaluru Rural")],
    "mysore": [("Karnataka", "Mysuru")],
    "mysuru": [("Karnataka", "Mysuru")],
    "ಮೈಸೂರು": [("Karnataka", "Mysuru")],
    "belgaum": [("Karnataka", "Belagavi")],
    "belagavi": [("Karnataka", "Belagavi")],
    "gulbarga": [("Karnataka", "Kalaburagi")],
    "kalaburagi": [("Karnataka", "Kalaburagi")],
    "shimoga": [("Karnataka", "Shivamogga")],
    "shivamogga": [("Karnataka", "Shivamogga")],
    "tumkur": [("Karnataka", "Tumakuru")],
    "tumakuru": [("Karnataka", "Tumakuru")],
    "bellary": [("Karnataka", "Ballari")],
    "ballari": [("Karnataka", "Ballari")],
    "mumbai city": [("Maharashtra", "Mumbai City")],
    "mumbai suburban": [("Maharashtra", "Mumbai Suburban")],
    "mumbai": [("Maharashtra", "Mumbai City"), ("Maharashtra", "Mumbai Suburban")],
    "bombay": [("Maharashtra", "Mumbai City"), ("Maharashtra", "Mumbai Suburban")],
    "मुंबई": [("Maharashtra", "Mumbai City"), ("Maharashtra", "Mumbai Suburban")],
    "pune": [("Maharashtra", "Pune")],
    "poona": [("Maharashtra", "Pune")],
    "पुणे": [("Maharashtra", "Pune")],
    "thane": [("Maharashtra", "Thane")],
    "ठाणे": [("Maharashtra", "Thane")],
    "nagpur": [("Maharashtra", "Nagpur")],
    "नागपुर": [("Maharashtra", "Nagpur")],
    "नागपूर": [("Maharashtra", "Nagpur")],
    "nashik": [("Maharashtra", "Nashik")],
    "नासिक": [("Maharashtra", "Nashik")],
    "नाशिक": [("Maharashtra", "Nashik")],
    "madras": [("Tamil Nadu", "Chennai")],
    "chennai": [("Tamil Nadu", "Chennai")],
    "चेन्नई": [("Tamil Nadu", "Chennai")],
    "சென்னை": [("Tamil Nadu", "Chennai")],
    "coimbatore": [("Tamil Nadu", "Coimbatore")],
    "கோயம்புத்தூர்": [("Tamil Nadu", "Coimbatore")],
    "madurai": [("Tamil Nadu", "Madurai")],
    "மதுரை": [("Tamil Nadu", "Madurai")],
    "hyderabad": [("Telangana", "Hyderabad")],
    "हैदराबाद": [("Telangana", "Hyderabad")],
    "హైదరాబాద్": [("Telangana", "Hyderabad")],
    "rangareddy": [("Telangana", "Rangareddy")],
    "ranga reddy": [("Telangana", "Rangareddy")],
    "visakhapatnam": [("Andhra Pradesh", "Visakhapatnam")],
    "vizag": [("Andhra Pradesh", "Visakhapatnam")],
    "విశాఖపట్నం": [("Andhra Pradesh", "Visakhapatnam")],
    "calcutta": [("West Bengal", "Kolkata")],
    "kolkata": [("West Bengal", "Kolkata")],
    "कोलकाता": [("West Bengal", "Kolkata")],
    "কলকাতা": [("West Bengal", "Kolkata")],
    "gurugram": [("Haryana", "Gurugram")],
    "gurgaon": [("Haryana", "Gurugram")],
    "गुरुग्राम": [("Haryana", "Gurugram")],
    "allahabad": [("Uttar Pradesh", "Prayagraj")],
    "prayagraj": [("Uttar Pradesh", "Prayagraj")],
    "प्रयागराज": [("Uttar Pradesh", "Prayagraj")],
    "lucknow": [("Uttar Pradesh", "Lucknow")],
    "लखनऊ": [("Uttar Pradesh", "Lucknow")],
    "varanasi": [("Uttar Pradesh", "Varanasi")],
    "banaras": [("Uttar Pradesh", "Varanasi")],
    "वाराणसी": [("Uttar Pradesh", "Varanasi")],
    "kanpur": [("Uttar Pradesh", "Kanpur Nagar"), ("Uttar Pradesh", "Kanpur Dehat")],
    "patna": [("Bihar", "Patna")],
    "पटना": [("Bihar", "Patna")],
    "jaipur": [("Rajasthan", "Jaipur")],
    "जयपुर": [("Rajasthan", "Jaipur")],
    "ahmedabad": [("Gujarat", "Ahmedabad")],
    "अहमदाबाद": [("Gujarat", "Ahmedabad")],
    "surat": [("Gujarat", "Surat")],
    "सूरत": [("Gujarat", "Surat")],
    "bhopal": [("Madhya Pradesh", "Bhopal")],
    "भोपाल": [("Madhya Pradesh", "Bhopal")],
    "indore": [("Madhya Pradesh", "Indore")],
    "इंदौर": [("Madhya Pradesh", "Indore")],
    "imphal": [("Manipur", "Imphal West"), ("Manipur", "Imphal East")],
    "guwahati": [("Assam", "Kamrup Metropolitan")],
    "गुवाहाटी": [("Assam", "Kamrup Metropolitan")],
    "গুৱাহাটী": [("Assam", "Kamrup Metropolitan")],
    "new delhi": [("Delhi", "New Delhi")],
}

INDIC_DIGITS = str.maketrans("०१२३४५६७८९೦೧೨೩೪೫೬೭೮೯౦౧౨౩౪౫౬౭౮౯௦௧௨௩௪௫௬௭௮௯০১২৩৪৫৬৭৮৯", "0123456789" * 5)


def _load_locations() -> Dict[str, Any]:
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    all_states = list(data["states"]) + list(data["unionTerritories"])
    districts_by_state: Dict[str, List[str]] = data["districtsByState"]
    state_lower = {s.lower(): s for s in all_states}
    district_to_states: Dict[str, List[Tuple[str, str]]] = {}
    for st, dlist in districts_by_state.items():
        for dist in dlist:
            district_to_states.setdefault(dist.lower(), []).append((st, dist))
    return {
        "all_states": all_states,
        "districts_by_state": districts_by_state,
        "state_lower": state_lower,
        "district_to_states": district_to_states,
    }


_LOC = _load_locations()


def _normalize_digits(text: str) -> str:
    return (text or "").translate(INDIC_DIGITS)


def _match_whole_phrase(phrase: str, text_lower: str) -> bool:
    escaped = re.escape(phrase.lower())
    if re.search(r"[\u0900-\u0DFF\uABC0-\uABFF]", phrase):
        return phrase.lower() in text_lower
    return bool(re.search(rf"(?<![a-z0-9]){escaped}(?![a-z0-9])", text_lower))


def _fuzzy_lookup(candidate: str, choices: List[str], cutoff: float = 0.85) -> Optional[str]:
    clean = re.sub(r"\s+", " ", candidate.strip().lower())
    if len(clean) < 3:
        return None
    best_match = None
    best_score = 0.0
    for item in choices:
        score = difflib.SequenceMatcher(None, clean, item.lower()).ratio()
        if score > best_score:
            best_score = score
            best_match = item
    return best_match if best_score >= cutoff else None


def _extract_state(transcript: str) -> Tuple[Optional[str], List[Dict[str, str]]]:
    lowered = transcript.lower()
    # 1. Explicit clause pattern (English & Indic cues)
    clause_patterns = [
        r"(?:my\s+)?state\s*(?:is|name\s+is|:|=)?\s*([a-zA-Z&\s]{2,40}?)(?=\s*(?:,|and\b|district\b|ward\b|in\b|$|\.))",
        r"(?:state\s+of\s+)([a-zA-Z&\s]{2,40}?)(?=\s*(?:,|and\b|district\b|ward\b|$|\.))",
        r"(?:मेरा\s+|माझे\s+)?राज्य\s*[:\-]?\s*([^\n,।.]{2,35}?)(?=\s*(?:आहे|है|और|आणि|जिला|जिल्हा|वार्ड|प्रभाग|$))",
        r"(?:ನನ್ನ\s+)?ರಾಜ್ಯ\s*[:\-]?\s*([^\n,।.]{2,35}?)(?=\s*(?:ಜಿಲ್ಲೆ|ವಾರ್ಡ್|$))",
        r"(?:மாநிலம்)\s*[:\-]?\s*([^\n,।.]{2,35}?)(?=\s*(?:மாவட்டம்|வார்டு|$))",
        r"(?:రాష్ట్రం)\s*[:\-]?\s*([^\n,।.]{2,35}?)(?=\s*(?:జిల్లా|వార్డు|$))",
    ]
    for pat in clause_patterns:
        for m in re.finditer(pat, transcript, flags=re.IGNORECASE):
            cand = re.sub(r"\b(is|the|my|state)\b", "", m.group(1), flags=re.IGNORECASE).strip()
            cand_low = re.sub(r"\s+", " ", cand.lower())
            if cand_low in _LOC["state_lower"]:
                return _LOC["state_lower"][cand_low], []
            if cand_low in STATE_ALIASES:
                return STATE_ALIASES[cand_low], []
            fuzzy = _fuzzy_lookup(cand, _LOC["all_states"], cutoff=0.84)
            if fuzzy:
                return fuzzy, []

    # 2. Direct phrase scan sorted longest-first (so "Andhra Pradesh" beats "Andhra", etc.)
    matched_states: List[str] = []
    for st in sorted(_LOC["all_states"], key=len, reverse=True):
        if _match_whole_phrase(st, lowered) and st not in matched_states:
            matched_states.append(st)
    for alias, target in sorted(STATE_ALIASES.items(), key=lambda kv: len(kv[0]), reverse=True):
        if _match_whole_phrase(alias, lowered) and target not in matched_states:
            matched_states.append(target)

    # Avoid "Uttar Pradesh" false hit on unrelated words or duplicate subset matches
    if len(matched_states) == 1:
        return matched_states[0], []
    if len(matched_states) > 1:
        # Prefer explicit longer administrative match; preserve candidates if distinct
        if "Delhi" in matched_states and "New Delhi" in lowered and len(matched_states) == 1:
            return "Delhi", []
        return None, [{"field": "state", "state": s, "district": ""} for s in matched_states[:4]]
    return None, []


def _extract_district(transcript: str, resolved_state: Optional[str]) -> Tuple[Optional[str], List[Dict[str, str]]]:
    lowered = transcript.lower()
    candidates: List[Tuple[str, str]] = []

    clause_patterns = [
        r"(?:my\s+)?district\s*(?:is|name\s+is|:|=)?\s*([a-zA-Z\s]{2,40}?)(?=\s*(?:,|and\b|state\b|ward\b|$|\.))",
        r"(?:district\s+of\s+)([a-zA-Z\s]{2,40}?)(?=\s*(?:,|and\b|state\b|ward\b|$|\.))",
        r"(?:मेरा\s+|माझा\s+)?(?:जिला|जिल्हा)\s*[:\-]?\s*([^\n,।.]{2,35}?)(?=\s*(?:आहे|है|और|आणि|राज्य|वार्ड|प्रभाग|$))",
        r"(?:ಜಿಲ್ಲೆ)\s*[:\-]?\s*([^\n,।.]{2,35}?)(?=\s*(?:ರಾಜ್ಯ|ವಾರ್ಡ್|$))",
        r"(?:மாவட்டம்)\s*[:\-]?\s*([^\n,।.]{2,35}?)(?=\s*(?:மாநிலம்|வார்டு|$))",
        r"(?:జిల్లా)\s*[:\-]?\s*([^\n,।.]{2,35}?)(?=\s*(?:రాష్ట్రం|వార్డు|$))",
    ]
    for pat in clause_patterns:
        for m in re.finditer(pat, transcript, flags=re.IGNORECASE):
            cand = re.sub(r"\b(is|the|my|district)\b", "", m.group(1), flags=re.IGNORECASE).strip()
            cand_low = re.sub(r"\s+", " ", cand.lower())
            if cand_low in DISTRICT_ALIASES:
                candidates.extend(DISTRICT_ALIASES[cand_low])
            elif cand_low in _LOC["district_to_states"]:
                candidates.extend(_LOC["district_to_states"][cand_low])
            else:
                # Fuzzy check bounded to resolved_state districts first (or all districts if unknown)
                pool = (
                    _LOC["districts_by_state"].get(resolved_state, [])
                    if resolved_state
                    else list({d for pair_list in _LOC["district_to_states"].values() for _, d in pair_list})
                )
                fuzzy_dist = _fuzzy_lookup(cand, pool, cutoff=0.84)
                if fuzzy_dist:
                    if resolved_state and fuzzy_dist in _LOC["districts_by_state"].get(resolved_state, []):
                        candidates.append((resolved_state, fuzzy_dist))
                    else:
                        candidates.extend(_LOC["district_to_states"].get(fuzzy_dist.lower(), []))

    # Direct scan if clause pattern didn't find anything
    if not candidates:
        for alias, pairs in sorted(DISTRICT_ALIASES.items(), key=lambda kv: len(kv[0]), reverse=True):
            if _match_whole_phrase(alias, lowered):
                candidates.extend(pairs)
                break

    if not candidates:
        search_dict = (
            {d.lower(): [(resolved_state, d)] for d in _LOC["districts_by_state"].get(resolved_state, [])}
            if resolved_state
            else _LOC["district_to_states"]
        )
        for d_low in sorted(search_dict.keys(), key=len, reverse=True):
            if len(d_low) < 4:
                continue
            # Avoid matching English state-identical words or generic civic words (e.g., "East", "North")
            if d_low in ("east", "west", "north", "south", "central", "new delhi", "thane" if "thane" not in lowered else ""):
                continue
            # Do not treat mention of the state name (e.g. "Goa", "Chandigarh", "Daman") as a district unless explicit district clause appeared
            if resolved_state and d_low == resolved_state.lower():
                continue
            if _match_whole_phrase(d_low, lowered):
                candidates.extend(search_dict[d_low])
                break

    # Deduplicate (state, district) pairs preserving order
    unique_pairs: List[Tuple[str, str]] = []
    for pair in candidates:
        if pair not in unique_pairs:
            unique_pairs.append(pair)

    if not unique_pairs:
        return None, []

    if resolved_state:
        in_state = [p for p in unique_pairs if p[0] == resolved_state]
        if len(in_state) == 1:
            return in_state[0][1], []
        if len(in_state) > 1:
            return None, [{"field": "district", "state": st, "district": dist} for st, dist in in_state]
        # District found, but ONLY in another state -> signal mismatch explicitly via candidates
        return None, [{"field": "district_mismatch", "state": st, "district": dist} for st, dist in unique_pairs]

    if len(unique_pairs) == 1:
        return unique_pairs[0][1], [{"field": "inferred_state_for_district", "state": unique_pairs[0][0], "district": unique_pairs[0][1]}]

    return None, [{"field": "district", "state": st, "district": dist} for st, dist in unique_pairs]


def _extract_ward(transcript: str) -> Optional[str]:
    normalized = _normalize_digits(transcript)
    patterns = [
        r"(?:ward\s*(?:number|no\.?|num|#)?\s*(?:is|=|:)?\s*)([0-9]{1,3}[A-Za-z]?)",
        r"(?:वार्ड\s*(?:नंबर|संख्या|क्रमांक|नं\.?)?\s*)([0-9]{1,3})",
        r"(?:प्रभाग\s*(?:क्रमांक|संख्या|नं\.?)?\s*)([0-9]{1,3})",
        r"(?:ವಾರ್ಡ್\s*(?:ಸಂಖ್ಯೆ|ನಂಬರ್)?\s*)([0-9]{1,3})",
        r"(?:வார்டு\s*(?:எண்)?\s*)([0-9]{1,3})",
        r"(?:వార్డు\s*(?:నెంబర్|సంఖ్య)?\s*)([0-9]{1,3})",
        r"([0-9]{1,3})\s*(?:th|st|nd|rd)?\s*ward\b",
    ]
    for pat in patterns:
        m = re.search(pat, normalized, flags=re.IGNORECASE)
        if m:
            return m.group(1).strip()
    return None


def _detect_category(transcript: str) -> Tuple[Optional[str], Optional[str], int, bool, Optional[str]]:
    is_oos, oos_cat, oos_reason, is_emerg = detect_out_of_scope(transcript)
    if is_oos:
        return "Out of Scope", "OUT_OF_SCOPE", 95, is_emerg, oos_reason

    cat, conf, _ = classify_category_rule(transcript, submitted_category="Other")
    if cat != "Other":
        return cat, CATEGORY_CODE_MAP.get(cat, "OTHER"), conf, False, None

    # Check additional Indic script keywords (Telugu, Kannada, Assamese, Manipuri)
    best_cat = None
    best_hits = 0
    lowered = transcript.lower()
    for c_name, terms in MULTILINGUAL_CATEGORY_EXTRA.items():
        hits = sum(1 for t in terms if t in lowered)
        if hits > best_hits:
            best_hits = hits
            best_cat = c_name
    if best_cat:
        return best_cat, CATEGORY_CODE_MAP.get(best_cat, "OTHER"), min(95, 74 + best_hits * 7), False, None

    return None, None, 0, False, None


def _clean_description_and_title(
    transcript: str,
    category: Optional[str],
    state: Optional[str],
    district: Optional[str],
    ward: Optional[str],
) -> Tuple[Optional[str], str]:
    raw = re.sub(r"\s+", " ", (transcript or "").strip())
    if not raw:
        return None, ""

    # Split into sentence-like clauses cleanly
    parts = [p.strip() for p in re.split(r"(?<=[.!?।])\s+", raw) if p.strip()]
    kept_parts: List[str] = []

    meta_clause_pat = re.compile(
        r"^(?:(?:my\s+)?(?:ward|state|district|location|city|area)\s*(?:number|no\.?|name)?\s*(?:is|are|:)|"
        r"i\s+(?:am\s+)?(?:from|live\s+in|calling\s+from)|"
        r"(?:मेरा|माझे|माझा|मेरी)\s+(?:राज्य|जिला|जिल्हा|वार्ड|प्रभाग))",
        flags=re.IGNORECASE,
    )
    generic_intro_pat = re.compile(
        r"^(?:i\s+have\s+a(?:n)?\s+(?:[a-z\s]{3,30})\s+(?:problem|issue|complaint)|"
        r"this\s+is\s+(?:a|regarding)\s+(?:[a-z\s]{3,30})\s+(?:problem|issue|complaint))[.!।]?$",
        flags=re.IGNORECASE,
    )

    for idx, sent in enumerate(parts):
        # Strip bounded spoken metadata clauses cleanly whether they appear at start, middle, or end
        stripped = sent
        for _ in range(4):
            nxt = re.sub(
                r"(?:(?:,\s*|\s*\band\b\s*|^)(?:my\s+)?(?:"
                r"ward\s*(?:number|no\.?|num|#)?\s*(?:is|:|=)?\s*[0-9]+[A-Za-z]?|"
                r"state\s*(?:is|name\s+is|:|=)?\s*" + (re.escape(state) if state else r"[a-zA-Z\s&]{2,35}") + r"|"
                r"district\s*(?:is|name\s+is|:|=)?\s*" + (re.escape(district) if district else r"[a-zA-Z\s]{2,35}") +
                r"))(?=\s*(?:,|and\b|[.!?।]|$))",
                " ",
                stripped,
                flags=re.IGNORECASE,
            )
            nxt = re.sub(r"\s+", " ", nxt).strip(" ,.;:-")
            if nxt == stripped:
                break
            stripped = nxt

        if not stripped:
            continue
        if meta_clause_pat.search(stripped) and (
            (state and state.lower() in stripped.lower())
            or (district and district.lower() in stripped.lower())
            or (ward and ward in _normalize_digits(stripped))
        ):
            continue
        if generic_intro_pat.match(stripped) and len(parts) > 1 and idx == 0:
            continue
        kept_parts.append(stripped + ("." if stripped[-1] not in ".!?।" else ""))

    cleaned_desc = " ".join(kept_parts).strip()
    if len(cleaned_desc) < 12:
        cleaned_desc = raw

    # Generate crisp title strictly grounded in extracted category / first clause
    if category and category in CANONICAL_TITLE_MAP:
        title = CANONICAL_TITLE_MAP[category]
    else:
        first_clause = re.split(r"[.!?।,]", cleaned_desc)[0].strip()
        words = first_clause.split()
        title = " ".join(words[:7]).strip() if len(words) >= 2 else None
        if title and len(title) > 80:
            title = title[:77].rstrip() + "..."

    return title, cleaned_desc


def extract_complaint_fields(
    transcript: str,
    language: Optional[str] = "auto",
    existing_fields: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    raw_transcript = re.sub(r"\s+", " ", (transcript or "").strip())
    existing = existing_fields or {}
    warnings: List[str] = []

    if not raw_transcript:
        return {
            "success": True,
            "originalTranscript": "",
            "detectedLanguage": "Undetermined",
            "detectedLanguageCode": "und",
            "title": None,
            "description": None,
            "category": None,
            "categoryCode": None,
            "state": None,
            "district": None,
            "ward": None,
            "area": None,
            "locationStatus": "missing",
            "ambiguousLocations": [],
            "locationMismatch": None,
            "existingFieldConflicts": [],
            "warnings": ["Transcript is empty; nothing to extract."],
        }

    lang_info = detect_text_language(raw_transcript, declared_language=None if language in (None, "", "auto") else language)
    category, category_code, _cat_conf, is_emergency, oos_reason = _detect_category(raw_transcript)
    if is_emergency and oos_reason:
        warnings.append(oos_reason)

    state, state_candidates = _extract_state(raw_transcript)
    district, district_candidates = _extract_district(raw_transcript, resolved_state=state)
    ward = _extract_ward(raw_transcript)

    ambiguous_locations: List[Dict[str, str]] = []
    location_mismatch: Optional[str] = None
    location_status = "missing"

    if state_candidates:
        ambiguous_locations.extend(state_candidates)
        warnings.append("Multiple possible states were detected in speech. Please confirm the exact State.")

    # Inspect district candidates for single-state inference vs mismatch vs true ambiguity
    inferred_pair = next((c for c in district_candidates if c["field"] == "inferred_state_for_district"), None)
    mismatch_pairs = [c for c in district_candidates if c["field"] == "district_mismatch"]
    ambig_dist_pairs = [c for c in district_candidates if c["field"] == "district"]

    if mismatch_pairs and state:
        actual_states = ", ".join(sorted({m["state"] for m in mismatch_pairs}))
        mismatch_name = mismatch_pairs[0]["district"]
        location_mismatch = (
            f"District '{mismatch_name}' belongs to {actual_states}, not selected state '{state}'. Please verify both State and District."
        )
        warnings.append(location_mismatch)
        location_status = "mismatch"
    elif ambig_dist_pairs:
        ambiguous_locations.extend(ambig_dist_pairs)
        names = ", ".join(f"{c['district']} ({c['state']})" for c in ambig_dist_pairs[:4])
        warnings.append(f"Location is ambiguous across multiple districts: {names}. Please select the exact option.")
        location_status = "ambiguous"
    elif inferred_pair and not state:
        # Unambiguous district belonging to a single state can safely resolve that state, NEVER the reverse (never infer ward!)
        state = inferred_pair["state"]
        location_status = "verified"
    elif state and district:
        if district in _LOC["districts_by_state"].get(state, []):
            location_status = "verified"
        else:
            location_mismatch = f"District '{district}' could not be verified under '{state}'."
            warnings.append(location_mismatch)
            district = None
            location_status = "mismatch"
    elif state or ward:
        location_status = "partial"

    title, cleaned_description = _clean_description_and_title(
        raw_transcript, category=category, state=state, district=district, ward=ward
    )

    # Check if user already manually entered a district that mismatches newly extracted state
    existing_state = str(existing.get("state") or "").strip()
    existing_district = str(existing.get("district") or "").strip()
    target_state = state or existing_state
    target_district = district or existing_district
    if target_state and target_district and target_district not in _LOC["districts_by_state"].get(target_state, []):
        mismatch_msg = f"Existing or selected district '{target_district}' does not belong to state '{target_state}'."
        if not location_mismatch:
            location_mismatch = mismatch_msg
            warnings.append(mismatch_msg)
        location_status = "mismatch"

    # Never silently overwrite manually entered non-default fields
    conflicts: List[str] = []
    if existing.get("title") and title and existing["title"].strip().lower() != title.lower():
        conflicts.append("title")
    if existing.get("description") and cleaned_description and existing["description"].strip() != cleaned_description:
        conflicts.append("description")
    if existing.get("category") and category and existing.get("categoryTouched") and existing["category"] != category:
        conflicts.append("category")
    if existing_state and state and existing_state != state:
        conflicts.append("state")
    if existing_district and district and existing_district != district:
        conflicts.append("district")
    if existing.get("area") and ward and f"ward {ward}".lower() not in existing["area"].strip().lower():
        conflicts.append("area")

    area_value = f"Ward {ward}" if ward else None

    return {
        "success": True,
        "originalTranscript": raw_transcript,
        "detectedLanguage": lang_info["detectedLanguage"],
        "detectedLanguageCode": lang_info["detectedLanguageCode"],
        "title": title,
        "description": cleaned_description,
        "category": category,
        "categoryCode": category_code,
        "state": state,
        "district": district,
        "ward": ward,
        "area": area_value,
        "locationStatus": location_status,
        "ambiguousLocations": [
            {"field": c["field"], "state": c["state"], "district": c["district"]}
            for c in ambiguous_locations
        ],
        "locationMismatch": location_mismatch,
        "existingFieldConflicts": conflicts,
        "warnings": warnings,
    }
