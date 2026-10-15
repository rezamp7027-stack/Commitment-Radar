# Commitment Radar — Stage 3 Delivery Plan

## Evidence boundary
Verified on 2026-10-15:
- GitHub repository: https://github.com/rezamp7027-stack/Commitment-Radar (default branch: main).
- Supabase project `htfrixfcirgrhlmwtkjs` is `ACTIVE_HEALTHY`.
- Database migration history includes `commitment_radar_initial_schema` and `commitment_radar_backend_hardening`.
- RLS is enabled on the inspected core application tables. Policy expressions were inspected; isolation has not been tested with two real accounts.
- Existing database exposes authenticated `cr_create_organization(p_name)` for workspace creation.
- The browser client is implemented in root `index.html` and preconfigured with the project's public publishable key; connection-panel override is optional.
- GitHub Actions static-contract verification passed on `82d92ae68e5c07e56f79a8e6e64d9ec6f5c33b3b` (run 38784101439).
- Database CI passed PostgreSQL contract tests and isolated local Supabase Auth/PostgREST integration tests on the database revision (run 38755403462). This is stronger than static inspection but does not prove hosted-project parity or browser behavior.
- Supabase security advisor returned no findings; performance advisor showed 22 informational unused-index notices.
- Canva UI handoff review found schema and scope drift; Figma tool access was blocked by a Starter-plan MCP call limit. Neither artifact has been edited or marked synchronized.

## Implemented
- Responsive dashboard UI with loading, empty and error states.
- Supabase JS v2 client configuration in browser using only the public key.
- Email/password sign-in and sign-up flows.
- Workspace membership discovery, workspace creation through the existing RPC, and workspace switching.
- Authenticated commitment list/create/complete/reopen/delete flows using existing schema columns.
- Summary metrics and filters derived from the loaded workspace records.
- Architecture, verification checklist, and supervised agent-team contract.

## Current limitations
- Browser UI end-to-end tests have not been run.
- Local Auth/PostgREST integration and RLS tests passed in CI; hosted verification against a dedicated disposable project remains outstanding.
- Static CI and database CI are verified green; hosting and production deployment remain unverified.
- A public publishable key is embedded by design; no service-role/secret key is embedded.
- Canva handoff needs correction and explicit save approval; Figma access remains blocked by tool rate limit.

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
