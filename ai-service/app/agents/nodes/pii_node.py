from typing import Dict
from app.agents.state import ComplaintAnalysisState
from app.utils.pii_scrubber import scrub_pii


def pii_scrubbing_node(state: ComplaintAnalysisState) -> Dict:
    raw_title = state.get("rawTitle", "")
    raw_desc = state.get("rawDescription", "")

    history = list(state.get("nodeExecutionHistory") or [])
    history.append("PIIScrubbingNode")

    redacted_title, count_t = scrub_pii(raw_title)
    redacted_desc, count_d = scrub_pii(raw_desc)

    return {
        "redactedTitle": redacted_title,
        "redactedDescription": redacted_desc,
        "piiItemsMasked": count_t + count_d,
        "sanitizedSummary": redacted_title[:160],
        "nodeExecutionHistory": history,
    }
