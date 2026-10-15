# Commitment Radar — Verification Checklist

## Scope and evidence
- Target: `index.html` on the `main` branch.
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
- Inline module script parsed successfully after stripping the browser import line and wrapping the module body in an async function.
- Commitment status values were checked against the database CHECK constraint: `open`, `in_progress`, `blocked`, `done`, `cancelled`.
- Priority values were checked against the database CHECK constraint: `low`, `normal`, `high`, `urgent`.
- The browser code contains no service-role key.
- The app's source was fetched back from GitHub after the last change.

## Required runtime tests — NOT RUN
1. Configure the actual project URL and public key; confirm the client connects.
2. Sign up with a test account and complete email confirmation if enabled.
3. Sign in, create a workspace, reload, and confirm the workspace remains available.
4. Create a commitment with each supported priority and source type.
5. Complete and reopen a commitment; confirm database status is `done` then `open`.
6. Delete a test commitment and confirm it no longer appears.
7. Test no-due-date, due-today, overdue, and completed records.
8. Test invalid email, wrong password, expired session, offline/network failure, and missing configuration.
9. Use two separate test users in two separate organizations. Verify neither can list, create, update, or delete the other's commitments by manipulating request filters or payloads.
10. Confirm viewer-role members cannot write, and editor/owner permissions match intended policy.
11. Check browser console for module/CDN errors and responsive keyboard navigation at mobile widths.
12. Verify the deployed host's allowed redirect URLs and email-confirmation behavior in Supabase Auth settings.

## Release blockers
- No authenticated browser integration test has been run.
- RLS policy expressions have been inspected but isolation has not been exercised with two real test users.
- No deployment workflow was found during the limited root-file inspection; production hosting and CI remain unverified.
- The app requires a public Supabase key to be configured in the browser before it can connect.
- Figma and Canva deliverables remain deferred by request/account limits.

## Safe configuration
Use only the Supabase project URL and public anon/publishable key. Never place a service-role or secret key in the repository, browser storage, HTML, or client configuration.
