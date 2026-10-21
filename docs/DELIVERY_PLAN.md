# Delivery Plan and Acceptance Matrix

## Observable outcome
A read-only Crash-feed research system that captures bounded authorized samples, parses only a confirmed final-result schema, stores candidate data privately, preserves verification provenance, and evaluates transparent baseline estimates without claiming guaranteed prediction.

## Source of truth
- Repository: https://github.com/rezamp7027-stack/Commitment-Radar
- Original source preserved: https://github.com/mohammad919192-hub/Crash-Feed-Inspector
- Active branch: main
- Supabase project: Crash (htfrixfcirgrhlmwtkjs)
- Current tables: public.crash_rounds and public.crash_predictions; both contain zero rows
- Latest verified CI at last check: tests passed on commit 6f243e72d8573e6e12b7f49b65779227bc315433
- Live endpoint schema and predictive edge remain unverified

## Traceability
| Requirement | Component | Implementation | Acceptance status |
|---|---|---|---|
| P-01 Bounded capture | C-01 | capture.py | Synthetic tests pass; live feed not verified |
| P-02 Explicit event mapping | C-02 | protocol.py | Synthetic mapping tests; real schema pending |
| P-03 Best-effort redaction | C-03 | security.py | Unit-tested; not a guarantee |
| P-04 Strict data validation | C-04 | dataset.py | Unit-tested duplicate, timestamp, and value checks |
| P-05 Verified-only analysis | C-05 | analytics.py, research.py, cli.py | Implemented; requires verified rows |
| P-06 Chronological baseline | C-06 | analytics.py, research.py | Implemented; no predictive edge claimed |
| P-07 Private database persistence | C-07 | supabase_store.py and migrations | Deployed schema; RLS and no browser table grants verified |
| P-08 Candidate sync | C-08 | sync-csv | Unit-tested; no real rows imported yet |
| P-09 Prediction ledger/evaluation | C-09 | research-supabase, evaluate-supabase | Unit-tested; ledger currently empty |
| P-10 CI | C-10 | .github/workflows/tests.yml | Python 3.11/3.12 checks passed on reviewed commit |
| P-11 Dashboard/metrics | C-11 | report.py, docs/METRICS.md | Local static HTML only; not a live dashboard |

## Next delivery sequence
1. Confirm the post-documentation Pages workflow is green.
2. Capture a small bounded sample from an authorized endpoint.
3. Review sanitized messages locally; do not share tokens, cookies, account identifiers, or session material.
4. Confirm event discriminator, stable round ID, authoritative final multiplier, timestamp semantics, and source authorization.
5. Add sanitized fixtures and parser regression tests from the confirmed schema.
6. Validate CSV using sync-csv --dry-run, then import only if the candidate contract is confirmed.
7. Manually reconcile a representative sample before marking any rows verified.
8. Run research-supabase only after enough verified timestamped history exists; use evaluate-supabase to score later outcomes.
9. Compare future candidate models against baseline on chronological splits and an untouched holdout.
10. Build a live dashboard only with a scoped authenticated API; never expose the service-role key in browser code.
11. Reconcile legacy remote migration history before using Supabase CLI to bootstrap or push a fresh project.

## Release gates
- No live-feed claim without observed endpoint reachability and an authorized source.
- No verified-outcome claim without independent reconciliation evidence.
- No predictive-edge claim without leakage-free out-of-sample improvement and uncertainty reporting.
- No service-role key in browser code, public files, or CI logs.
- No automated betting, bankroll execution, or access-control bypass.

## Reporting contract
Report changed paths, commit and workflow references, actual check results, remaining unknowns, and actions not performed. Do not infer that a project is live merely because code and schema exist.
