# Commitment Radar — Plan & Ship Handoff

**Snapshot date:** 2026-10-18  
**Repository:** `rezamp7027-stack/Commitment-Radar`  
**Implementation branch:** `release/commitment-radar-hardening-20261018`  
**Pull request:** https://github.com/rezamp7027-stack/Commitment-Radar/pull/9  
**Live Supabase project:** `htfrixfcirgrhlmwtkjs`  
**Owner decision:** Preserve the existing Commitment Radar database and records; remove only verified Hashttick-specific dependencies. Do not reset or delete the project.

## Verified source snapshot

- The root static app implements email/password authentication, password recovery, Turnstile gating, workspace membership, commitment CRUD, projects, review queue, evidence/dependency views, and audit activity.
- The frontend uses the existing `public.cr_*` schema and a public publishable key; it must never use a service-role key.
- Eight application tables have RLS enabled.
- Live migration history contains three Commitment Radar migrations, including audit-trigger hardening.
- The audit-trigger hardening migration is applied live and is now being tracked under its observed migration version in the repository.
- The connected Supabase organization is still named **Hashttick**. The available connector does not expose organization rename or project-transfer operations.
- The Phase 4 Figma file `cQoWTowRsC5NkTpabUb4L0` now has a `Commitment Radar` token collection and an editable `Current Implementation` screen; matching dashboard paints were bound to its tokens.
- The original multi-screen Figma file `CueLiOMpV0m7OY7BEYEFcs` already had a 27-variable `Commitment Radar Tokens` collection. Its colors, scopes, CSS code syntax, and design-system hex labels were synchronized; 635 Product UI paints and 109 Design System paints were bound to shared variables.
- Canva handoff documents contain stale statements about no frontend and mixed migration history. Draft corrections are being prepared and require approval before saving.
- Auth security still has a Supabase Advisor warning for leaked-password protection being disabled. The available connected tools do not expose this Auth setting.

## Traceability

| Requirement | Component | Change / evidence | Acceptance gate |
|---|---|---|---|
| CR-01 Preserve data | Supabase | Existing schema/data retained; no reset or destructive cleanup | Re-query table counts and migration history after changes |
| CR-02 Audit trigger hardening | PostgreSQL migration | Fixed `search_path`, explicit schema qualification, revoke direct execution | SQL security contract passes against local disposable Supabase |
| CR-03 Frontend/backend contract | `app.js`, `index.html`, `styles.css` | Existing schema usage and public key; CSS now exposes shared token names | Static contract and browser smoke tests pass |
| CR-04 RLS tenant isolation | `cr_*` tables and policies | RLS enabled; private helper functions and same-org foreign keys | Local integration tests plus separate hosted disposable-project test |
| CR-05 Design/code parity | Figma + CSS | 19 color, spacing, and radius variables; matching dashboard fills/strokes bound | Review Figma canvas and token values |
| CR-06 Documentation truth | README, auth setup, verification checklist, architecture docs | Updated current project facts; historical docs remain dated records | Search for contradictory current-state claims |
| CR-07 Product metrics | `docs/product-kpis.md` | Definitions and data-quality checks, no fabricated baseline | Validate formulas against representative authorized test data |
| CR-08 Release readiness | GitHub Actions and Supabase Auth | CI, hosted auth, SMTP, CAPTCHA configuration, leaked-password protection | Do not mark production-ready until all gates are evidenced |

## Remaining gates

1. Review the pull request and its GitHub Actions results; merge only after all applicable checks pass.
2. Run the local Supabase migration reset and real Auth/PostgREST integration harness in CI.
3. Verify the hosted app in a real browser with a test account and inspect network/console errors.
4. Configure and verify Site URL, redirect allow-list, reliable SMTP, and Supabase Auth CAPTCHA/Turnstile secret.
5. Enable leaked-password protection in Supabase Auth and confirm the Security Advisor warning clears.
6. Use a separate disposable Supabase project for destructive tenant-isolation and role tests; do not run those tests against the retained live project.
7. Complete the Supabase organization rename/transfer manually in the Dashboard if the organization itself must no longer be named Hashttick.
8. Review the Canva drafts before they are saved. No Canva draft is considered published or finalized until the owner approves the preview.

## Scope boundaries

- No Google OAuth: email/password is the supported auth flow.
- No service-role key in the browser.
- No deletion of the live project, auth users, tables, or records.
- No claim of production readiness without hosted browser and Auth/RLS evidence.
- Resend/React Email integration is not enabled: there is no verified sending domain or configured provider secret in the current project. Do not send real emails or add provider credentials without setup and verification.
