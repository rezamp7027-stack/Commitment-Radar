"""Private, server-side Supabase persistence for unverified round candidates.

This module uses the PostgREST API with a service-role key loaded from the local
environment. It must only run in a trusted local/server process; never bundle
this module or its credentials into a browser app or static dashboard.
"""
from __future__ import annotations

import json
import math
import os
from typing import Any, Callable, Iterable
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlparse
from urllib.request import Request, urlopen

from dotenv import load_dotenv

MAX_BATCH_SIZE = 500
DEFAULT_TIMEOUT_SECONDS = 20


def preview_sync(rows: Iterable[dict[str, Any]]) -> dict[str, Any]:
    """Summarize what would be sent without opening a network connection."""
    data = list(rows)
    candidates = [row for row in data if row.get("verified") is not True]
    return {
        "mode": "dry_run",
        "input_rows": len(data),
        "candidate_rows": len(candidates),
        "verified_rows_skipped": len(data) - len(candidates),
        "batch_count_at_default_size": (len(candidates) + 199) // 200,
        "verification_policy": "Only unverified candidates are sent; this command never verifies outcomes.",
    }


def _validate_url(value: str) -> str:
    parsed = urlparse(value)
    local_http = parsed.scheme == "http" and parsed.hostname in {"localhost", "127.0.0.1", "::1"}
    if (
        parsed.scheme != "https" and not local_http
        or not parsed.netloc
        or parsed.username is not None
        or parsed.password is not None
        or parsed.query
        or parsed.fragment
    ):
        raise ValueError("SUPABASE_URL must be an HTTPS project URL (HTTP is allowed only for localhost), without credentials, query, or fragment.")
    return value.rstrip("/")


def _load_credentials() -> tuple[str, str]:
    load_dotenv()
    url = (os.getenv("SUPABASE_URL") or "").strip()
    key = (os.getenv("SUPABASE_SERVICE_ROLE_KEY") or "").strip()
    if not url:
        raise ValueError("SUPABASE_URL is missing. Configure it in the local .env file.")
    if not key:
        raise ValueError("SUPABASE_SERVICE_ROLE_KEY is missing. Configure it only in a trusted local/server environment; never put it in frontend code.")
    return _validate_url(url), key


