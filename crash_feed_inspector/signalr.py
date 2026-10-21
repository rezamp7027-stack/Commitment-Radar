"""Experimental parser for a publicly documented legacy SignalR OnCrash shape.

This is a candidate adapter, not a claim that the current live game uses this schema.
It never authenticates, places bets, or marks outcomes as verified.
"""
from __future__ import annotations

import json
import math
from datetime import datetime, timezone
from typing import Any


def parse_oncrash_candidate(raw_frame: str) -> dict[str, Any] | None:
    """Parse one SignalR JSON frame with target=OnCrash and arguments[0].l/f/ts."""
    try:
        payload = json.loads(raw_frame)
    except (json.JSONDecodeError, TypeError):
        return None
    if not isinstance(payload, dict):
        return None
    # SignalR message type 1 is an invocation. Reject other message types.
    if payload.get("type") != 1 or payload.get("target") != "OnCrash":
        return None
    arguments = payload.get("arguments")
    if not isinstance(arguments, list) or not arguments or not isinstance(arguments[0], dict):
        raise ValueError("OnCrash frame has no arguments[0] object.")
    item = arguments[0]
    round_value = item.get("l")
    if isinstance(round_value, bool) or round_value is None or not str(round_value).strip():
        raise ValueError("OnCrash candidate has no usable round identifier in field l.")
    try:
        multiplier = float(str(item.get("f")).strip().removesuffix("x"))
    except (TypeError, ValueError) as exc:
        raise ValueError("OnCrash candidate field f is not numeric.") from exc
    if not math.isfinite(multiplier) or multiplier < 1:
        raise ValueError("OnCrash candidate multiplier must be finite and >= 1.")
    try:
        timestamp_ms = int(item.get("ts"))
        timestamp = datetime.fromtimestamp(timestamp_ms / 1000, tz=timezone.utc)
    except (TypeError, ValueError, OverflowError, OSError) as exc:
        raise ValueError("OnCrash candidate field ts is not a valid millisecond epoch timestamp.") from exc
    return {
        "round_id": str(round_value).strip(),
        "timestamp_utc": timestamp.isoformat().replace("+00:00", "Z"),
        "multiplier": multiplier,
        "source": "1xbet_websocket",
        "verified": False,
        "verification_status": "pending_manual_confirmation",
        "schema_version": "legacy-oncrash-candidate-v1",
        "event_type": "OnCrash",
    }
