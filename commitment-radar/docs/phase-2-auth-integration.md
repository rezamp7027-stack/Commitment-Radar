# Commitment Radar — Phase 2 Auth/RLS Integration

**Status:** Harness implemented; real hosted Auth run is gated pending a dedicated disposable Supabase test project and repository secrets.  
**Target repository:** `rezamp7027-stack/Commitment-Radar`, default branch `main`  
**Production Supabase:** `htfrixfcirgrhlmwtkjs` — not a test target.

## Scope

Phase 2 validates the authorization boundary using real Supabase Auth access tokens and PostgREST requests, rather than only setting `request.jwt.claim.sub` in PostgreSQL. The harness creates temporary test identities and organization data in a dedicated disposable project, then cleans them up.

The harness is intentionally blocked from running against the production project reference `htfrixfcirgrhlmwtkjs`. No production Auth users or test rows were created by this implementation.

## Test matrix

| ID | Scenario | Expected result |
|---|---|---|
| AUTH-01 | Create temporary identities through Supabase Auth Admin API and sign in using password grant | Each identity receives its own JWT |
| RLS-01 | Owner reads their organization | Allowed |
| RLS-02 | Owner A reads organization B, and owner B reads organization A | No rows returned |
| RLS-03 | Member of organization A queries organization B memberships | No rows returned |
| ROLE-01 | Owner, admin, and editor create a project in their own organization | Allowed |
| ROLE-02 | Viewer creates a project | Denied |
| RLS-04 | Owner A inserts a project under organization B | Denied |
| ROLE-03 | Owner and admin update organization settings | Allowed |
| ROLE-04 | Editor and viewer update organization settings | Denied |
| AUTH-02 | Anonymous role invokes organization-creation RPC | Denied |
| AUTH-03 | Authenticated owner creates organization through RPC | Organization and owner membership both exist |
| CLEAN-01 | Test cleanup | Temporary organizations and Auth identities deleted; cleanup failure fails the run |

## Enable the hosted integration job

Use a dedicated, disposable Supabase project whose schema/migrations match Commitment Radar. Do **not** use the production project.

1. Add these repository Actions secrets:
   - `SUPABASE_TEST_URL`
   - `SUPABASE_TEST_ANON_KEY`
   - `SUPABASE_TEST_SERVICE_ROLE_KEY`
2. Add repository Actions variable `ENABLE_SUPABASE_AUTH_INTEGRATION=true`.
3. Confirm the URL is not the production project URL and that the test project contains the two Commitment Radar migrations.
4. Run the workflow `Commitment Radar database contract` from `main` or push a relevant change.
5. Review both the integration output and the final test-project Auth/table counts.

The service-role key is used only inside the GitHub Actions job for creating temporary users, provisioning test memberships, and cleanup. Never commit it, print it, or use it in frontend code. The test job refuses the known production project reference.

## Local execution

Node.js 20+ is required. Supply the same three environment variables pointing to a disposable test project, then run:

```bash
node --check commitment-radar/supabase/tests/auth_rls_integration.mjs
node commitment-radar/supabase/tests/auth_rls_integration.mjs
```

The script generates unique temporary user emails/passwords at runtime and does not print credentials or tokens. It attempts cleanup in a `finally`-style error path; inspect the run result for any `CLEANUP FAILURE` before reusing the test project.

## CI behavior

- The PostgreSQL 16 contract job continues to run on `main`, on relevant pull requests, and by manual dispatch.
- The real Supabase Auth job is opt-in through the repository variable because it needs a dedicated project and a service-role secret.
- JavaScript syntax validation runs in the regular contract job even when the hosted Auth job is disabled.
- A skipped hosted Auth job is **not** counted as a passing Auth integration test.

## Limitations and acceptance

Phase 2 is not fully release-accepted until the hosted integration job has a fresh successful run against a disposable project. The CI PostgreSQL harness proves database-policy behavior with simulated claims; it does not itself prove Supabase Auth issuance, JWT propagation, or hosted PostgREST behavior. This test is an authorization regression suite, not a penetration test.
