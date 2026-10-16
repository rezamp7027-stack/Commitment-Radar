# Commitment Radar — Google OAuth and Turnstile setup

The implementation in this branch replaces the email/password signup screen with Google sign-in and checks a Cloudflare Turnstile token through a Supabase Edge Function before starting OAuth.

## 1. Google OAuth

1. Open [Google Auth Platform](https://console.cloud.google.com/auth/clients) and create an OAuth client of type **Web application**.
2. Add this Authorized JavaScript origin:
   `https://rezamp7027-stack.github.io`
3. Add this Authorized redirect URI exactly:
   `https://htfrixfcirgrhlmwtkjs.supabase.co/auth/v1/callback`
4. In [Supabase → Google provider](https://supabase.com/dashboard/project/htfrixfcirgrhlmwtkjs/auth/providers), enable Google and paste the Google Client ID and Client Secret. Never place the Client Secret in GitHub or frontend code.
5. In [Supabase → URL Configuration](https://supabase.com/dashboard/project/htfrixfcirgrhlmwtkjs/auth/url-configuration), set Site URL to:
   `https://rezamp7027-stack.github.io/Commitment-Radar/`
   Add that same URL to the Redirect URLs allowlist.

## 2. Cloudflare Turnstile

1. Create a Turnstile widget in [Cloudflare Dashboard](https://dash.cloudflare.com/), allowing hostname `rezamp7027-stack.github.io`.
2. Copy its **Site Key** into `TURNSTILE_SITE_KEY` in `index.html`, replacing `REPLACE_WITH_CLOUDFLARE_TURNSTILE_SITE_KEY`. The site key is public; it is expected to appear in the browser.
3. Deploy `supabase/functions/verify-turnstile/index.ts` as an Edge Function named `verify-turnstile` in project `htfrixfcirgrhlmwtkjs`.
4. In Supabase Edge Function secrets, set `TURNSTILE_SECRET_KEY` to the Turnstile **Secret Key**. Keep the secret out of GitHub and the browser.
5. The function must be deployed with JWT verification disabled because users have not signed in yet; the function itself validates the Turnstile token with Cloudflare and checks the expected request origin and hostname.

## 3. Publish and test

Merge this branch only after Google provider credentials, the Turnstile site key, and the Edge Function secret are configured. GitHub Pages should then publish the updated `index.html`.

Test: (a) no CAPTCHA token keeps Google sign-in disabled, (b) an invalid/expired token is rejected by the Edge Function, (c) a valid token redirects to Google, (d) successful OAuth returns to the GitHub Pages app and loads the user's existing workspace, and (e) a failed OAuth or CAPTCHA displays a recoverable error.

## Security boundary

The CAPTCHA is verified server-side before the UI starts Google OAuth. Supabase's native OAuth authorization endpoint itself does not consume this Turnstile token, so a determined client can still initiate the provider flow directly outside this page. Google authentication and existing Supabase RLS policies remain the actual authentication and data-access controls; this UI CAPTCHA is an abuse-friction layer, not a substitute for authorization.
