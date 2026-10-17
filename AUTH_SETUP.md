# Commitment Radar — email authentication and Turnstile setup

Commitment Radar uses Supabase email/password authentication only. Google OAuth is intentionally not supported in the application.

## Email authentication

1. In Supabase Authentication settings, configure the Site URL and redirect allow-list to include the deployed GitHub Pages URL.
2. If email confirmation is enabled, configure a reliable SMTP provider and test sign-up, confirmation, sign-in, and password recovery.
3. Keep password recovery redirects restricted to the intended app URL.

## Cloudflare Turnstile

1. Configure a Turnstile widget to allow the deployed hostname.
2. The public site key is configured in `app.js`; public site keys are expected to be visible in the browser.
3. In Supabase Dashboard → Authentication → Bot and Abuse Protection, enable CAPTCHA, select Cloudflare Turnstile, and enter its secret key.
4. Do not put the Turnstile secret in GitHub, `app.js`, `index.html`, or browser storage.

## Verification before release

- Test sign-in, sign-up, email confirmation, and password recovery in the hosted app.
- Verify missing, invalid, expired, and reused CAPTCHA tokens fail closed when CAPTCHA is enabled.
- Test organization isolation and role restrictions with separate test accounts against a dedicated test project.
- The currently connected Supabase project has mixed Commitment Radar/Hashttick migration history; do not reset it or use it for destructive tests.

Google OAuth and the former `verify-turnstile` OAuth-gating Edge Function are not part of this release path.
