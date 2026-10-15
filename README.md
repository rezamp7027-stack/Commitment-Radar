# Commitment Radar

A commitment-tracking product designed to make promises visible, reviewable, and actionable.

## Current state
- The Supabase project `htfrixfcirgrhlmwtkjs` was reported `ACTIVE_HEALTHY` when checked.
- The database contains `cr_*` tables for organizations, memberships, projects, commitments, evidence, dependencies, reviews, and audit events.
- The browser client supports Supabase email/password authentication, workspace discovery/creation, commitment CRUD, project management, evidence records, review requests/decisions, and a read-only audit view.
- The PWA foundation is implemented on `feature/pwa-foundation`: standalone manifest, install prompt, service worker, static offline fallback, and separated `app.js` / `styles.css` files. It is not yet merged into `main`.
- The frontend uses the project's **public publishable key** as a default. It is intended for browser use; it is not a secret. Do not replace it with a service-role or secret key.
- GitHub Actions static contract tests passed on the PWA branch (20 tests on the current branch revision at the time of this update). Isolated local Supabase Auth/PostgREST RLS integration tests passed. Browser/device E2E, hosted two-account verification, and deployment remain unverified.

## Run
Serve root `index.html` over HTTPS or a local static web server. The page is preconfigured for the associated Supabase project. Open **Connection** only if you need to change the project URL/key. Use a public anon/publishable key only.

Sign in or create an account. If email confirmation is enabled, confirm the address before signing in. Create a workspace if the account has no memberships.

The app loads `app.js` and `styles.css` from the same origin and imports Supabase JS v2 from `https://esm.sh/@supabase/supabase-js@2`; internet access to that CDN is required. The offline fallback is intentionally informational; authenticated workspace data is not cached offline. A user-provided override for public configuration is stored in this browser's local storage. Supabase session persistence is handled by the Supabase client.

## Verification
Run local static checks with Node.js 22 or newer:

```sh
node --test tests/*.test.mjs
```

GitHub Actions is configured to run the same checks on pushes and pull requests to `main`. Static tests do not replace browser integration tests or RLS isolation tests.

## Security
- Only use a public anon/publishable key in the browser.
- Never commit service-role keys, secret keys, passwords, session tokens, or real user data.
- PostgreSQL RLS is the authorization source of truth. UI filters are not security controls.
- Validate organization isolation with two separate test accounts before production use.

## Engineering documentation
- [Architecture](docs/architecture.md)
- [PWA release checklist](docs/pwa-release-checklist.md)
- [Stage 3 delivery plan](docs/stage-3-delivery-plan.md)
- [Verification checklist](docs/verification-checklist.md)
- [Supervised agent-team contract](docs/agent-team-contract.md)

## Design direction
Dark navy surfaces, off-white typography, restrained teal accents, and clear commitment status/deadline cues. The saved Canva UI handoff is not yet synchronized with the current schema and frontend; a correction is staged as an unsaved preview pending approval. Figma review was blocked by the connected Starter plan's tool-call limit, so visual parity is unverified.
