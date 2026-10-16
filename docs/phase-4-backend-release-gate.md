# Phase 4 — Backend & Release Gate

Last reviewed: 2026-10-16

## Current verified evidence

- The repository contains two ordered migrations: the initial Commitment Radar schema and a backend-hardening migration.
- The backend contract includes eight `cr_*` tables: organizations, memberships, projects, commitments, evidence, dependencies, reviews, and audit events.
- The connected Supabase project `htfrixfcirgrhlmwtkjs` reports all eight application tables with RLS enabled. The security advisor returned no security lints in the most recent inspection.
- The inspected project has zero rows in the listed application tables at inspection time. This is only a point-in-time observation, not a guarantee that the environment is disposable.
- The backend-hardening migration uses a non-API `private` schema for security-definer membership helpers, limits function grants, adds RLS policies, and adds foreign-key-supporting indexes.
- Existing automated suites cover PostgreSQL schema/security contracts and a real local Supabase Auth/PostgREST integration harness.
- The connected project migration history includes both Commitment Radar and Hashttick migrations. Treat it as shared and unsafe for destructive test execution until ownership/isolation is explicitly resolved.

## Environment safety rule

**Do not apply migrations, reset the database, seed test users, or run the destructive Auth/RLS integration harness against `htfrixfcirgrhlmwtkjs`.** The integration harness creates and deletes users and organizations. A dedicated disposable Commitment Radar project is required for hosted integration tests. Creating a new Supabase project/branch can incur cost and requires explicit cost approval.

## Release blockers

1. Complete the latest local Supabase integration CI run and capture its final status.
2. Run the browser application against a dedicated disposable project: sign-up/sign-in/sign-out, workspace creation, commitment CRUD, project CRUD, evidence/dependency CRUD, review request/decision, and error recovery.
3. Validate tenant isolation with two organizations and distinct test users.
4. Validate roles: owner/admin/editor can edit where allowed; viewer cannot write; a review creator cannot decide their own pending review; non-members cannot read records.
5. Verify all destructive and update paths return explicit failure on zero affected rows and preserve entered form values on recoverable errors.
6. Test mobile viewport, keyboard navigation, focus visibility, reduced motion, malformed URLs, CDN/network failure, expired sessions, and failed PostgREST responses.
7. Configure the intended hosting origin, HTTPS, Supabase Auth redirect allow-list, and email-confirmation behavior.
8. Complete independent review of the exact candidate commit before merging or deploying.

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
