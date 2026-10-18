# Commitment Radar — Implementation Audit


> **Current-state addendum — 2026-10-18:** This document preserves a historical phase snapshot. The current repository has a runnable frontend at the root (`index.html`, `app.js`, `styles.css`). Live Supabase inspection now shows eight `public.cr_*` tables with RLS enabled and three Commitment Radar migrations, including the applied audit-trigger hardening migration. The latest row-count check found one organization, one membership, one commitment, and two audit events; preserve them. A targeted scan found no Hashttick-named public routines, policies, or storage buckets. The project itself remains in the Supabase organization named **Hashttick**; the connected tools do not expose organization rename/transfer controls. See the current [delivery handoff](./plan-and-ship-2026-10-18.md) where the relative path is available, and the root README for release gates.


**Audit date:** 2026-10-15  
**Target:** `rezamp7027-stack/Commitment-Radar`, default branch `main`; connected Supabase project `htfrixfcirgrhlmwtkjs`.  
**Revision directly reviewed before this report was written:** `454c84529a1865a83a7330cc56c9b1d33495496f`.

## Outcome

The project is **partially verified, not production-ready**. Two frontend correctness defects and redundant inert auth-listener code were fixed. Fresh GitHub Actions static checks passed after the fixes. The separate database CI passed both PostgreSQL contract/RLS tests and a disposable local Supabase Auth + PostgREST integration suite. Browser end-to-end behavior and hosted-project parity remain unverified.

## Findings and repairs

1. **Fixed — commitment title could be submitted with one non-space character.** The database requires a trimmed title length of 2–240 characters, but the browser previously accepted a one-character value and let the database reject it. Added `minlength="2"` and matching trimmed JavaScript validation; added regression assertions.
2. **Fixed — cancelled commitments were miscounted.** Cancelled rows were previously included in the open/overdue metrics and showed an active checkbox. Added a dedicated cancelled-state predicate, excluded cancelled records from active/overdue calculations, and disabled the completion checkbox for cancelled records; added a regression test.
3. **Fixed — inert auth-listener registrations.** Two optional-chained registrations ran while `client` was still null, so they never registered a listener. Removed them; the real listener remains inside client initialization.
4. **Confirmed — public-key handling.** The browser uses a Supabase publishable key. No service-role or secret key pattern was found in the HTML. Public keys are intended to be visible; authorization must remain in RLS.
5. **Confirmed — database authorization shape.** RLS is enabled on the inspected `cr_*` tables. Policies rely on membership/edit/manage helpers. The connected project's security advisor returned no findings. Do not interpret this as proof that every hosted behavior is correct.
6. **Documentation/design drift — Canva UI handoff.** The handoff still describes fields such as `owner_id` and `counterparty_id`, while the current schema uses `owner_name` and `counterparty`. It also describes a broader dashboard/review/evidence UI than the current root `index.html` implements. Treat those screens as a future design specification, not as implemented functionality. Corrected text is staged in an unsaved Canva preview; no Canva edits have been saved.
7. **Unverified — Figma synchronization.** The linked Figma file is referenced in the project documentation, but the connected Figma MCP returned a Starter-plan tool-call limit before its metadata could be inspected. No Figma edits or visual-parity claims are made.
8. **Operational risk — connected Supabase project is shared.** Its migration history contains both Commitment Radar migrations and unrelated Hashttick migrations. Do not reset, clean, or run destructive test harnesses against this connected project. Use an isolated disposable project for hosted integration tests.

## Verification evidence

- Static-contract CI passed after the latest frontend fixes (8 tests): https://github.com/rezamp7027-stack/Commitment-Radar/actions/runs/38784601408
- PostgreSQL contract + isolated local Supabase Auth/PostgREST CI passed: https://github.com/rezamp7027-stack/Commitment-Radar/actions/runs/38755403462
- Supabase security advisor: no findings returned on 2026-10-15.
- Performance advisor: 22 unused-index informational notices; no indexes were removed.
- Codelit architecture and supervised-agent-team templates were reviewed as design references. No Codelit agent runtime was available or executed.

## Remaining release gates

- Run browser-level sign-up/sign-in, workspace creation/switching, commitment create/complete/reopen/delete, error, session-expiry, and mobile/keyboard tests.
- Verify hosted RLS behavior only on a dedicated disposable Supabase project; never run destructive tests against the connected shared project.
- Reconcile Canva UI handoff with the real schema and current implementation; saving Canva edits requires review of the proposed preview.
- Inspect and synchronize the existing Figma design when Figma tool access is available.
- Confirm a hosting target, redirect URLs, and deployment process before claiming a live release.
