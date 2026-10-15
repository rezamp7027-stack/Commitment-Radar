# Commitment Radar — Stage 3 Delivery Plan

## Evidence boundary
Verified on 2026-10-15:
- GitHub repository: https://github.com/rezamp7027-stack/Commitment-Radar (default branch: main).
- Supabase project `htfrixfcirgrhlmwtkjs` is `ACTIVE_HEALTHY`.
- Database migration history includes `commitment_radar_initial_schema` and `commitment_radar_backend_hardening`.
- The `public.cr_*` domain tables inspected have RLS enabled. Policy counts vary by table; a count is not a proof that policy expressions are correct.
- Root-level README, index.html, app.js and style.css were absent at initial inspection. README and a new interactive index.html have now been committed.
- Figma file exists at https://www.figma.com/design/MSStA5yUWywjVshGj5Krgo. Automated design editing was blocked by the account's Figma MCP call limit.
- Canva presentation generation was blocked by the account credit quota.

## Current delivered slice
The browser prototype supports adding, completing, deleting and filtering commitments, calculates summary counts, and persists state in localStorage. It is intentionally labelled local-only. It is not connected to Supabase and is not a production deployment.

## Proposed architecture
1. Web interface: accessible responsive dashboard and commitment form.
2. Auth: Supabase Auth session; no privileged credentials in browser code.
3. Data access: narrow client-side data module for authenticated CRUD calls.
4. Database: existing `cr_*` schema; enforce user/org access in Postgres RLS, never only in UI.
5. Evidence and audit: use the existing schema where requirements warrant it; avoid logging secrets or sensitive payloads.

## Next engineering tasks
- [ ] Inspect every source path and hosting/deployment workflow on main.
- [ ] Confirm exact schema columns and constraints for commitments, memberships, organizations, evidence, dependencies, reviews and audit events.
- [ ] Implement Supabase client initialization using project URL and public anon/publishable key from deployment configuration.
- [ ] Add authenticated list/create/update/complete/delete flows; handle loading, empty, permission-denied, offline and expired-session states.
- [ ] Verify organization membership checks and RLS policies with at least two separate test users/organizations.
- [ ] Add automated tests for form validation, filters, overdue calculation, and authorization boundaries.
- [ ] Run production build and security checks, inspect the resulting diff, and only then consider deployment.

## Acceptance checks
- A user cannot read or mutate another organization's commitments by changing a request payload.
- Unauthenticated requests cannot access private commitment records.
- No service-role key, secret, or personal data is committed to the frontend repository.
- Dashboard summary counts match the rows returned by the authenticated database query.
- Mobile layouts work at narrow widths and controls remain keyboard accessible.
- Tests and deployment are reported as complete only with fresh, inspectable evidence.

## Supervised agent-team contract (proposed, not executed)
- A-01 Implementation: change only approved frontend files; deliver commit and test notes.
- A-02 Independent verifier: read-only review of diff, tests, RLS policy expressions, and acceptance evidence; cannot edit production code.
- Human owner: approve schema changes, production writes, secrets/configuration, and deployment.
- Stop/escalate on missing schema assumptions, failed RLS isolation, unexpected repository changes, exposed credentials, or ambiguous write outcomes.

No independent Codelit agent execution, production deployment, or end-to-end test run is claimed by this document.
