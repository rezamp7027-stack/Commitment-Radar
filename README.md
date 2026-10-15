# Commitment Radar

A commitment-tracking product designed to make promises visible, reviewable, and actionable.

## Current state
- The Supabase project `htfrixfcirgrhlmwtkjs` was reported `ACTIVE_HEALTHY` when checked.
- The database contains `cr_*` tables for organizations, memberships, projects, commitments, evidence, dependencies, reviews, and audit events.
- The browser client supports Supabase email/password authentication, workspace discovery/creation, and commitment CRUD.
- The frontend uses the project's **public publishable key** as a default. It is intended for browser use; it is not a secret. Do not replace it with a service-role or secret key.
- Runtime integration and cross-organization RLS isolation have not yet been verified. This repository is not confirmed deployed.

## Run
Serve root `index.html` over HTTPS or a local static web server. The page is preconfigured for the associated Supabase project. Open **Connection** only if you need to change the project URL/key. Use a public anon/publishable key only.

Sign in or create an account. If email confirmation is enabled, confirm the address before signing in. Create a workspace if the account has no memberships.

The page imports Supabase JS v2 from `https://esm.sh/@supabase/supabase-js@2`; internet access to that CDN is required. A user-provided override for public configuration is stored in this browser's local storage. Supabase session persistence is handled by the Supabase client.

## Verification
Run local static checks with Node.js 22 or newer:

```sh
node --test tests/static-contract.test.mjs
```

GitHub Actions is configured to run the same checks on pushes and pull requests to `main`. Static tests do not replace browser integration tests or RLS isolation tests.

## Security
- Only use a public anon/publishable key in the browser.
- Never commit service-role keys, secret keys, passwords, session tokens, or real user data.
- PostgreSQL RLS is the authorization source of truth. UI filters are not security controls.
- Validate organization isolation with two separate test accounts before production use.

## Engineering documentation
- [Architecture](docs/architecture.md)
- [Stage 3 delivery plan](docs/stage-3-delivery-plan.md)
- [Verification checklist](docs/verification-checklist.md)
- [Supervised agent-team contract](docs/agent-team-contract.md)

## Design direction
Dark navy surfaces, off-white typography, restrained teal accents, and clear commitment status/deadline cues. Figma and Canva deliverables are deferred; the Figma link is a planning artifact, not proof that the design is complete.
