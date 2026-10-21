# Verified Status and Operations Runbook

Last checked: 2026-10-21.

## Current state

- Repository: https://github.com/rezamp7027-stack/Commitment-Radar
- Python package: `crash_feed_inspector`; Python 3.11+.
- Supabase project Crash: `htfrixfcirgrhlmwtkjs`, region `ap-southeast-2`, PostgreSQL 17.
- `public.crash_rounds` and `public.crash_predictions` exist; RLS is enabled on both.
- `anon`/`authenticated` have no direct table policies; privileged access is intended for trusted local/server processes.
- SHA-256 format, prediction interval, finite threshold, non-empty model-version, and evaluation-consistency constraints are deployed.
- `public.crash_rounds` was confirmed empty in the latest live query on 2026-10-21. No real-feed analysis or model-performance conclusion is available yet.
- Live WebSocket reachability, authorization, final-result event schema, and predictive edge are not confirmed.
- The research stability gate returns `no_signal_insufficient_recent_window` when no configured recent window can be calculated.
- Check the repository's GitHub Actions page for the current head commit's status; older passing runs do not prove the latest commit passed.

## Collection method (based on public 1xBet Crash monitoring projects)

The project uses the same general ingestion pattern seen in public examples: an authorized WebSocket endpoint -> bounded read-only message capture -> secret-field redaction -> schema-mapped extraction of completed-round events -> deduplication/conflict checks -> CSV candidate file -> Supabase ingestion -> manual reconciliation before a row is marked verified.

Important distinctions:
- The public WebSocket base address alone does not establish a working authenticated connection.
- Session-specific URLs/tokens may expire and are sensitive. Configure them only in a private local `.env`; never commit them or paste them into chat.
- Event names, round IDs, multiplier fields, and timestamps must be confirmed from a private sanitized sample. Do not guess parser paths or label arbitrary numeric messages as results.
- The current capture command is bounded and read-only. It does not place bets or interact with the game.
- A parsed result is still an unverified candidate until checked against trusted visible completed-round history.

## Investigation of the three candidate URLs (2026-10-21)

- `https://1x-bet.mobi/en/games/crash`: the inspection tool followed a regional redirect to `1xbet.es/en/games/crash`, which it could not load. No live multiplier payload was obtained.
- `https://1x-bet.mobi/en/live/crash`: the inspection tool followed a regional redirect to `1xbet.es/en/live/crash`, which it could not load. No live multiplier payload was obtained.
- `https://1xbetcrash.top/`: the accessible page describes a free/demo game and promotional content. Its “Play Now” link goes to `/go/`; the inspected destination exposed no readable feed or round payload. Treat this as an unverified third-party/demo route, not as a trusted live source.
- `wss://ma-1xbet.com/games-frame/sockets/crash`: a public example documents this as a WebSocket base, but that does not confirm current reachability or authorize a session. The project has no configured live URL or authenticated handshake result.
- The execution environment used for this inspection could not resolve external hosts at the network layer, so it could not independently perform an HTTP/WebSocket handshake. This is an environment limitation, not evidence that the endpoint is down.

Conclusion: none of these checks yielded verified live multipliers. Do not populate the database with guessed values. Next acceptance step is a bounded read-only capture from a session the user controls, with session tokens/cookies removed before any sample is shared; then confirm the final-round event schema against visible completed-round history.

## Local setup

1. Install Python 3.11 or newer.
2. Create and activate a virtual environment.
3. Install dependencies: `python -m pip install -r requirements.txt`.
4. Copy `.env.example` to `.env`.
5. Configure only an endpoint you are authorized to access. Leave parser mapping blank until sanitized messages confirm the final-result schema.
6. For database commands, set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in local `.env`. The key is privileged; never put it in browser code, the public repo, Pages, or CI logs.
7. Run tests: `python -m unittest discover -s tests -v`.

## Command sequence

- Help: `python -m crash_feed_inspector --help`
- Bounded read-only capture: `python -m crash_feed_inspector capture`
- Inspect capture: `python -m crash_feed_inspector inspect-jsonl data/messages.jsonl`
- Validate import: `python -m crash_feed_inspector sync-csv data/rounds.csv --dry-run`
- Import unverified candidates: `python -m crash_feed_inspector sync-csv data/rounds.csv`
- Research verified CSV: `python -m crash_feed_inspector research-csv data/rounds.csv`
- Create local HTML report: `python -m crash_feed_inspector dashboard-csv data/rounds.csv --output data/dashboard.html`
- Research verified timestamped database rows: `python -m crash_feed_inspector research-supabase --source SOURCE_LABEL`
- Evaluate pending research-only estimates: `python -m crash_feed_inspector evaluate-supabase --source SOURCE_LABEL`

## Data integrity rules

- CSV sync inserts only unverified candidate rows; it never verifies outcomes and ignores duplicate `(source, round_id)` conflicts rather than overwriting them.
- Reconcile candidates against trusted visible completed-round history before updating verification status.
- Research uses only verified rows with valid timestamps. Empty verified data or unavailable configured recent windows must stop the signal path.
- Historical frequency and confidence intervals are descriptive, not proof that the next round is predictable or that a betting strategy is profitable.
- Raw captures may contain sensitive session data. Redaction is best-effort; review captures privately before sharing.

## Release gates still open

1. Confirm endpoint authorization and reachability.
2. Capture a bounded sanitized sample from the actual feed.
3. Document the real completed-result schema and add a sanitized real-protocol fixture.
4. Import and manually verify a representative sample.
5. Compare candidate models against a simple baseline using chronological splits and a final untouched holdout.
6. Build a live dashboard only after ingestion and freshness metrics can be sourced from real data.
7. Reconcile the full legacy Supabase migration history before attempting to bootstrap a fresh database with Supabase CLI.

## Security and deployment boundary

GitHub Pages is static hosting and cannot securely hold a Supabase service-role key. Keep privileged database access in a trusted local/server process. Do not add public table policies merely to enable a browser dashboard; use a narrowly scoped authenticated server/API layer if a dashboard is later needed.

This is a read-only research/inspection tool. Automated betting, authentication bypass, and guaranteed multiplier prediction claims are out of scope.
