# Commitment Radar — Supervised Engineering Team Contract

**Mode:** Proposed workflow, not a deployed or independently running agent team  
**Outcome:** Safely harden and verify the backend without modifying unrelated Hashttick functionality  
**Human owner:** Repository/database owner  
**Trigger:** Manual only  
**Source of truth:** Live Supabase catalog/advisors and the versioned GitHub branch  
**Scope:** `commitment-radar/` only; Supabase changes limited to `cr_*` objects and the dedicated `private.cr_*` helpers

## Minimal roster

| ID | Responsibility | Allowed resources | Prohibited actions | Output / check |
|---|---|---|---|---|
| A-01 — Schema Inspector | Read catalog, constraints, RLS policies, grants, migrations, and advisor findings | Read-only Supabase SQL; list tables/migrations/advisors; GitHub read | No DDL, no row writes, no secrets | Inventory with exact object names and source evidence |
| A-02 — Migration Author | Draft additive SQL and versioned migration source | Dedicated Commitment Radar branch and `cr_*` schema | No Hashttick root edits, no dropping tables/data, no production deploy | Migration reviewed against current catalog; explicit rollback/compatibility notes |
| A-03 — Independent Verifier | Check post-migration state against requirements | Read-only SQL, advisor checks, contract test | No fixing findings, no merging/deploying | Pass/fail matrix tied to live query results |
| H-01 — Human Approver | Authorize scope-changing or irreversible operations | Exact diff, target project/ref, test results | No implicit approval from model output | Explicit approval before merge, release, or destructive action |

These are proposed roles for a supervised workflow, not evidence that four autonomous agents ran.

## Ordered workflow

1. A-01 captures baseline: branch/ref, eight table definitions, RLS policies, grants, function definitions, foreign keys, indexes, migration history, and advisor output.
2. A-02 creates a versioned additive migration on the dedicated branch and writes the exact target project/ref into the report.
3. Human review confirms the target is `htfrixfcirgrhlmwtkjs`, the scope is only Commitment Radar objects, and no existing user rows will be deleted or rewritten.
4. The migration is applied once; the migration version is recorded.
5. A-03 independently reruns the catalog contract, RLS/policy inspection, function privilege checks, and Supabase security/performance advisors.
6. Stop if any query fails, an object is missing, the target project/ref differs, any unrelated object changes, or an unexpected row count changes. Do not retry a failed DDL blindly.
7. Human approval is required before creating a PR into a deployment branch, merging, deploying frontend code, or adding integrations.

## State and safety

- Persist migration source, applied migration version, current branch head, test output, advisor output, and known gaps.
- Keep all data-changing side effects separate from generated recommendations.
- No credentials or service-role keys in source, prompts, reports, or frontend assets.
- For uncertain migration outcomes, inspect migration history and catalog before retrying.
- Any changed migration SQL requires a new migration version; never silently rewrite an already-applied migration.
- Re-run approval if project, branch, scope, SQL payload, or deployment destination changes.

## Acceptance checks

| Test | Expected result | Current evidence |
|---|---|---|
| All eight tables exist and have RLS | Pass | Observed in live catalog |
| Public authorization helper RPCs removed | Pass | Observed after migration |
| Organization RPC invoker wrapper and grants are correct | Pass | Observed after migration |
| Fourteen FK supporting indexes exist | Pass | SQL catalog contract passed |
| Security advisor | Zero findings | Observed after migration |
| Unindexed FK advisor | Zero findings | Observed after migration |
| Real user A cannot read organization B | Pass (local Supabase) | Run `38741601962`: real Auth JWT + PostgREST integration test passed |
| Viewer cannot mutate records | Pass (local Supabase) | Run `38741601962`: viewer project creation denied |
| Owner can create organization and is owner membership | Pass (local Supabase) | Run `38741601962`: authenticated RPC and owner membership passed |
| Reconstructed baseline + hardening migration in clean-room PostgreSQL 16 | Confirmed | GitHub Actions run `38732428069` passed both migrations and both SQL test scripts; hosted Supabase provisioning remains unverified |

## Phase 2 Auth integration execution boundary

- The real Auth/PostgREST harness is `supabase/tests/auth_rls_integration.mjs`.
- It creates unique temporary users and records only in a dedicated disposable Supabase project; production project ref `htfrixfcirgrhlmwtkjs` is explicitly refused by CI.
- The default local Supabase Auth/PostgREST job passed 11/11 scenarios in GitHub Actions run `38741601962`.
- The additional hosted job is gated by repository variable `ENABLE_SUPABASE_AUTH_INTEGRATION=true` and secrets `SUPABASE_TEST_URL`, `SUPABASE_TEST_ANON_KEY`, and `SUPABASE_TEST_SERVICE_ROLE_KEY`.
- The regular CI run checks JavaScript syntax and SQL contract behavior; the local Auth integration job independently checks real JWT propagation and PostgREST/RLS behavior.
- Latest full CI: run `38741601962` passed; optional hosted parity job was skipped pending disposable-project configuration.

## Related Codelit resource

[Explore Agent Team templates in Codelit](https://codelit.io/agent-templates)

This document is a proposed contract, not a saved or deployed Codelit workflow.
