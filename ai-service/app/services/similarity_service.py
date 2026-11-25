import re
from typing import Dict, List, Optional, Tuple

STOP_WORDS = {
    "the", "and", "for", "with", "near", "from", "that", "this", "have", "been",
    "are", "was", "has", "not", "into", "over", "after", "since", "days", "please",
    "issue", "problem", "report", "complaint", "ward", "area",
}


def extract_ward_key(area: str) -> str:
    lowered = area.lower().strip()
    match = re.search(r"ward\s*[-#:]?\s*(\d+)", lowered)
    if match:
        return f"ward {match.group(1)}"
    return lowered.split(",")[0].strip()


def tokenize(text: str) -> set[str]:
    words = re.findall(r"[^\W_]{3,}", text.lower(), re.UNICODE)
    return {w for w in words if w not in STOP_WORDS}


def jaccard_similarity(text_a: str, text_b: str) -> float:
    ta = tokenize(text_a)
    tb = tokenize(text_b)
    if not ta or not tb:
        return 0.0
    union = ta | tb
    return len(ta & tb) / len(union) if union else 0.0


def match_cluster(
    category: str,
    ward: str,
    complaint_text: str,
    candidates: Optional[List[Dict]] = None,
) -> Tuple[bool, Optional[str], Optional[float], Optional[str]]:
    if not candidates:
        return False, None, None, None

    target_ward = extract_ward_key(ward)
    best_id = None
    best_score = 0.0

    for item in candidates:
        if item.get("category") != category:
            continue
        item_ward = extract_ward_key(item.get("area", ""))
        if not target_ward or not item_ward or (target_ward != item_ward and target_ward not in item.get("area", "").lower()):
            continue

        sim = jaccard_similarity(complaint_text, f"{item.get('title', '')} {item.get('summary', '')}")
        if sim > best_score:
            best_score = sim
            best_id = item.get("id")

    if best_id and best_score >= 0.12:
        return (
            True,
            best_id,
            round(best_score, 3),
            f"Matched cluster {best_id} in {ward} sharing '{category}' category and overlapping tokens ({int(best_score * 100)}%).",
        )

    return False, None, None, None
