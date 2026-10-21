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
from urllib.parse import urlparse
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
            detail = exc.read().decode("utf-8", errors="replace")[:400]
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
