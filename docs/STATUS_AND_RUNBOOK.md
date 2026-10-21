# Verified Status and Operations Runbook

Last checked: 2026-10-21.

## Current state
- Repository: https://github.com/rezamp7027-stack/Commitment-Radar
- Python package: crash_feed_inspector; Python 3.11+.
- Supabase project Crash: htfrixfcirgrhlmwtkjs.
- public.crash_rounds and public.crash_predictions exist; RLS is enabled on both.
- anon/authenticated roles have no direct table grants; no public dashboard/API is deployed.
- SHA-256 format and prediction evaluation consistency constraints are deployed.
- GitHub Actions passed for commit b07eeef2bd8ec1f4276945e17855ac11216f6443: Tests and Pages deployment.
- Both database tables contain zero rows. There is no real-feed analysis or model-performance conclusion yet.
- Live WebSocket reachability, authorization, final-result event schema, and predictive edge are not confirmed.

## Local setup
1. Install Python 3.11 or newer.
2. Create and activate a virtual environment.
3. Install dependencies: python -m pip install -r requirements.txt.
4. Copy .env.example to .env.
5. Configure only an authorized endpoint. Leave parser mapping blank until sanitized data confirms event type, round ID, final multiplier, and timestamp.
6. For database commands, set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in local .env. The key is privileged; never put it in browser code, public repo, Pages, or CI logs.
7. Run tests: python -m unittest discover -s tests -v.

## Command sequence
- Help: python -m crash_feed_inspector --help
- Bounded read-only capture: python -m crash_feed_inspector capture
- Inspect capture: python -m crash_feed_inspector inspect-jsonl path/to/capture.jsonl
- Validate import: python -m crash_feed_inspector sync-csv path/to/rounds.csv --dry-run
- Import unverified candidates: python -m crash_feed_inspector sync-csv path/to/rounds.csv
- Research verified CSV: python -m crash_feed_inspector research-csv path/to/rounds.csv
- Create local HTML report: python -m crash_feed_inspector dashboard-csv path/to/rounds.csv --output data/dashboard.html
- Research verified timestamped database rows: python -m crash_feed_inspector research-supabase --source SOURCE_LABEL
- Evaluate pending research-only estimates: python -m crash_feed_inspector evaluate-supabase --source SOURCE_LABEL

## Data integrity rules
- CSV sync inserts only unverified candidate rows; it never verifies outcomes and ignores duplicate (source, round_id) conflicts rather than overwriting existing rows.
- Reconcile candidates against trusted visible completed-round history before updating verification status.
- Research uses only verified rows with valid timestamps. Empty verified data should stop research rather than generate a guess.
- Historical frequency and confidence intervals are descriptive, not proof that the next round is predictable or that a betting strategy is profitable.
- Raw captures may contain sensitive session data. Redaction is best-effort; review captures privately before sharing.

## Release gates still open
1. Confirm endpoint authorization and reachability.
2. Inspect a bounded sanitized capture and document the real completed-result schema.
3. Add a sanitized real-protocol fixture and reconciliation test.
4. Import and manually verify a representative sample.
5. Compare candidate models against the baseline using chronological splits and a final untouched holdout.
6. Build a live dashboard only after ingestion and freshness metrics can be sourced from real data.
7. Reconcile legacy Supabase migration history before attempting to bootstrap a fresh database with Supabase CLI.

## Security and deployment boundary
GitHub Pages is static hosting and cannot securely hold a Supabase service-role key. Keep privileged database access in a trusted local/server process. Do not add public table policies merely to enable a browser dashboard; use a narrowly scoped authenticated server/API layer if a dashboard is later needed.

This is a read-only research/inspection tool. Automated betting, bankroll execution, authentication bypass, and guaranteed multiplier prediction claims are out of scope.
