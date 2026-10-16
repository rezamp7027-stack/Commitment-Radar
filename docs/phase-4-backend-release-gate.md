# Phase 4 — Backend & Release Gate

Last reviewed: 2026-10-16

## Current verified evidence

- The repository contains two ordered migrations: the initial Commitment Radar schema and a backend-hardening migration.
- The backend contract includes eight `cr_*` tables: organizations, memberships, projects, commitments, evidence, dependencies, reviews, and audit events.
- A read-only Supabase inspection on 2026-10-16 returned project status `ACTIVE_HEALTHY`, PostgreSQL 17, and all eight `cr_*` application tables with RLS enabled.
- Observed row counts at inspection: organizations 1, memberships 1, commitments 1, audit events 2, and projects/evidence/dependencies/reviews 0. These are live records; do not reset, truncate, seed over, or replay migrations against this environment.
- The live migration ledger returned two Commitment Radar entries (`commitment_radar_initial_schema`, `commitment_radar_backend_hardening`). A prior Canva handoff described mixed Commitment Radar/Hashttick history; this discrepancy and shared project reference must be resolved before any write operation. The safe assumption remains that this is a shared environment.
- The security advisor currently reports `auth_leaked_password_protection` as WARN (disabled). Remediation: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- The performance advisor reports 19 unused-index notices. These are informational and are not sufficient evidence to remove indexes; review workload/query plans before any change.
- The live Edge Function inventory is empty: `verify-turnstile` is not deployed.
- The backend-hardening migration uses a non-API `private` schema for security-definer membership helpers, limits function grants, adds RLS policies, and adds foreign-key-supporting indexes.
- Existing automated suites cover PostgreSQL schema/security contracts and a real local Supabase Auth/PostgREST integration harness; these do not prove hosted configuration.

## Environment safety rule

**Do not apply migrations, reset the database, seed test users, or run the destructive Auth/RLS integration harness against `htfrixfcirgrhlmwtkjs`.** The integration harness creates and deletes users and organizations. A dedicated disposable Commitment Radar project is required for hosted integration tests. Creating a new Supabase project/branch can incur cost and requires explicit cost approval.

## Release blockers

1. Complete the latest CI run on the current branch head, including static contract checks, Deno type-checking of `verify-turnstile`, PostgreSQL contracts, and local Supabase Auth/PostgREST integration.
2. Resolve access and environment ownership. Do not mutate the current shared project; use a dedicated disposable Commitment Radar project for hosted auth/RLS tests.
3. Configure Google OAuth credentials and Supabase callback/redirect allow-list, then deploy `verify-turnstile` with JWT verification disabled and set `TURNSTILE_SECRET_KEY` as an Edge Function secret (not only as an Auth CAPTCHA setting).
4. Enable leaked-password protection after confirming the desired Auth policy and plan support.
5. Run the browser application against the dedicated project: valid/invalid/expired Turnstile; Google sign-in success/cancel; sign-up/sign-in/sign-out; workspace creation; commitment CRUD; project CRUD; evidence/dependency CRUD; review request/decision; and error recovery.
6. Validate tenant isolation with two organizations and distinct test users.
7. Validate roles: owner/admin/editor can edit where allowed; viewer cannot write; a review creator cannot decide their own pending review; non-members cannot read records.
8. Verify update/delete paths fail explicitly on zero affected rows and preserve form values on recoverable errors.
9. Test mobile viewport, keyboard navigation, focus visibility, reduced motion, malformed URLs, CDN/network failure, expired sessions, and failed PostgREST responses.
10. Complete independent review of the exact candidate commit before merging or deploying.

## Security invariants

- Browser code may use only the public anon/publishable key. Never expose service-role or secret keys.
- RLS is the authorization boundary; UI permission gating is only a usability aid.
- User IDs and organization IDs received from browser inputs are untrusted.
- Every organization-scoped relation must be constrained to the same organization.
- Do not invent schema columns or enums. Current commitment statuses: `open`, `in_progress`, `blocked`, `done`, `cancelled`; priorities: `low`, `normal`, `high`, `urgent`; confidence: `low`, `medium`, `high`; review states: `pending`, `approved`, `rejected`.
- Never claim a hosted integration test passed based solely on a local PostgreSQL contract test.

## Current product boundary

The frontend implements authentication, workspace selection/creation, commitments, projects, review decisions, evidence, dependencies, and recent audit history. It does not currently provide automatic commitment extraction from conversations, scheduled reminders, invitations, file uploads, full audit pagination/filtering, or evidence editing in place. These should be separate product decisions, not implied by the current UI.

## Release decision

Current state: **not yet production-ready**. The code and local backend contracts are substantially implemented, but real browser verification, hosted tenant-isolation/role testing, deployment configuration, and final CI confirmation remain release gates. Keep the PR in draft until those gates have evidence.


## Google OAuth and Turnstile release gate

- Google OAuth must be configured in Supabase Auth with the exact callback and GitHub Pages redirect allow-list.
- The Google button is disabled until Turnstile returns a token. Before starting OAuth, the browser calls the `verify-turnstile` Edge Function; the function validates the token with Cloudflare and checks origin and hostname.
- Deploy the function with JWT verification disabled because the request is pre-authentication, and set `TURNSTILE_SECRET_KEY` as an Edge Function secret. A secret saved only in Supabase Auth CAPTCHA protection settings does not automatically become an Edge Function secret.
- Keep the Cloudflare secret out of GitHub and frontend JavaScript. The public site key may appear in frontend code.
- Do not merge or claim this path is live until the Edge Function deployment and real browser tests are verified. Supabase project permissions must be resolved first; do not deploy or run migrations against the mixed-history project as a workaround.
- This UI-level CAPTCHA adds friction but does not prevent a determined client from calling Supabase OAuth directly. Authentication and RLS remain the security boundaries.
