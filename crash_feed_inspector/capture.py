"""Bounded, read-only WebSocket message capture."""
from __future__ import annotations

import csv
import json
import os
import time
from pathlib import Path

import websocket
from dotenv import load_dotenv

from .protocol import parse_final_result
from .signalr import parse_oncrash_candidate
from .security import sanitize_message

DATA_DIR = Path.cwd() / "data"
RAW_PATH = DATA_DIR / "messages.jsonl"
CSV_PATH = DATA_DIR / "rounds.csv"
ROUND_COLUMNS = ["round_id", "timestamp_utc", "multiplier", "source", "verified", "schema_version"]


def _parser_config() -> dict | None:
    event_path = os.getenv("CRASH_EVENT_TYPE_PATH", "").strip()
    final_types = [item.strip() for item in os.getenv("CRASH_FINAL_EVENT_TYPES", "").split(",") if item.strip()]
    round_path = os.getenv("CRASH_ROUND_ID_PATH", "").strip()
    multiplier_path = os.getenv("CRASH_MULTIPLIER_PATH", "").strip()
    timestamp_path = os.getenv("CRASH_TIMESTAMP_PATH", "").strip() or None
    configured = [bool(event_path), bool(final_types), bool(round_path), bool(multiplier_path)]
    if any(configured) and not all(configured):
        raise SystemExit(
            "Parser configuration is incomplete. Set CRASH_EVENT_TYPE_PATH, "
            "CRASH_FINAL_EVENT_TYPES, CRASH_ROUND_ID_PATH, and CRASH_MULTIPLIER_PATH together."
        )
    if not all(configured):
        return None
    return {
        "event_type_path": event_path,
        "final_event_types": final_types,
        "round_id_path": round_path,
        "multiplier_path": multiplier_path,
        "timestamp_path": timestamp_path,
        "source": "websocket",
        "schema_version": os.getenv("CRASH_SCHEMA_VERSION", "unconfirmed").strip() or "unconfirmed",
    }


def capture() -> None:
    load_dotenv()
    url = os.getenv("CRASH_WS_URL", "").strip()
    if not url:
        raise SystemExit("CRASH_WS_URL is empty. Copy .env.example to .env and configure an authorized endpoint.")
    if not url.startswith(("wss://", "ws://")):
        raise SystemExit("CRASH_WS_URL must start with ws:// or wss://.")
    try:
        max_messages = max(1, min(10000, int(os.getenv("MAX_MESSAGES", "100"))))
        timeout = max(1, min(300, int(os.getenv("WS_TIMEOUT_SECONDS", "15"))))
    except ValueError as exc:
        raise SystemExit("MAX_MESSAGES and WS_TIMEOUT_SECONDS must be integers.") from exc
    parser_config = _parser_config()
    protocol_mode = os.getenv("CRASH_PROTOCOL", "generic").strip().lower()
    if protocol_mode not in {"generic", "signalr_oncrash_candidate"}:
        raise SystemExit("CRASH_PROTOCOL must be generic or signalr_oncrash_candidate.")
    if protocol_mode == "signalr_oncrash_candidate" and parser_config is not None:
        raise SystemExit("Clear generic CRASH_*_PATH mappings when using signalr_oncrash_candidate mode.")

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    count, parse_errors = 0, 0
    parsed_by_id: dict[str, dict] = {}
    conflicting_ids: set[str] = set()
    try:
        ws = websocket.create_connection(url, timeout=timeout, enable_multithread=True)
    except Exception as exc:
        raise SystemExit(f"WebSocket connection failed: {type(exc).__name__}: {exc}") from exc

    print("Connected. Capturing bounded sample; no bets or game actions are performed.")
    if protocol_mode == "signalr_oncrash_candidate":
        print("Experimental legacy SignalR OnCrash adapter enabled; candidates remain unverified.")
    elif parser_config is None:
        print("No confirmed parser mapping configured; capturing sanitized messages only.")
    try:
        while count < max_messages:
            try:
                raw = ws.recv()
            except websocket.WebSocketTimeoutException:
                print("Receive timeout; stopping capture.")
                break
            if raw is None:
                break
            count += 1
            raw_text = raw.decode("utf-8", errors="replace") if isinstance(raw, bytes) else str(raw)
            sanitized = sanitize_message(raw_text)
            record = {"captured_at_unix": time.time(), "message_index": count, "raw_sanitized": sanitized}
            with RAW_PATH.open("a", encoding="utf-8") as handle:
                handle.write(json.dumps(record, ensure_ascii=False) + "\n")

            candidate_results = []
            if protocol_mode == "signalr_oncrash_candidate":
                # SignalR may concatenate JSON frames using ASCII record separator.
                for frame in sanitized.split("\x1e"):
                    if not frame.strip():
                        continue
                    try:
                        candidate = parse_oncrash_candidate(frame)
                    except ValueError:
                        parse_errors += 1
                        candidate = None
                    if candidate is not None:
                        candidate_results.append(candidate)
            elif parser_config is not None:
                try:
                    result = parse_final_result(sanitized, **parser_config)
                except ValueError:
                    parse_errors += 1
                    result = None
                if result is not None:
                    candidate_results.append(result)

            for result in candidate_results:
                round_id = result["round_id"]
                if round_id in parsed_by_id:
                    previous = parsed_by_id[round_id]
                    if (
                        previous["multiplier"] != result["multiplier"]
                        or previous.get("timestamp_utc") != result.get("timestamp_utc")
                    ):
                        conflicting_ids.add(round_id)
                    else:
                        # Keep the first identical occurrence to preserve arrival provenance.
                        parsed_by_id.setdefault(round_id, result)
                else:
                    parsed_by_id[round_id] = result
            print(f"Captured message {count} ({len(raw_text)} characters; common secret fields redacted)")
    finally:
        ws.close()

    candidates = [row for round_id, row in parsed_by_id.items() if round_id not in conflicting_ids]
    with CSV_PATH.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=ROUND_COLUMNS)
        writer.writeheader()
        for row in candidates:
            writer.writerow({key: row.get(key, "") for key in ROUND_COLUMNS})

    print(f"Saved {count} sanitized messages to {RAW_PATH}")
    print(f"Saved {len(candidates)} schema-matched, still-unverified round candidates to {CSV_PATH}")
    if conflicting_ids:
        print(f"Warning: excluded {len(conflicting_ids)} round IDs with conflicting parsed multipliers.")
    if parse_errors:
        print(f"Warning: {parse_errors} messages had malformed configured result fields.")
    if protocol_mode == "signalr_oncrash_candidate":
        print("Legacy OnCrash parsing is experimental; confirm each candidate against visible completed-round history.")
    elif parser_config is None:
        print("Configure parser paths only after confirming them against sanitized feed samples.")
    else:
        print("Every parsed row remains verified=false until reconciled with trusted visible game history.")
