# Commitment Radar — Verification Checklist

## Scope and evidence
- Current implementation target: `main`, root `index.html`.
- Backend target: existing Supabase project `htfrixfcirgrhlmwtkjs`, explicitly retained for Commitment Radar by the owner.
- Latest live inspection: eight `public.cr_*` tables with RLS enabled; four Commitment Radar migrations; one organization, one membership, one commitment, and two audit events were present at the last row-count check.
- The project remains in the Supabase organization named **Hashttick**; organization rename/transfer is not exposed by the connected tools.
- This is a manual/automated test plan. Tests below are not marked passed unless an actual run produced evidence.

## Implemented in the browser client
- Supabase JS v2 configuration with public anon/publishable key only.
- Email/password sign-in/sign-up and membership discovery.
- Workspace creation through `cr_create_organization(p_name)`.
- Commitment list, create, edit, complete/reopen, delete, status filters, search, priority filtering, sorting, and project assignment.
- Project create/edit/archive/reactivate workflows using existing `cr_projects` columns.
- Review request creation and approve/reject decisions using existing `cr_reviews` columns, with RLS as the authorization source of truth.
- Lazy commitment-detail sections for evidence add/remove, dependency add/remove, review history, and recent audit activity.
- Source excerpt and source URL entry/display using existing commitment columns.
- Summary counts excluding cancelled records from active/overdue metrics.
- Loading, empty, visible error, and confirmed mutation feedback states.
- Responsive layout, keyboard focus indicators, reduced-motion handling, and accessible labels for primary controls.

## Static verification
- External `app.js` browser module parses as an async function body after stripping the Supabase browser import; `index.html` loads `./app.js` and `./styles.css`.
- Commitment status values match database constraints: `open`, `in_progress`, `blocked`, `done`, `cancelled`.
- Priority values match database constraints: `low`, `normal`, `high`, `urgent`.
- No service-role or secret key pattern is embedded in the frontend.
- Regression checks cover trimmed title validation, cancelled metrics, auth-listener setup, search/sort wiring, edit/source fields, safe HTTP(S) URLs, project and review contracts, evidence/dependency/audit queries, zero-row mutations, disabled-state preservation, responsive styles, focus, and reduced motion.
- Static-contract CI passed on `main` commit `4dd15e0aff5692ffd68c9dc185feec341b57949d`; after adding the isolated browser smoke job, the static-contract job also passed on commit `8bcac2b079ecdd96cc38004d7437a108758303a6`. Latest browser smoke execution is tracked in GitHub Actions and must be checked before release. Static contracts and mocked-browser checks do not prove hosted auth or RLS behavior.
- PostgreSQL contract suite passed on the same candidate run; isolated local Supabase Auth/PostgREST integration is still running on that commit. The local integration suite passed on an earlier candidate commit, but the final run should complete before the PR leaves draft.

## Required browser and hosted tests — NOT YET VERIFIED
1. Open the branch build in a browser and inspect console/network errors, including the Supabase JS CDN.
2. Sign up with a test account, confirm email if enabled, sign in, sign out, and sign in again.
3. Create a workspace, reload the page, switch workspaces, and verify membership persistence.
4. Create, edit, complete, reopen, and delete a test commitment; verify the database response and rendered state after each action.
5. Save and render source excerpt and URL; reject malformed or non-HTTP(S) URLs.
6. Test all priorities, all supported statuses, no due date, due today, overdue, blocked, cancelled, and completed records.
7. Create/edit/archive/reactivate projects; confirm archived project labels, workspace switching, and project assignment do not leak across organizations.
8. Request a review, verify duplicate pending requests are rejected, approve/reject from a different account, verify submitters cannot decide their own requests, and test viewer/editor role restrictions.
9. Test search, status filters, priority filter, each sort mode, zero records, and filters with no matching records.
11. Test wrong password, invalid email, expired session, CDN/network failure, failed writes, and a mutation returning zero affected rows.
12. Test keyboard-only navigation, focus visibility, 320px mobile width, tablet layout, and reduced-motion preference.
13. Test organization isolation and viewer/editor/owner role permissions using at least two accounts on a dedicated disposable hosted Supabase project.
14. Verify authentication redirect URLs and email-confirmation settings on the intended hosting domain.
15. Run an independent review of the exact candidate commit and capture fresh CI results.

## Environment and release blockers
- The connected Supabase project migration history includes Hashttick migrations as well as Commitment Radar migrations. Do not reset, clean, replay migrations, or change live schema/data while project isolation is unresolved.
- The new Chromium smoke test mocks Supabase and Turnstile; no authenticated browser end-to-end run has been recorded for this candidate.
- Hosted cross-organization isolation and role permissions remain unverified.
- Hosting configuration and a live deployment have not been verified.
- Evidence/dependency management and audit history are implemented on `main` but not yet authenticated-browser-verified; evidence editing and full audit filtering/pagination are not included.
- The Figma concept exists in a separate file; visual parity has not been checked in a running browser.
- Canva handoff has an unsaved draft correction; thumbnail preview retrieval returned a Canva 503, so the draft has not been saved pending user review.

## Safe configuration
Use only the public anon/publishable key in the browser. Never place a service-role or secret key in the repository, browser storage, HTML, or client configuration.


## Email authentication and CAPTCHA release gate
- [x] Frontend includes an explicit Cloudflare Turnstile widget and token lifecycle.
- [x] Sign-in, sign-up, and password-recovery requests pass the token to Supabase Auth.
- [x] Password recovery uses a non-enumerating success message, an explicit redirect URL, and a password-update screen after the recovery callback.
- [x] The public Turnstile site key is configured in `app.js` for `rezamp7027-stack.github.io`.
- [x] User reports enabling Supabase Auth CAPTCHA and saving the Turnstile secret in the dashboard; this dashboard state has not been independently verified. Never commit the secret.
- [ ] Verify Supabase Auth rejects missing/invalid/expired/replayed tokens in a hosted test.
- [ ] Enable Supabase Auth leaked-password protection; Security Advisor currently reports this disabled.
- [ ] Verify SMTP delivery, confirmation redirect, and password-recovery redirect.


## Live Supabase audit findings (read-only inspection on 2026-10-16)
- [x] Confirmed all eight `public.cr_*` tables have RLS enabled.
- [x] Inspected current table policies: reads are membership-scoped through `private.cr_is_member`; writes use role checks through `private.cr_can_edit`/ `private.cr_can_manage`, and review decisions prevent submitters from reviewing their own requests.
- [x] Inspected the private authorization helpers: they use `SECURITY DEFINER`, a fixed `search_path = pg_catalog`, and compare membership against `auth.uid()`.
- [ ] **Release security warning:** Supabase Security Advisor reports leaked-password protection is disabled. Enable it under Supabase Auth password security settings and verify it before launch.
- [ ] Verify these policies with two distinct authenticated users in a dedicated disposable hosted project. Catalog inspection is not a substitute for adversarial cross-tenant integration tests.
- [ ] Supabase Performance Advisor reports 19 unused indexes. The tables are empty/new, so do not drop indexes based on this signal alone; re-evaluate after representative workload and query plans exist.
