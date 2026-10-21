"""Command-line entry point for capture and offline research workflows."""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
from typing import Sequence

from .analytics import describe, walk_forward_baseline
from .capture import capture
from .dataset import load_rounds_csv, quality_report, verified_multipliers
from .inspect import inspect_jsonl
from .report import generate_dashboard
from .research import research_report
from .supabase_store import (
    evaluate_pending_predictions,
    fetch_verified_rounds,
    preview_sync,
    store_research_predictions,
    sync_unverified_rounds,
)


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="crash-feed-inspector")
    subparsers = parser.add_subparsers(dest="command")
    subparsers.add_parser("capture", help="Capture a bounded authorized WebSocket sample")
    capture_sync = subparsers.add_parser(
        "capture-sync",
        help="Capture a bounded sample and sync unverified candidates to private Supabase",
    )
    capture_sync.add_argument("--batch-size", type=int, default=200)
    capture_sync.add_argument(
        "--dry-run",
        action="store_true",
        help="Capture and validate candidates, but do not make a Supabase write",
    )

    inspect = subparsers.add_parser(
        "inspect-jsonl",
        help="Summarize local sanitized WebSocket samples without assuming a schema",
    )
    inspect.add_argument("jsonl_path", nargs="?", type=Path, default=Path("data/messages.jsonl"))
    inspect.add_argument("--max-messages", type=int, default=100)

    validate = subparsers.add_parser("validate-csv", help="Validate a historical CSV dataset")
    validate.add_argument("csv_path", type=Path)

    analyze = subparsers.add_parser("analyze-csv", help="Analyze explicitly verified CSV rows only")
    analyze.add_argument("csv_path", type=Path)
    analyze.add_argument("--threshold", type=float, default=2.0)
    analyze.add_argument("--min-train", type=int, default=30)

    research = subparsers.add_parser(
        "research-csv",
        help="Run transparent historical-frequency, uncertainty, and stability filters",
    )
    research.add_argument("csv_path", type=Path)
    research.add_argument("--thresholds", type=float, nargs="+", default=[1.5, 2.0, 3.0, 5.0])
    research.add_argument("--windows", type=int, nargs="+", default=[30, 100, 300])
    research.add_argument("--min-history", type=int, default=100)
    research.add_argument("--max-window-rate-gap", type=float, default=0.15)

    dashboard = subparsers.add_parser("dashboard-csv", help="Generate a local HTML report from verified CSV rows")
    dashboard.add_argument("csv_path", type=Path)
    dashboard.add_argument("--output", type=Path, default=Path("data/dashboard.html"))
    dashboard.add_argument("--threshold", type=float, default=2.0)

    sync = subparsers.add_parser(
        "sync-csv", help="Send unverified CSV candidates to the private Supabase store"
    )
    sync.add_argument("csv_path", type=Path)
    sync.add_argument("--batch-size", type=int, default=200)
    sync.add_argument("--dry-run", action="store_true", help="Validate and preview without network access")

    db_research = subparsers.add_parser(
        "research-supabase", help="Research verified Supabase history and append baseline estimates to the ledger"
    )
    db_research.add_argument("--source", required=True, help="Exact source label stored in crash_rounds")
    db_research.add_argument("--thresholds", type=float, nargs="+", default=[1.5, 2.0, 3.0, 5.0])
    db_research.add_argument("--windows", type=int, nargs="+", default=[30, 100, 300])
    db_research.add_argument("--min-history", type=int, default=100)
    db_research.add_argument("--max-window-rate-gap", type=float, default=0.15)

    db_evaluate = subparsers.add_parser(
        "evaluate-supabase", help="Score pending research-only estimates against the first later verified round"
    )
    db_evaluate.add_argument("--source", required=True, help="Exact source label stored in crash_rounds")
    db_evaluate.add_argument("--limit", type=int, default=1000)

    args = parser.parse_args(argv)
    if args.command in (None, "capture"):
        capture()
        return 0

    if args.command == "capture-sync":
        if not 1 <= args.batch_size <= 500:
            parser.error("--batch-size must be between 1 and 500.")
        capture()
        captured_csv = Path("data/rounds.csv")
        try:
            rows = load_rounds_csv(captured_csv)
        except (OSError, ValueError) as exc:
            if isinstance(exc, ValueError) and str(exc) == "CSV contains no data rows.":
                result = {
                    "mode": "skipped",
                    "candidate_rows": 0,
                    "reason": "No schema-matched candidate rows were captured; Supabase was not called.",
                }
                print(json.dumps({"capture": "completed", "sync": result}, ensure_ascii=False, indent=2))
                return 0
            parser.error(str(exc))
        if args.dry_run:
            result = preview_sync(rows)
        else:
            try:
                result = sync_unverified_rounds(rows, batch_size=args.batch_size)
            except (ValueError, RuntimeError) as exc:
                parser.error(str(exc))
        print(json.dumps({
            "capture": "completed",
            "candidate_rows": len(rows),
            "sync": result,
            "verification_policy": "Captured rounds remain unverified until reconciled with trusted visible history.",
        }, ensure_ascii=False, indent=2))
        return 0

    if args.command == "research-supabase":
        try:
            db_rows = fetch_verified_rounds(args.source)
            db_report = research_report(
                [row["multiplier"] for row in db_rows],
                thresholds=tuple(args.thresholds),
                windows=tuple(args.windows),
                min_history=args.min_history,
                max_window_rate_gap=args.max_window_rate_gap,
            )
            ledger = store_research_predictions(args.source, db_report)
        except (ValueError, RuntimeError) as exc:
            parser.error(str(exc))
        print(json.dumps({
            "source": args.source,
            "verified_rows": len(db_rows),
            "research": db_report,
            "ledger": ledger,
        }, ensure_ascii=False, indent=2))
        return 0

    if args.command == "evaluate-supabase":
        try:
            result = evaluate_pending_predictions(args.source, limit=args.limit)
        except (ValueError, RuntimeError) as exc:
            parser.error(str(exc))
        print(json.dumps({"evaluation": result}, ensure_ascii=False, indent=2))
        return 0

    if args.command == "inspect-jsonl":
        if not 1 <= args.max_messages <= 1000:
            parser.error("--max-messages must be between 1 and 1000.")
        try:
            report = inspect_jsonl(args.jsonl_path, max_messages=args.max_messages)
        except ValueError as exc:
            parser.error(str(exc))
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return 0

    try:
        rows = load_rounds_csv(args.csv_path)
    except (OSError, ValueError) as exc:
        parser.error(str(exc))
    report = {"quality": quality_report(rows)}

    if args.command == "sync-csv":
        if not 1 <= args.batch_size <= 500:
            parser.error("--batch-size must be between 1 and 500.")
        if args.dry_run:
            result = preview_sync(rows)
        else:
            try:
                result = sync_unverified_rounds(rows, batch_size=args.batch_size)
            except (ValueError, RuntimeError) as exc:
                parser.error(str(exc))
        print(json.dumps({"sync": result}, ensure_ascii=False, indent=2))
        return 0

    if args.command == "research-csv":
        data = verified_multipliers(rows)
        if not data:
            parser.error("No rows are explicitly verified=true; refusing to analyze unverified candidates.")
        try:
            report["research"] = research_report(
                data,
                thresholds=tuple(args.thresholds),
                windows=tuple(args.windows),
                min_history=args.min_history,
                max_window_rate_gap=args.max_window_rate_gap,
            )
        except ValueError as exc:
            parser.error(str(exc))
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return 0

    if args.command == "dashboard-csv":
        if args.threshold < 1 or not math.isfinite(args.threshold):
            parser.error("--threshold must be a finite number >= 1.0.")
        try:
            output = generate_dashboard(rows, args.output, threshold=args.threshold)
        except ValueError as exc:
            parser.error(str(exc))
        print(json.dumps({
            "dashboard_path": str(output),
            "verified_rows": report["quality"]["verified_rows"],
            "threshold": args.threshold,
            "interpretation": "Static local report; not a live dashboard or a prediction guarantee.",
        }, ensure_ascii=False, indent=2))
        return 0

    if args.command == "analyze-csv":
        if args.min_train < 1:
            parser.error("--min-train must be a positive integer.")
        if args.threshold < 1 or not math.isfinite(args.threshold):
            parser.error("--threshold must be a finite number >= 1.0.")
        data = verified_multipliers(rows)
        if not data:
            parser.error("No rows are explicitly verified=true; refusing to analyze unverified candidates.")
        report["verified_analysis"] = describe(data, thresholds=(1.5, 2.0, 3.0, 5.0))
        if len(data) > args.min_train:
            report["walk_forward_baseline"] = walk_forward_baseline(
                data, threshold=args.threshold, min_train=args.min_train
            )
        else:
            report["walk_forward_baseline"] = {
                "status": "insufficient_data",
                "verified_rows": len(data),
                "required_rows": f"more than {args.min_train}",
            }
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
