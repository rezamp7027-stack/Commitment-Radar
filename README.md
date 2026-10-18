# Commitment Radar

A commitment-tracking product designed to make promises visible, reviewable, and actionable.

## Current implementation

- Responsive dashboard with workspace selection, summary metrics, commitment status filters, text search, priority filtering, and sorting.
- Supabase email/password sign-in and sign-up, password recovery, membership discovery, and workspace creation.
- Authentication is email/password only; Google OAuth is intentionally not part of the product.
- Commitment create, edit, complete/reopen, delete, project assignment, and source-context display for excerpts and external URLs.
- Project create/edit/archive/reactivate workflows scoped to the selected workspace.
- Review request creation, pending-review visibility, and approve/reject decisions with an optional decision note.
- Explicitly scoped project and review queries; mutations require a confirmed returned row before showing success.
- Explicit loading, empty, error, and mutation-confirmation states.
- The browser uses a public publishable key. It is not a secret; never replace it with a service-role or secret key.
- `main` includes UI refinement, source context, search/sort, edit flow, project management, review workflow, and an isolated Playwright browser smoke test in CI. The smoke test mocks Supabase and Turnstile; it does not replace authenticated end-to-end or hosted role/tenant-isolation tests.
- Commitment details now lazily load evidence, dependencies, review history, and the ten most recent permitted audit events. Evidence and dependencies can be added/removed; audit history is read-only. Browser behavior and role-based authorization still require end-to-end verification.

## Run

Serve root `index.html` over HTTPS or a local static web server. The page is preconfigured with a Supabase URL and public publishable key. Open **Connection** only to change the project URL/key. Use a public anon/publishable key only.

Sign in or create an account. If email confirmation is enabled, confirm the address before signing in. Create a workspace if the account has no memberships.

The page imports Supabase JS v2 from `https://esm.sh/@supabase/supabase-js@2`; internet access to that CDN is required. A user-provided public configuration override is stored in this browser's local storage. Supabase session persistence is handled by the Supabase client.

## Supabase project scope and isolation

The owner has explicitly approved retaining Supabase project `htfrixfcirgrhlmwtkjs` for Commitment Radar. The latest live inspection found eight `public.cr_*` tables, RLS enabled on all eight, and three recorded Commitment Radar migrations. A targeted scan found no Hashttick-named public routines, policies, or storage buckets. This is evidence about the inspected database objects, not proof that the Supabase organization has been renamed or transferred.

The project is still listed inside the Supabase organization named **Hashttick**. The available connected tools do not support renaming that organization or transferring the project. Do not reset the database, replay baseline migrations, or delete provider-side resources to simulate separation. Use an isolated disposable project for destructive integration tests; organization ownership/renaming remains an administrative task in Supabase Dashboard.

## Verification

Run local static checks with Node.js 22 or newer:

```sh
node --test tests/static-contract.test.mjs
```

The CI browser smoke test runs in Chromium with mocked Supabase Auth and Turnstile to verify the auth UI, mode switching, CAPTCHA gating, and visible auth errors. It does not replace authenticated browser tests, hosted RLS isolation tests, CAPTCHA server-validation tests, or a verified deployment. See [the verification checklist](docs/verification-checklist.md).

## Security

- Only use a public anon/publishable key in the browser.
- Never commit service-role keys, secret keys, passwords, session tokens, or real user data.
- PostgreSQL RLS is the authorization source of truth. UI filters are not security controls.
- Validate organization isolation with two separate test accounts against a dedicated disposable test project before production use.
- Confirm that zero-row updates/deletes and authorization errors are shown honestly; never show success until the server confirms the mutation.

## Engineering documentation

- [Architecture](docs/architecture.md)
- [Stage 3 delivery plan](docs/stage-3-delivery-plan.md)
- [Phase 4 quality plan](docs/phase-4-quality-plan.md)
- [Verification checklist](docs/verification-checklist.md)
- [Supervised agent-team contract](docs/agent-team-contract.md)

## Design direction

The current UI uses a cool-gray canvas, white surfaces, navy typography, blue primary actions, explicit semantic status labels, visible keyboard focus, responsive layouts, and reduced-motion support. The companion Figma concept is [Commitment Radar — Phase 4 UI Refinement](https://www.figma.com/design/cQoWTowRsC5NkTpabUb4L0). Canva's existing handoff has an unsaved draft correction to its stale status and next-step wording. Canva's thumbnail preview endpoint returned a 503, so it has not been saved or treated as synchronized.


## Email authentication and CAPTCHA setup

The email/password flow supports sign-in, sign-up with email confirmation, password-reset email requests, and a password-update screen after the recovery callback. CAPTCHA is implemented with Cloudflare Turnstile and its token is passed directly to Supabase Auth for sign-in, sign-up, and password recovery. Supabase Auth must validate the token server-side; a client-only widget is not a security control.

Before enabling this in production:

1. Create a Cloudflare Turnstile widget and allowlist the exact production hostname (and a separate local/test hostname if needed).
2. Replace `REPLACE_WITH_CLOUDFLARE_TURNSTILE_SITE_KEY` in `app.js` with the public site key. Never put the Turnstile secret in this repository or browser code.
3. In Supabase Dashboard → Authentication → Bot and Abuse Protection, enable CAPTCHA, select Cloudflare Turnstile, and enter its secret key. This setting is not managed by the static frontend.
4. Configure the production Site URL and redirect allowlist for email confirmation and password recovery.
5. Configure custom SMTP for reliable email delivery and test sign-up, confirmation, sign-in, and password reset using a test account.
6. Test invalid, expired, missing, and reused CAPTCHA tokens; requests must fail closed when CAPTCHA is enabled.

Until steps 1–4 are completed and verified on the intended hosted environment, CAPTCHA is code-integrated but not production-enabled.
