# Commitment Radar — Phase 2 Report

## Status

Backend hardening migration applied to the linked Supabase project and source committed to the isolated branch `commitment-radar/backend-hardening`.

## Changes actually applied

1. Created authorization helpers in the non-API `private` schema with `search_path = pg_catalog`.
2. Moved the privileged organization-creation implementation into `private.cr_create_organization`; kept a public invoker wrapper for the client RPC.
3. Repointed all 22 existing RLS policies to the private membership/role helpers.
4. Revoked public/anonymous execution on the relevant functions and removed the old public authorization-helper functions.
5. Added fourteen supporting indexes for the foreign keys reported by Supabase's performance advisor.
6. Recorded migration `20261015120014_commitment_radar_backend_hardening` in Supabase migration history.
7. Added a SQL catalog contract test and architecture notes in this branch.

## Fresh verification evidence

- Supabase security advisor: **0 findings** after migration.
- Supabase performance advisor: **0 unindexed-foreign-key findings** after migration.
- All eight `cr_*` tables still have RLS enabled.
- Catalog query found no policies referencing the old public helper names.
- The organization-creation wrapper is not `SECURITY DEFINER`; anonymous execute is false and authenticated execute is true.
- The fourteen required indexes exist.
- All eight Commitment Radar tables remain at zero rows; no application data was inserted, updated, or deleted.
- Performance advisor reports 22 unused-index INFO findings. This is expected for a schema with no workload and is not a reason to drop the indexes before usage patterns exist.

## Known gap carried forward

The database history contains `20261015112619 commitment_radar_initial_schema`, but the original SQL source was not found in the checked repository branches during Phase 1. The hardening migration is versioned and committed. Before claiming clean-room reproducibility, recover or reconstruct and validate a complete baseline schema migration for a new Supabase project. Do not rerun the initial schema against the current project.

## Not claimed

- No authenticated end-to-end integration test with real user accounts was run.
- No penetration test was performed.
- No production frontend or deployment was created in this phase.
- The Figma architecture board is a documentation artifact, not proof of runtime behavior.
