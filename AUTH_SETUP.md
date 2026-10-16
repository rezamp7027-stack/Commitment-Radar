# Commitment Radar — Google OAuth and Turnstile setup

This branch requires a server-side Turnstile verification step before the UI starts Google OAuth.

## Google OAuth

1. Create a Google OAuth client of type Web application.
2. Add the JavaScript origin: `https://rezamp7027-stack.github.io`.
3. Add this redirect URI: `https://htfrixfcirgrhlmwtkjs.supabase.co/auth/v1/callback`.
4. Enable Google in [Supabase Auth Providers](https://supabase.com/dashboard/project/htfrixfcirgrhlmwtkjs/auth/providers) and save the Client ID and Client Secret there. Never commit the Client Secret.
5. Set the Supabase Site URL to `https://rezamp7027-stack.github.io/Commitment-Radar/` and add that URL to the redirect allow-list.

## Cloudflare Turnstile

1. Configure the Turnstile widget to allow hostname `rezamp7027-stack.github.io`.
2. The public site key is in `app.js`; it is expected to be visible in the browser.
3. Deploy `supabase/functions/verify-turnstile/index.ts` as `verify-turnstile` to the intended Supabase project with JWT verification disabled, because this check occurs before authentication.
4. Set `TURNSTILE_SECRET_KEY` under **Supabase Edge Function secrets**. Saving the secret only in Supabase Auth CAPTCHA settings does not configure this Edge Function.
5. Do not put the secret in GitHub, `app.js`, `index.html`, or client storage.

## Verification before release

- Without a Turnstile token, the Google button remains disabled.
- Invalid, expired, wrong-hostname, or wrong-origin tokens are rejected.
- A valid token is verified server-side before the browser starts Google OAuth.
- OAuth returns to the GitHub Pages app and the authenticated user can load only authorized workspaces.
- Failed verification and OAuth attempts show recoverable errors and reset the CAPTCHA.
- Test the hosted flow in a dedicated disposable Commitment Radar project. The currently connected project has mixed Commitment Radar/Hashttick migration history and must not be reset or used for destructive tests.

## Security limitation

The verification function gates this page's Google button; it does not modify Supabase's native OAuth endpoint. A determined client may start the provider flow outside this UI. CAPTCHA is an abuse-friction layer, not authorization. Supabase Auth and RLS remain the authentication and data-access controls.