def sync_unverified_rounds(
    rows: Iterable[dict[str, Any]],
    *,
    batch_size: int = 200,
    supabase_url: str | None = None,
    service_role_key: str | None = None,
    opener: Callable[..., Any] | None = None,
) -> dict[str, Any]:
    """Insert unverified candidate rows; existing rows are never overwritten.

    The database's unique (source, round_id) key and PostgREST
    resolution=ignore-duplicates make repeated imports idempotent. Verified rows
    in the CSV are intentionally skipped so an import cannot set trusted state.
    """
    if isinstance(batch_size, bool) or not isinstance(batch_size, int) or not 1 <= batch_size <= MAX_BATCH_SIZE:
        raise ValueError(f"batch_size must be between 1 and {MAX_BATCH_SIZE}.")
    if supabase_url is None or service_role_key is None:
        env_url, env_key = _load_credentials()
        supabase_url = supabase_url or env_url
        service_role_key = service_role_key or env_key
    url = _validate_url(supabase_url.strip())
    key = service_role_key.strip()
    if not key:
        raise ValueError("The Supabase service-role key cannot be empty.")

    data = list(rows)
    candidates: list[dict[str, Any]] = []
    for row in data:
        if row.get("verified") is True:
            continue
        source = str(row.get("source") or "csv_import").strip()
        round_id = str(row.get("round_id") or "").strip()
        schema_version = str(row.get("schema_version") or "unknown").strip() or "unknown"
        multiplier = row.get("multiplier")
        if not source or not round_id:
            raise ValueError("Every candidate must have a non-empty source and round_id.")
        if isinstance(multiplier, bool) or not isinstance(multiplier, (int, float)) or not math.isfinite(multiplier) or multiplier < 1:
            raise ValueError(f"Candidate {round_id!r} has an invalid multiplier.")
        payload_row = {
            "source": source,
            "round_id": round_id,
            "occurred_at": row.get("timestamp_utc"),
            "multiplier": multiplier,
            "schema_version": schema_version,
            "verified": False,
            "verification_status": "pending_manual_confirmation",
        }
        candidates.append(payload_row)

    if not candidates:
        return {
            "mode": "live",
            "input_rows": len(data),
            "candidate_rows": 0,
            "verified_rows_skipped": len(data),
            "inserted_rows": 0,
            "batch_count": 0,
            "duplicates_ignored": 0,
        }

    transport = opener or urlopen
    endpoint = f"{url}/rest/v1/crash_rounds?on_conflict=source%2Cround_id"
    inserted = 0
    batches = 0
    for offset in range(0, len(candidates), batch_size):
        batch = candidates[offset:offset + batch_size]
        request = Request(
            endpoint,
            data=json.dumps(batch, allow_nan=False, separators=(",", ":")).encode("utf-8"),
            method="POST",
            headers={
                "apikey": key,
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json",
                "Prefer": "resolution=ignore-duplicates,return=representation",
            },
        )
        try:
            with transport(request, timeout=DEFAULT_TIMEOUT_SECONDS) as response:
                body = response.read()
        except HTTPError as exc:
            # Do not include request headers or the secret key in error output.
            detail = exc.read().decode("utf-8", errors="replace").replace(key, "[REDACTED]")[:400]
            raise RuntimeError(f"Supabase insert failed with HTTP {exc.code}: {detail}") from None
        except (URLError, TimeoutError, OSError) as exc:
            raise RuntimeError(f"Supabase insert failed due to a network/transport error: {type(exc).__name__}.") from None
        try:
            returned = json.loads(body.decode("utf-8")) if body else []
        except (UnicodeDecodeError, json.JSONDecodeError):
            raise RuntimeError("Supabase returned an unreadable response; check the project logs.") from None
        if not isinstance(returned, list):
            raise RuntimeError("Supabase returned an unexpected response shape.")
        inserted += len(returned)
        batches += 1

    return {
        "mode": "live",
        "input_rows": len(data),
        "candidate_rows": len(candidates),
        "verified_rows_skipped": len(data) - len(candidates),
        "inserted_rows": inserted,
        "batch_count": batches,
        "duplicates_ignored": len(candidates) - inserted,
        "verification_policy": "All imported rows remain unverified; duplicate rows are ignored, never overwritten.",
    }


def _json_request(
    method: str,
    endpoint: str,
    key: str,
    *,
    payload: Any = None,
    extra_headers: dict[str, str] | None = None,
    opener: Callable[..., Any] | None = None,
) -> Any:
    """Perform a bounded JSON request without leaking credentials in errors."""
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Accept": "application/json",
    }
    if payload is not None:
        headers["Content-Type"] = "application/json"
    if extra_headers:
        headers.update(extra_headers)
    body = None if payload is None else json.dumps(
        payload, allow_nan=False, separators=(",", ":")
    ).encode("utf-8")
    request = Request(endpoint, data=body, method=method, headers=headers)
    try:
        with (opener or urlopen)(request, timeout=DEFAULT_TIMEOUT_SECONDS) as response:
            raw = response.read()
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace").replace(key, "[REDACTED]")[:400]
        raise RuntimeError(f"Supabase request failed with HTTP {exc.code}: {detail}") from None
    except (URLError, TimeoutError, OSError) as exc:
        raise RuntimeError(f"Supabase request failed due to a network/transport error: {type(exc).__name__}.") from None
    if not raw:
        return []
    try:
        return json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        raise RuntimeError("Supabase returned an unreadable response; check the project logs.") from None


def _resolve_credentials(
    supabase_url: str | None, service_role_key: str | None
) -> tuple[str, str]:
    if supabase_url is None or service_role_key is None:
        env_url, env_key = _load_credentials()
        supabase_url = supabase_url or env_url
        service_role_key = service_role_key or env_key
    url = _validate_url(supabase_url.strip())
    key = service_role_key.strip()
    if not key:
        raise ValueError("The Supabase service-role key cannot be empty.")
    return url, key


