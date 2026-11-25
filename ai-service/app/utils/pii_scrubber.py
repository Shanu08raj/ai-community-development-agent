import re
from typing import Tuple

PHONE_PATTERN = re.compile(r"(?:\+91[\s-]?)?\b[6-9]\d{4}[\s-]?\d{5}\b")
AADHAAR_PATTERN = re.compile(r"\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b")
EMAIL_PATTERN = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")
NAME_CUE_PATTERN = re.compile(
    r"(?:my name is|i am|this is|contact person[:\s]+)\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)",
    re.IGNORECASE,
)


def scrub_pii(text: str) -> Tuple[str, int]:
    if not text:
        return "", 0

    count = 0
    cleaned = text

    cleaned, n_phone = PHONE_PATTERN.subn("[PHONE_REDACTED]", cleaned)
    count += n_phone

    cleaned, n_aadhaar = AADHAAR_PATTERN.subn("[AADHAAR_REDACTED]", cleaned)
    count += n_aadhaar

    cleaned, n_email = EMAIL_PATTERN.subn("[EMAIL_REDACTED]", cleaned)
    count += n_email

    def _replace_name(match: re.Match) -> str:
        nonlocal count
        count += 1
        prefix = match.group(0)[: match.start(1) - match.start(0)]
        return f"{prefix}[CITIZEN_NAME]"

    cleaned = NAME_CUE_PATTERN.sub(_replace_name, cleaned)
    return cleaned, count
