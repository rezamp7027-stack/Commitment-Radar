# Supabase operations and migration history

## Live project observed during the 2026-10-21 audit

- Project name: Crash
- Project ref: `htfrixfcirgrhlmwtkjs`
- Tables: `public.crash_rounds`, `public.crash_predictions`
- Both tables have Row Level Security enabled.
- `anon` and `authenticated` have no table grants and there are no client policies. This is intentional for a server-only research store.
- The deployed migration history includes `20261021105220_crash_research_schema` plus older Commitment-Radar migrations and a legacy-clear migration.

## Importing candidate rounds

The Python command `sync-csv` uses the PostgREST endpoint from a trusted local/server process. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the local ignored `.env` file. Never place the service-role key in frontend code, GitHub secrets for this workflow, committed files, screenshots, or logs.

Run `python -m crash_feed_inspector sync-csv data/rounds.csv --dry-run` first. Then omit `--dry-run` to send rows. After enough rows have been independently verified and have valid timestamps, run `python -m crash_feed_inspector research-supabase --source your-source-label` to append baseline estimates, and `python -m crash_feed_inspector evaluate-supabase --source your-source-label` to evaluate pending research-only estimates against later verified rounds. Only rows with `verified=false` are imported; every imported row is explicitly stored as `verified=false` and `verification_status=pending_manual_confirmation`. Verified CSV rows are skipped. Existing `(source, round_id)` rows are ignored rather than overwritten. Raw WebSocket frames and credentials are never uploaded.

## Migration safety warning

The original repository contained two un-applied draft files with migration filenames that do not match the live project's recorded migration version. They have been moved to `supabase/archive/` for traceability, not executable deployment. The live database records the Crash schema at version `20261021105220`; the repository contains that schema baseline and a later additive integrity migration.

The live migration history also includes older Commitment-Radar migration versions. Before using `supabase db push` or attempting to recreate the project from scratch, reconcile those legacy versions against the intended local history and test on a disposable project. Do not force-reset or drop production data to make the histories match.