def _parse_db_timestamp(value: Any, label: str):
    from datetime import datetime, timezone

    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{label} has no timestamp; chronological evaluation is unsafe.")
    try:
        parsed = datetime.fromisoformat(value.strip().replace("Z", "+00:00"))
    except ValueError as exc:
        raise ValueError(f"{label} has an invalid ISO-8601 timestamp.") from exc
    if parsed.tzinfo is None or parsed.utcoffset() is None:
        raise ValueError(f"{label} timestamp must include a timezone.")
    return parsed.astimezone(timezone.utc)


def fetch_verified_rounds(
    source: str,
    *,
    supabase_url: str | None = None,
    service_role_key: str | None = None,
    opener: Callable[..., Any] | None = None,
    page_size: int = 1000,
    max_rows: int = 100000,
) -> list[dict[str, Any]]:
    """Fetch one source's verified rounds in timestamp order; fail closed on gaps."""
    if not isinstance(source, str) or not source.strip():
        raise ValueError("source must be a non-empty string.")
    if isinstance(page_size, bool) or not isinstance(page_size, int) or not 1 <= page_size <= 1000:
        raise ValueError("page_size must be between 1 and 1000.")
    if isinstance(max_rows, bool) or not isinstance(max_rows, int) or max_rows < 1:
        raise ValueError("max_rows must be a positive integer.")
    url, key = _resolve_credentials(supabase_url, service_role_key)
    params = urlencode({
        "select": "source,round_id,occurred_at,multiplier,schema_version",
        "source": f"eq.{source.strip()}",
        "verified": "eq.true",
        "order": "occurred_at.asc.nullslast,round_id.asc",
        "limit": str(page_size),
    })
    endpoint = f"{url}/rest/v1/crash_rounds?{params}"
    rows: list[dict[str, Any]] = []
    offset = 0
    previous_time = None
    while True:
        batch = _json_request(
            "GET",
            endpoint,
            key,
            extra_headers={"Range-Unit": "items", "Range": f"{offset}-{offset + page_size - 1}"},
            opener=opener,
        )
        if not isinstance(batch, list):
            raise RuntimeError("Supabase verified-round query returned an unexpected response shape.")
        for item in batch:
            timestamp = _parse_db_timestamp(item.get("occurred_at"), f"Round {item.get('round_id', '?')!r}")
            if previous_time is not None and timestamp < previous_time:
                raise ValueError("Supabase returned rounds out of chronological order.")
            previous_time = timestamp
            try:
                multiplier = float(item["multiplier"])
            except (KeyError, TypeError, ValueError):
                raise ValueError("Supabase returned a round with a non-numeric multiplier.") from None
            if not math.isfinite(multiplier) or multiplier < 1:
                raise ValueError("Supabase returned a round with an invalid multiplier.")
            rows.append({
                "source": str(item.get("source") or source),
                "round_id": str(item.get("round_id") or ""),
                "occurred_at": timestamp.isoformat().replace("+00:00", "Z"),
                "multiplier": multiplier,
                "schema_version": str(item.get("schema_version") or "unknown"),
            })
        if len(rows) > max_rows:
            raise ValueError(f"Verified history exceeds the configured safety cap of {max_rows} rows.")
        if len(batch) < page_size:
            break
        offset += len(batch)
        if offset >= max_rows:
            raise ValueError(f"Verified history reached the safety cap of {max_rows} rows; raise the cap explicitly before continuing.")
    if not rows:
        raise ValueError(f"No verified rounds were found in Supabase for source {source!r}.")
    return rows


