# Commitment Radar

A commitment-tracking product designed to make promises visible, reviewable, and actionable.

## Current state
- The Supabase project `htfrixfcirgrhlmwtkjs` was reported `ACTIVE_HEALTHY` when checked.
- The database contains `cr_*` tables for organizations, memberships, projects, commitments, evidence, dependencies, reviews, and audit events.
- The browser client now supports Supabase email/password authentication, organization/workspace discovery and creation, and commitment CRUD through the authenticated client.
- The app requires the project's public anon/publishable key to be configured in the Connection panel. Do not use a service-role or secret key in the browser.
- Runtime integration and cross-organization RLS isolation have not yet been verified; see the checklist below.
- This repository is not confirmed deployed. No production release is claimed.

## Run
Serve the repository's root `index.html` over HTTPS or a local static web server. Open **Connection**, enter:
1. Project URL: `https://htfrixfcirgrhlmwtkjs.supabase.co`
2. Public anon/publishable key from Supabase Project Settings → API Keys.

Then sign in or create an account. If email confirmation is enabled, confirm the address before signing in. Create a workspace if the account has no memberships.

The page imports Supabase JS v2 from `https://esm.sh/@supabase/supabase-js@2`; internet access to that CDN is required. The public configuration is saved in this browser's local storage. Supabase session persistence is handled by the Supabase client.

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
