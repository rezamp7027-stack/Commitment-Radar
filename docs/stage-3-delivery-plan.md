# Commitment Radar — Stage 3 Delivery Plan

## Evidence boundary
Verified on 2026-10-15:
- GitHub repository: https://github.com/rezamp7027-stack/Commitment-Radar (default branch: main).
- Supabase project `htfrixfcirgrhlmwtkjs` is `ACTIVE_HEALTHY`.
- Database migration history includes `commitment_radar_initial_schema` and `commitment_radar_backend_hardening`.
- RLS is enabled on the inspected core application tables. Policy expressions were inspected; isolation has not been tested with two real accounts.
- Existing database exposes authenticated `cr_create_organization(p_name)` for workspace creation.
- The browser client is implemented in root `index.html`; it requires a public anon/publishable key to be entered in the connection panel.
- Static parsing of the inline module script succeeded after the latest fixes. This is not a browser integration test.
- Figma editing and Canva presentation generation are deferred because of tool account limits; no design deliverable completion is claimed.

## Implemented
- Responsive dashboard UI with loading, empty and error states.
- Supabase JS v2 client configuration in browser using only the public key.
- Email/password sign-in and sign-up flows.
- Workspace membership discovery, workspace creation through the existing RPC, and workspace switching.
- Authenticated commitment list/create/complete/reopen/delete flows using existing schema columns.
- Summary metrics and filters derived from the loaded workspace records.
- Architecture, verification checklist, and supervised agent-team contract.

## Current limitations
- No browser-based integration test has been run.
- Cross-organization isolation and role permissions still require runtime verification with separate test accounts.
- Hosting, CI, and production deployment status remain unverified.
- The public key must be configured by the user in the browser; no key or secret was embedded in source.
- Figma and Canva are deferred by request.

## Architecture
1. Browser interface: accessible responsive dashboard and forms.
2. Supabase Auth: email/password session.
3. Client adapter: authenticated reads/writes using the current session JWT.
4. PostgreSQL: existing `cr_*` schema; RLS and database helper functions authorize access.
5. Human approval: required for schema changes, production configuration, and deployment.

## Release gates
- Complete every runtime test in `docs/verification-checklist.md`.
- Verify user/org isolation and viewer/editor permissions using two or more test accounts.
- Check browser console, mobile layouts, authentication redirects, and email confirmation.
- Perform a fresh independent code/security review tied to the exact commit.
- Do not report the app as production-ready until tests and hosting are evidenced.

## Supervised agent-team contract
See `docs/agent-team-contract.md`. It is a design artifact only: no independent Codelit agent execution or deployment is claimed.
