# Roadmap — Current Verified Status

## Stage 1: Core pipeline
- [x] Bounded read-only WebSocket capture with timeout/message caps
- [x] Best-effort secret redaction
- [x] Explicit event/schema mapping; parsed outcomes remain unverified
- [x] Strict CSV validation, duplicate rejection, timezone normalization, quality report
- [x] Verified-only descriptive statistics and chronological baseline
- [x] Unit tests and GitHub Actions for Python 3.11 and 3.12
- [x] Current main CI passed for commit 6f243e72d8573e6e12b7f49b65779227bc315433

## Stage 2: Private persistence
- [x] Deploy crash_rounds and crash_predictions in Supabase project Crash
- [x] RLS enabled; anon/authenticated have no table grants or policies
- [x] Unique source/round ID constraint, verification-state consistency, multiplier constraints
- [x] SHA-256 format and all-or-none prediction evaluation constraints
- [x] sync-csv inserts unverified candidates only and ignores duplicates without overwriting
- [ ] Configure local trusted credentials and import real candidate data
- [ ] Reconcile sample rows against trusted visible completed-round history

## Stage 3: Research ledger
- [x] research-supabase reads verified timestamped rows only
- [x] Research ledger writes historical-frequency estimates and Wilson intervals
- [x] evaluate-supabase scores research-only estimates against the first later verified round
- [x] Current baseline never emits candidate_signal
- [ ] Add real-feed fixtures after endpoint schema is observed
- [ ] Benchmark future candidate models against baseline on identical chronological splits
- [ ] Preserve untouched final holdout and report calibration

## Stage 4: Operator experience and release
- [x] Local static HTML snapshot from verified CSV
- [x] Operational/data-quality metric definitions
- [x] Status and operations runbook
- [ ] Confirm authorized endpoint reachability and final-result schema
- [ ] Build a live dashboard only after a safe server/API boundary is designed
- [ ] Confirm post-commit Pages workflow completes

## Blocking facts
Supabase tables currently contain zero rows. Live WebSocket reachability, endpoint authorization, authoritative completed-result event mapping, and predictive edge remain unverified. Passing synthetic tests proves local logic only; it does not prove a real feed works. No betting or bankroll automation is in scope.
