# Crash Feed Inspector — Project Specification

## Mission
Provide a read-only research tool for bounded authorized feed capture, explicit final-result parsing, private persistence of unverified candidates, data-quality checks, descriptive historical analysis, and chronological baseline evaluation.

## Current architecture
1. Bounded read-only WebSocket capture with timeout and message caps.
2. Best-effort local redaction and JSONL inspection.
3. Explicit event allowlist and configured JSON field paths; no guessing from arbitrary numbers.
4. Strict CSV validation; candidate rows stay unverified.
5. Private Supabase persistence through a trusted local/server process; RLS enabled and no browser-role grants.
6. Verified-only historical-frequency baseline, Wilson interval and stability checks.
7. Append-only research estimate ledger and retrospective evaluation against the first later verified outcome.
8. Local static HTML snapshot from verified CSV; no live dashboard/API deployed.

## Data truth and research rules
- The endpoint, authorization, final event name, stable round ID, multiplier field, and timestamp semantics must be confirmed from an authorized sanitized sample.
- Parsing is not verification. Candidate outcomes require independent reconciliation against trusted visible history.
- Database research requires verified rows with timezone-aware timestamps; empty data must stop the workflow.
- Historical frequency is descriptive, not a reliable next-round forecast. No baseline result emits candidate_signal.
- Future models must use only information available before the prediction, compare against the same chronological baseline splits, and preserve an untouched final holdout.

## Security
- The Supabase service-role key is restricted to a trusted local/server process.
- GitHub Pages cannot safely hold privileged Supabase credentials.
- RLS is enabled on both deployed tables; anon and authenticated have no direct table grants or policies.
- Imported rows are always verified=false and pending_manual_confirmation; duplicate source/round IDs are ignored rather than overwritten.
- Redaction is best-effort. Do not capture or share data if sensitive session material cannot be safely retained.
- Automated wagering, bankroll management, authentication bypass, and access-control circumvention are out of scope.

## Implemented and tested
- Bounded capture and synthetic tests.
- Explicit schema-mapped parser.
- Strict CSV validation and data-quality report.
- Verified-only descriptive analytics and chronological baseline.
- Supabase candidate sync, verified-history research, prediction ledger, and retrospective scoring.
- RLS, verification-state constraints, SHA-256 format check, evaluation consistency check.
- GitHub Actions for Python 3.11/3.12; latest checked test run passed on commit 6f243e72d8573e6e12b7f49b65779227bc315433.

## Not established
- Live endpoint reachability or authorization.
- Correct parsing of a real provider's completed-result event.
- Any populated verified dataset or measured predictive advantage.
- Live web dashboard or always-on ingestion service.
- Fresh-project migration bootstrap compatibility with the legacy migration history.

## Completion criteria
- [x] Generic parser, validation, analytics, and persistence logic have synthetic unit coverage.
- [x] Supabase schema is deployed with RLS and private access boundary.
- [x] Candidate ingestion never self-verifies or overwrites conflicts.
- [x] Research-only estimates are persisted and can be retrospectively scored.
- [ ] Latest Pages workflow confirmed after the current documentation commit.
- [ ] Real endpoint schema documented with sanitized evidence.
- [ ] Real outcomes independently reconciled and imported.
- [ ] Candidate models tested against baseline on an untouched holdout.
- [ ] Live dashboard/API implemented only after secure server-side access is available.
