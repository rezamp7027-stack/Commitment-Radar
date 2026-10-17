# Phase 4 backend release gate — current status

## Authentication scope

Google OAuth has been cancelled. The main application uses Supabase email/password authentication, email confirmation where configured, password recovery, and Cloudflare Turnstile CAPTCHA through Supabase Auth.

- The Google sign-in UI and `signInWithOAuth` client flow have been removed from `index.html` and `app.js`.
- The Google OAuth pull request was closed and must not be merged.
- The `verify-turnstile` source file used only to gate Google OAuth has been removed from this repository.
- The deployed Supabase function was replaced with a retired endpoint (HTTP 410) and JWT verification is enabled.
- The Google provider may still be enabled in Supabase Auth settings. The available project connector does not expose provider-toggle controls, so a project administrator must disable Google under Authentication → Sign In / Providers to fully disable provider-side OAuth.

## Remaining release gates

1. Confirm the static-contract GitHub Actions workflow passes on the latest `main` commit.
2. Configure and test email sign-up, confirmation, sign-in, sign-out, and password recovery in the hosted app.
3. Confirm Supabase Auth CAPTCHA is configured with the correct Cloudflare Turnstile secret; the browser site key is public and is not a secret.
4. Run hosted browser tests for workspace creation, commitment CRUD, project CRUD, evidence/dependency CRUD, review decisions, and recoverable API errors.
5. Validate tenant isolation and role restrictions using separate test accounts on a dedicated Commitment Radar test project.

## Shared-project safety

The connected Supabase project `htfrixfcirgrhlmwtkjs` has mixed Commitment Radar/Hashttick migration history. Do not reset the project, replay migrations, or perform destructive schema/data testing against it. The only Supabase-side change made for cancelling Google OAuth was retiring the specifically named `verify-turnstile` function; no tables or data were changed.

## Acceptance criteria

- The deployed UI contains no Google sign-in button or Google OAuth client call.
- Email/password sign-in, sign-up, CAPTCHA token submission, and password recovery remain present.
- The retired Edge Function rejects calls and is not referenced by the current frontend.
- GitHub Actions static contract checks pass.
- Provider-side Google OAuth is disabled in Supabase Auth settings by an administrator.
