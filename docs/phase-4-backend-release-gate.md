# Phase 4 backend release gate — current status

## Authentication scope

Google OAuth has been cancelled. The main application uses Supabase email/password authentication, email confirmation where configured, password recovery, and Cloudflare Turnstile CAPTCHA through Supabase Auth.

- The Google sign-in UI and `signInWithOAuth` client flow have been removed from `index.html` and `app.js`.
- The Google OAuth pull request was closed and must not be merged.
- The `verify-turnstile` source file used only to gate Google OAuth has been removed from this repository.
- The deployed Supabase function was replaced with a retired endpoint (HTTP 410) and JWT verification is enabled.
- The Google provider may still be enabled in Supabase Auth settings. The available project connector does not expose provider-toggle controls, so a project administrator must disable Google under Authentication → Sign In / Providers to fully disable provider-side OAuth.

## Remaining release gates

1. Confirm both static-contract and isolated browser-smoke GitHub Actions jobs pass on the latest `main` commit.
2. Configure and test email sign-up, confirmation, sign-in, sign-out, and password recovery in the hosted app.
3. Confirm Supabase Auth CAPTCHA is configured with the correct Cloudflare Turnstile secret; the browser site key is public and is not a secret.
4. Run hosted browser tests for workspace creation, commitment CRUD, project CRUD, evidence/dependency CRUD, review decisions, and recoverable API errors.
5. Enable Supabase Auth leaked-password protection; the current Security Advisor reports it disabled.
6. Validate tenant isolation and role restrictions using separate test accounts on a dedicated Commitment Radar test project.

## Shared-project safety

The owner has approved retaining Supabase project `htfrixfcirgrhlmwtkjs` for Commitment Radar. Latest inspection found eight `cr_*` tables with RLS enabled and four Commitment Radar migrations; targeted scans found no Hashttick-named public routines, policies, or storage buckets. Preserve the existing organization, membership, commitment, and audit-event records. Do not reset the project or perform destructive testing against it. The project remains in the Supabase organization named **Hashttick**; moving/renaming the organization requires an administrative dashboard action. The retired `verify-turnstile` Edge Function returns HTTP 410 and is not called by the current frontend.

## Acceptance criteria

- The deployed UI contains no Google sign-in button or Google OAuth client call.
- Email/password sign-in, sign-up, CAPTCHA token submission, and password recovery remain present.
- The retired Edge Function rejects calls and is not referenced by the current frontend.
- GitHub Actions static contract and isolated browser smoke checks pass on the latest `main` commit.
- Provider-side Google OAuth is disabled in Supabase Auth settings by an administrator.
- Supabase Auth leaked-password protection is enabled.
- Authenticated browser and hosted RLS/tenant-isolation tests pass.
