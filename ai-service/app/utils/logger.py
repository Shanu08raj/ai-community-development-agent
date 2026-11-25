import json
import logging
from datetime import datetime, timezone

logger = logging.getLogger("jansetu_ai")
if not logger.handlers:
    handler = logging.StreamHandler()
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)


def log_event(event: str, **fields):
    payload = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "event": event,
        **fields,
    }
    logger.info(json.dumps(payload, ensure_ascii=False))
