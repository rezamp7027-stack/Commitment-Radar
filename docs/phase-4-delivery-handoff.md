# Phase 4 delivery handoff — current status

## Scope decision

Google OAuth was cancelled on 2026-10-18. Commitment Radar authentication is email/password only, with email confirmation when configured, password recovery, and Supabase Auth CAPTCHA.

## Implemented on main

- Removed the Google sign-in button and Google OAuth client flow from `index.html` and `app.js`.
- Updated the static contract tests to assert Google OAuth is absent while email sign-in, sign-up, and password recovery remain.
- Updated the authentication setup guide and README.
- Removed the OAuth-only `supabase/functions/verify-turnstile/index.ts` source file.
- Retired the deployed `verify-turnstile` function with HTTP 410 and enabled JWT verification.
- Removed the obsolete Edge Function type-check job from the GitHub Actions workflow.
- Closed the dedicated Google OAuth PR. The broader Phase 4 candidate must not be merged wholesale if it contains the cancelled OAuth flow.

## Verification status

- Confirmed by reading the current GitHub main-branch files that the HTML and JavaScript no longer contain the Google button, `signInWithOAuth`, or Google provider call.
- Confirmed email/password sign-in, sign-up, and password recovery code remain.
- Confirmed the obsolete Edge Function source was removed and its deployed endpoint was replaced.
- Parsed the current frontend JavaScript successfully.
- The full Node.js static test suite has not yet been independently executed in this environment; verify the GitHub Actions run for the latest main commit before calling the change fully tested.
- The Supabase connector does not provide a control to disable the Google provider in Auth settings. An administrator must still disable Google under Authentication → Sign In / Providers to prevent provider-side OAuth outside this app UI.

## Remaining release work

1. Verify the latest GitHub Actions static-contract run succeeds.
2. Disable the Google provider in Supabase Auth settings.
3. Test email sign-in, sign-up, confirmation, CAPTCHA rejection cases, and password recovery in the hosted app.
4. Run browser tests for workspace and commitment/project/review workflows.
5. Test tenant isolation and role permissions using separate accounts against a dedicated test project.

## Shared Supabase project safety

The project `htfrixfcirgrhlmwtkjs` has mixed Commitment Radar/Hashttick migration history. No database tables or records were changed for this request. Do not reset or destructively test the shared project.
