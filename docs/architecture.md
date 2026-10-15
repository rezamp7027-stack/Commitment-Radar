# Commitment Radar — Reference Architecture

## Verified system versus proposal
Verified:
- Supabase project is active/healthy.
- Core `cr_*` tables exist for organizations, memberships, projects, commitments, evidence, dependencies, reviews, and audit events.
- RLS is enabled on the inspected application tables.
- Workspace creation is exposed through the authenticated `cr_create_organization(p_name)` RPC.
- The browser client now uses Supabase Auth and reads/writes `cr_commitments` through the authenticated client.

Not yet verified:
- Successful live browser sign-in and CRUD against the project.
- Cross-organization isolation using separate real test accounts.
- Hosting and deployment workflow.

## Request path
1. User opens the static frontend.
2. User supplies the project URL and public anon/publishable key in the connection settings.
3. Supabase Auth establishes an email/password session.
4. The frontend reads the user's memberships and related organization names.
5. The user chooses a workspace or calls the existing organization-creation RPC.
6. The client queries or mutates `cr_commitments` with the current session JWT.
7. PostgreSQL RLS and the existing helper functions make the authorization decision; frontend filtering is not an authorization control.
8. The UI updates only after a database operation succeeds and surfaces failures otherwise.

## Module seams
- UI layer: rendering, accessible forms, filters, loading/error/empty states.
- Supabase adapter: Auth, organization membership discovery, and commitment CRUD.
- Authorization seam: PostgreSQL RLS and `private.cr_is_member` / `private.cr_can_edit` / related helpers.
- Durable state: existing PostgreSQL `cr_*` tables; browser storage holds only the public client configuration and Supabase's session state.

## Security invariants
- The browser may contain only the public anon/publishable key.
- Every write must be authorized by database policy; hiding buttons is insufficient.
- User/organization identifiers supplied by the browser are untrusted.
- Test isolation with separate accounts before any production launch.
- Do not bypass RLS with a service-role key in client code.

## Failure behavior
- Missing/invalid public config: show connection settings and do not make database calls.
- Authentication error: show a bounded user-facing message.
- No workspace: explain the state and offer authenticated workspace creation.
- Query/write error: keep an explicit error state; do not claim success.
- Unknown network outcome: reload the authoritative row state before retrying a destructive operation.

## Release gates
- Pass the runtime checks in `docs/verification-checklist.md`.
- Verify RLS isolation and role permissions with real test accounts.
- Confirm hosting, HTTPS, Auth redirect allow-list, and email confirmation settings.
- Complete a fresh independent code/security review.
