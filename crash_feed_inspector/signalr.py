"""Experimental parser for a publicly documented legacy SignalR OnCrash shape.

This is a candidate adapter, not a claim that the current live game uses this schema.
It never authenticates, places bets, or marks outcomes as verified.
"""
from __future__ import annotations

import json
import math
import re
from datetime import datetime, timezone
from typing import Any

_INTEGER_TEXT = re.compile(r"^-?\d+$")
# Bound timestamps to milliseconds since 2000-01-01 and before 2100-01-01.
# This explicitly rejects common epoch-seconds values accidentally passed as milliseconds.
_MIN_TIMESTAMP_MS = 946684800000
_MAX_TIMESTAMP_MS = 4102444800000


def parse_oncrash_candidate(raw_frame: str) -> dict[str, Any] | None:
    """Parse one SignalR JSON invocation matching target=OnCrash and arguments[0].l/f/ts.

    Returns None for unrelated/invalid JSON frames. Raises ValueError for a matched
    OnCrash event whose required fields are malformed, so the capture layer can count it.
    Results always remain unverified.
    """
    try:
        payload = json.loads(raw_frame)
    except (json.JSONDecodeError, TypeError):
        return None
    if not isinstance(payload, dict):
        return None

    # Use strict type checks: in Python, bool is a subclass of int (True == 1).
    if type(payload.get("type")) is not int or payload["type"] != 1:
        return None
    if payload.get("target") != "OnCrash":
        return None

    arguments = payload.get("arguments")
    if not isinstance(arguments, list) or not arguments or not isinstance(arguments[0], dict):
        raise ValueError("OnCrash frame has no arguments[0] object.")
    item = arguments[0]

    round_value = item.get("l")
    if isinstance(round_value, bool) or not isinstance(round_value, (str, int)):
        raise ValueError("OnCrash candidate field l must be a non-empty string or integer.")
    round_id = str(round_value).strip()
    if not round_id:
        raise ValueError("OnCrash candidate field l must be a non-empty string or integer.")

    raw_multiplier = item.get("f")
    if isinstance(raw_multiplier, bool) or raw_multiplier is None:
        raise ValueError("OnCrash candidate field f is not numeric.")
    try:
        multiplier_text = str(raw_multiplier).strip()
        if multiplier_text.lower().endswith("x"):
            multiplier_text = multiplier_text[:-1].strip()
        multiplier = float(multiplier_text)
    except (TypeError, ValueError) as exc:
        raise ValueError("OnCrash candidate field f is not numeric.") from exc
    if not math.isfinite(multiplier) or multiplier < 1:
        raise ValueError("OnCrash candidate multiplier must be finite and >= 1.")

    raw_timestamp = item.get("ts")
    if isinstance(raw_timestamp, bool) or raw_timestamp is None:
        raise ValueError("OnCrash candidate field ts must be a millisecond epoch timestamp.")
    if isinstance(raw_timestamp, int):
        timestamp_ms = raw_timestamp
    elif isinstance(raw_timestamp, float) and math.isfinite(raw_timestamp) and raw_timestamp.is_integer():
        timestamp_ms = int(raw_timestamp)
    elif isinstance(raw_timestamp, str) and _INTEGER_TEXT.fullmatch(raw_timestamp.strip()):
        timestamp_ms = int(raw_timestamp.strip())
    else:
        raise ValueError("OnCrash candidate field ts must be an integer millisecond epoch timestamp.")

    if not _MIN_TIMESTAMP_MS <= timestamp_ms < _MAX_TIMESTAMP_MS:
        raise ValueError(
            "OnCrash candidate field ts is outside the accepted millisecond epoch range "
            "(2000-01-01 through 2100-01-01). Check whether the source uses seconds instead."
        )
    try:
        timestamp = datetime.fromtimestamp(timestamp_ms / 1000, tz=timezone.utc)
    except (OverflowError, OSError, ValueError) as exc:
        raise ValueError("OnCrash candidate field ts is not a valid millisecond epoch timestamp.") from exc

    return {
        "round_id": round_id,
        "timestamp_utc": timestamp.isoformat().replace("+00:00", "Z"),
        "multiplier": multiplier,
        "source": "1xbet_websocket",
        "verified": False,
        "verification_status": "pending_manual_confirmation",
        "schema_version": "legacy-oncrash-candidate-v1",
        "event_type": "OnCrash",
    }