def store_research_predictions(
    source: str,
    report: dict[str, Any],
    *,
    model_version: str = "historical-frequency-v1",
    supabase_url: str | None = None,
    service_role_key: str | None = None,
    opener: Callable[..., Any] | None = None,
) -> dict[str, Any]:
    """Append historical-baseline estimates to the prediction ledger.

    This deliberately never emits candidate_signal: the current baseline is
    descriptive research and has not demonstrated a predictive edge.
    """
    url, key = _resolve_credentials(supabase_url, service_role_key)
    results = report.get("threshold_results")
    if not isinstance(results, dict) or not results:
        raise ValueError("Research report contains no threshold results.")
    payload = []
    for threshold_text, result in results.items():
        full = result.get("full_history", {})
        interval = full.get("wilson_95_ci")
        rate = full.get("historical_rate")
        if (
            not isinstance(interval, list) or len(interval) != 2
            or not isinstance(rate, (int, float)) or not math.isfinite(rate)
            or not 0 <= rate <= 1
        ):
            raise ValueError("Research report contains invalid probability or interval values.")
        status = str(result.get("status") or "no_signal")
        payload.append({
            "source": source,
            "target_threshold": float(threshold_text),
            "estimated_probability": float(rate),
            "confidence_low": float(interval[0]),
            "confidence_high": float(interval[1]),
            "model_version": model_version,
            "data_count": int(full.get("rounds", 0)),
            "decision": "research_only" if status == "historical_rate_only_no_next_round_claim" else "no_signal",
            "feature_summary": {
                "status": status,
                "largest_recent_vs_full_rate_gap": result.get("largest_recent_vs_full_rate_gap"),
                "recent_windows": result.get("recent_windows", {}),
                "methodology": "Verified historical-frequency baseline with Wilson interval; no next-round edge claimed.",
            },
        })
    returned = _json_request(
        "POST",
        f"{url}/rest/v1/crash_predictions",
        key,
        payload=payload,
        extra_headers={"Prefer": "return=representation"},
        opener=opener,
    )
    if not isinstance(returned, list):
        raise RuntimeError("Supabase prediction-ledger insert returned an unexpected response shape.")
    return {
        "source": source,
        "records_attempted": len(payload),
        "records_inserted": len(returned),
        "model_version": model_version,
        "candidate_signal_emitted": False,
    }


def evaluate_pending_predictions(
    source: str,
    *,
    supabase_url: str | None = None,
    service_role_key: str | None = None,
    opener: Callable[..., Any] | None = None,
    limit: int = 1000,
) -> dict[str, Any]:
    """Evaluate research-only estimates against the first later verified round."""
    from datetime import datetime, timezone

    if isinstance(limit, bool) or not isinstance(limit, int) or not 1 <= limit <= 5000:
        raise ValueError("limit must be between 1 and 5000.")
    url, key = _resolve_credentials(supabase_url, service_role_key)
    rounds = fetch_verified_rounds(
        source, supabase_url=url, service_role_key=key, opener=opener
    )
    params = urlencode({
        "select": "id,source,created_at,target_threshold,decision",
        "source": f"eq.{source}",
        "decision": "eq.research_only",
        "evaluated_at": "is.null",
        "order": "created_at.asc",
        "limit": str(limit),
    })
    pending = _json_request(
        "GET", f"{url}/rest/v1/crash_predictions?{params}", key, opener=opener
    )
    if not isinstance(pending, list):
        raise RuntimeError("Supabase pending-prediction query returned an unexpected response shape.")
    evaluated = hits = waiting = 0
    for prediction in pending:
        created_at = _parse_db_timestamp(prediction.get("created_at"), "Prediction")
        next_round = next(
            (row for row in rounds if _parse_db_timestamp(row["occurred_at"], "Round") > created_at),
            None,
        )
        if next_round is None:
            waiting += 1
            continue
        threshold = float(prediction["target_threshold"])
        multiplier = float(next_round["multiplier"])
        patch_params = urlencode({
            "id": f"eq.{int(prediction['id'])}",
            "evaluated_at": "is.null",
        })
        now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        updated = _json_request(
            "PATCH",
            f"{url}/rest/v1/crash_predictions?{patch_params}",
            key,
            payload={
                "evaluated_round_id": next_round["round_id"],
                "evaluated_multiplier": multiplier,
                "evaluated_at": now,
            },
            extra_headers={"Prefer": "return=representation"},
            opener=opener,
        )
        if not isinstance(updated, list):
            raise RuntimeError("Supabase prediction evaluation returned an unexpected response shape.")
        if updated:
            evaluated += 1
            hits += multiplier >= threshold
    return {
        "source": source,
        "pending_checked": len(pending),
        "evaluated": evaluated,
        "hits": hits,
        "misses": evaluated - hits,
        "waiting_for_later_verified_round": waiting,
        "scoring_note": "Only research_only estimates are evaluated; this score is retrospective and does not establish profitability.",
    }
