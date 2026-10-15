# Commitment Radar

A commitment tracking product focused on making promises visible, reviewable, and actionable.

## Current implementation status
- Supabase project `htfrixfcirgrhlmwtkjs` is `ACTIVE_HEALTHY`.
- The database contains the Commitment Radar schema and two migrations: `commitment_radar_initial_schema` and `commitment_radar_backend_hardening`.
- The frontend repository is present, but root-level `README.md`, `index.html`, `app.js`, and `style.css` were not found during inspection. Do not assume a live UI is deployed from this repository.
- Figma file: https://www.figma.com/design/MSStA5yUWywjVshGj5Krgo

## Next implementation slice
1. Confirm the repository's actual source tree and deployment workflow.
2. Implement the responsive dashboard and commitment lifecycle against the existing schema.
3. Configure Supabase using a public anon/publishable key only; never expose service-role keys.
4. Verify RLS isolation, CRUD flows, loading/error/empty states, and responsive layouts before release.

## Security notes
- Keep RLS enabled on all `cr_*` application tables.
- Treat every browser input and database row as untrusted.
- Never commit secrets, service-role keys, or user data.
- Do not report deployment or tests as successful without direct evidence.

## Design direction
Dark navy surfaces, off-white typography, restrained teal accent, high-contrast commitment status and deadline cues. Any metrics in design mockups are illustrative until backed by live queries.
