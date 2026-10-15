# Commitment Radar — Phase 2 Report

## Status

Backend hardening migration applied to the linked Supabase project. Artifacts are committed under `commitment-radar/` on the isolated branch `feature/commitment-radar`; the Hashttick root files were not changed on this branch.

## Changes actually applied

1. Created authorization helpers in the non-API `private` schema with `search_path = pg_catalog`.
2. Moved the privileged organization-creation implementation into `private.cr_create_organization`; kept a public invoker wrapper for the client RPC.
3. Repointed all 22 existing RLS policies to the private membership/role helpers.
4. Revoked public/anonymous execution on the relevant functions and removed the old public authorization-helper functions.
5. Added fourteen supporting indexes for the foreign keys reported by Supabase's performance advisor.
6. Recorded migration `20261015120014_commitment_radar_backend_hardening` in Supabase migration history.
7. Added a SQL catalog contract test, backend architecture notes, and a supervised engineering-team contract.
8. Reconstructed the baseline migration at `supabase/migrations/20261015112619_commitment_radar_initial_schema.sql` from the live pre-hardening catalog, since the original SQL source could not be found in checked Git branches. This file has **not** been applied to the current project.

## Fresh verification evidence

- Supabase security advisor: **0 findings** after migration.
- Supabase performance advisor: **0 unindexed-foreign-key findings** after migration.
- All eight `cr_*` tables still have RLS enabled.
- Catalog query found no policies referencing the old public helper names.
- The organization-creation wrapper is not `SECURITY DEFINER`; anonymous execute is false and authenticated execute is true.
- The fourteen required indexes exist.
- The SQL catalog contract test executed successfully against the target project.
- An authenticated-role smoke check returned `false` for membership/edit/manage checks on a nonexistent organization, confirming the private helpers are callable under the intended role and deny a nonmember.
- All eight Commitment Radar tables remain at zero rows; no application data was inserted, updated, or deleted.
- Performance advisor reports 22 unused-index INFO findings. This is expected for a schema with no workload and is not a reason to drop the indexes before usage patterns exist.

## Remaining release gates

- Validate the reconstructed baseline plus hardening migrations in a disposable PostgreSQL/Supabase environment. The workflow and behavioral test are committed, but a completed GitHub Actions run was not observable during this session. The baseline is a catalog-based reconstruction, not a byte-for-byte recovery of the original source.
- Run authenticated integration tests with two users in separate organizations; verify cross-tenant reads and writes are denied.
- Verify viewer/editor/admin/owner permissions with actual JWT-authenticated requests.
- Add CI that runs SQL contract checks against an ephemeral database or disposable Supabase project.
- Complete frontend, visual QA, and deployment in later phases.

## Design and planning artifacts

- Figma FigJam architecture board: https://www.figma.com/board/zyZF3DvNyu5fwttuCw5rv9
- Canva editable engineering handoff: https://canva.link/1zexr7cq4cozlou
- Codelit agent-team contract is documented locally in `docs/agent-team-contract.md`. Codelit templates were used for the contract format; no Codelit agent runtime was executed.
- Code Work, Code Verification, Supabase, Figma, and Codebase Design guidance informed the workflow. The general Code skill is intended for standalone code generation rather than editing an existing repository, so repository changes were made through GitHub after inspection.

## Not claimed

- No authenticated end-to-end integration test with real user accounts was run.
- No penetration test was performed.
- No production frontend or deployment was created in this phase.
- The Figma and Canva artifacts document the work; they are not proof of runtime behavior.
