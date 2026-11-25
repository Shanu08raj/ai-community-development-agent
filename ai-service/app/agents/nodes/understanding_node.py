import re
from typing import Dict
from app.agents.state import ComplaintAnalysisState

DURATION_PATTERN = re.compile(
    r"\b(?:for\s+\d+\s+(?:days?|weeks?|months?|hours?)|since\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|yesterday|last\s+week))\b",
    re.IGNORECASE,
)
LANDMARK_PATTERN = re.compile(
    r"\b(?:near|outside|along|opposite|at)\s+([A-Za-z0-9\s#&-]{3,35})",
    re.IGNORECASE,
)


def complaint_understanding_node(state: ComplaintAnalysisState) -> Dict:
    raw_title = state.get("rawTitle", "")
    raw_desc = state.get("rawDescription", "")
    combined = f"{raw_title}. {raw_desc}"

    history = list(state.get("nodeExecutionHistory") or [])
    history.append("ComplaintUnderstandingNode")

    dur_match = DURATION_PATTERN.search(combined)
    duration = dur_match.group(0) if dur_match else None

    landmarks = []
    for m in LANDMARK_PATTERN.finditer(combined):
        candidate = m.group(1).strip(" .,;:")
        if candidate and candidate not in landmarks:
            landmarks.append(candidate)
        if len(landmarks) >= 3:
            break

    key_issue = raw_title.strip()[:140]

    return {
        "extractedKeyIssue": key_issue,
        "extractedLandmarks": landmarks,
        "problemDuration": duration,
        "nodeExecutionHistory": history,
    }
