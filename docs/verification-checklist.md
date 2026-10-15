# Commitment Radar — Verification Checklist

## Scope and evidence
- Candidate target: `feature/pwa-foundation` branch of `rezamp7027-stack/Commitment-Radar` (not yet merged to `main`).
- Backend: Supabase project `htfrixfcirgrhlmwtkjs`.
- This is a manual/automated test plan. Tests below are not marked passed unless an actual run produced evidence.

## Implemented in the current browser client
- Supabase JS v2 is loaded as an ES module.
- Project URL and public anon/publishable key can be configured in-browser.
- Email/password sign-in and sign-up flows.
- Organization discovery via `cr_memberships` and `cr_organizations`.
- Workspace creation via `cr_create_organization(p_name)`.
- Commitment list, create, complete/reopen, delete, and filters.
- Summary counts derived from the loaded organization commitments.
- Loading, empty, and visible error states.
- Responsive CSS and semantic labels for primary controls.

## Static verification completed
- `app.js` parsed successfully after stripping the external Supabase import and wrapping the module body in an async function.
- Commitment status values were checked against the database CHECK constraint: `open`, `in_progress`, `blocked`, `done`, `cancelled`.
- Priority values were checked against the database CHECK constraint: `low`, `normal`, `high`, `urgent`.
- The browser code contains no service-role or secret key pattern; the embedded key is a public publishable key.
- Regression checks cover the database's two-character trimmed title minimum, cancelled-status metrics, and auth-listener setup.
- - PWA and workspace-module contract tests passed in GitHub Actions (20 tests) on commit `f1f182bb1ad4d3dd7f96b5d7f73be5fc2646295d`: https://github.com/rezamp7027-stack/Commitment-Radar/actions/runs/38792932818
- The database CI run passed both the PostgreSQL contract suite and isolated local Supabase Auth/PostgREST integration suite on database commit `7d2aa233fa04fabd69bb3080c0c1ac1fbd52c302`: https://github.com/rezamp7027-stack/Commitment-Radar/actions/runs/38755403462
- Supabase security advisor returned no findings on 2026-10-15. Performance advisor reported 22 unused-index notices; these are informational on a low-usage/empty dataset and do not justify dropping indexes without workload evidence.
- RLS policy definitions and helper functions were inspected. Local CI covers tenant isolation and viewer write denial; hosted two-account verification against the connected project remains NOT RUN.

## Remaining manual/hosted runtime tests — NOT RUN
- Browser E2E for the new Projects, Evidence, Review Queue, Audit views and PWA install/offline lifecycle.
1. Configure the actual project URL and public key; confirm the client connects.
2. Sign up with a test account and complete email confirmation if enabled.
3. Sign in, create a workspace, reload, and confirm the workspace remains available.
4. Create a commitment with each supported priority and source type.
5. Complete and reopen a commitment; confirm database status is `done` then `open`.
6. Delete a test commitment and confirm it no longer appears.
7. Test no-due-date, due-today, overdue, and completed records.
8. Test invalid email, wrong password, expired session, offline/network failure, and missing configuration.
9. Repeat tenant-isolation checks against a dedicated disposable hosted Supabase project using two separate test users; verify neither can list, create, update, or delete the other's commitments by manipulating request filters or payloads. Local CI already tests these invariants on an isolated local stack.
10. Confirm hosted viewer-role members cannot write, and editor/owner permissions match intended policy. Local CI already tests viewer write denial and the organization RPC.
11. Check browser console for module/CDN errors and responsive keyboard navigation at mobile widths.
12. Verify the deployed host's allowed redirect URLs and email-confirmation behavior in Supabase Auth settings.

## Release blockers
- No authenticated browser integration test has been run.
- Hosted cross-organization isolation and role permissions against a dedicated disposable project remain unverified; local integration CI passed.
- Static verification CI is confirmed green, but no hosting/deployment workflow or live deployment was verified.
- The page is preconfigured with a public publishable key; browser configuration override remains optional. The public key is not a secret.
- Figma inspection/update was blocked by the connected Starter plan's MCP tool-call limit. Canva handoff content was inspected and found to have drift from the implemented schema and UI; no Canva edits have been saved.

## Safe configuration
Use only the Supabase project URL and public anon/publishable key. Never place a service-role or secret key in the repository, browser storage, HTML, or client configuration.
