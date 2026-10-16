# Commitment Radar — Phase 4 Delivery Handoff

Last updated: 2026-10-16

## Source snapshot

- Repository: https://github.com/rezamp7027-stack/Commitment-Radar
- Candidate branch: `work/phase-4-quality-ui-20261016`
- Candidate revision when this handoff was prepared: `506302fefdc896d8532ab059f59d041618f1e1f3`
- Primary candidate PR: https://github.com/rezamp7027-stack/Commitment-Radar/pull/6
- Separate OAuth PR retained as reference only: https://github.com/rezamp7027-stack/Commitment-Radar/pull/7
- Product/design baseline: https://www.figma.com/design/CueLiOMpV0m7OY7BEYEFcs
- Canva Phase 3 handoff: https://www.canva.com/d/7WejWEBxQLfIL-E

## Accepted decisions and constraints

- RLS and database policies are the authorization boundary; client-side disabled buttons are usability controls only.
- Browser code may contain only the Supabase public publishable/anon key and Turnstile public site key. Never commit provider client secrets, Turnstile secret, service-role keys, or other privileged credentials.
- The connected Supabase project `htfrixfcirgrhlmwtkjs` is shared in context with Hashttick and contains live Commitment Radar rows. Do not reset it, replay migrations, seed test accounts, or run destructive integration tests against it.
- The Supabase Primary connection denied access. Read-only inspection succeeded through the linked connection labelled Hashttick; no writes were performed. Treat this as a shared environment and do not use that connection for project changes.
- Do not merge either PR or claim production readiness until the hosted auth flow, tenant isolation, role matrix, and deployed candidate are verified.
- CAPTCHA is an abuse-friction layer, not a substitute for OAuth authentication or RLS authorization.

## Traceability

| Requirement | Component / file | Owner | Acceptance evidence |
|---|---|---|---|
| Email sign-in/sign-up/recovery must require Turnstile | `app.js`, `index.html` | Engineering | Existing static contract tests; browser tests still required |
| Google OAuth must not start before server-side CAPTCHA verification | `app.js`, `supabase/functions/verify-turnstile/index.ts` | Engineering + Supabase project admin | Static contract green; function deployment and valid/invalid-token browser tests pending |
| CAPTCHA secret must remain server-side | Supabase Edge Function secret `TURNSTILE_SECRET_KEY` | Supabase project admin | Inspect Edge Function secrets and verify no secret in repo/client |
| Workspace and commitment mutations must be scoped and RLS-enforced | `app.js`, SQL migrations and tests | Engineering | PostgreSQL contract job passed; local Auth/PostgREST integration run must finish green |
| Two-tenant isolation and role permissions must hold in hosted environment | RLS policies / dedicated test project | Engineering + project admin | Two test users, separate organizations, viewer denial, reviewer self-approval denial |
| Design must remain consistent with existing product frames | Figma file and `styles.css` | Design + Engineering | Review desktop/mobile, focus states, reduced motion, error and empty states |
| Release must be reproducible and reversible | GitHub Actions + GitHub Pages | Release owner | Required CI green, reviewed PR, deployment URL verified, rollback commit identified |

## Ordered work plan

1. **Code gate:** finish the static contract and local Supabase CI jobs on the latest branch head. Fix failures before changing deployment settings.
2. **Auth implementation review:** inspect the Google handler and `verify-turnstile` function; verify no OAuth request can start when the CAPTCHA token is missing or rejected.
3. **Supabase access and isolation:** resolve Primary connector permissions with the project owner. Use a dedicated disposable Commitment Radar project for hosted tests; do not use the mixed-history project for destructive work.
4. **External setup:** configure Google OAuth credentials, Supabase callback and redirect allow-list, Turnstile site key, and the Edge Function secret. Deploy the function with JWT verification disabled only for this pre-authentication endpoint; keep origin and hostname validation.
5. **Hosted integration tests:** test valid/invalid/expired CAPTCHA; Google success and cancellation; session return; workspace creation; commitment/project CRUD; evidence/dependency CRUD; review decisions; and recoverable network/API failures.
6. **Authorization matrix:** with two users and two organizations, prove non-members cannot read, viewer cannot write, organization IDs cannot be spoofed, and review creators cannot decide their own pending reviews.
7. **Design QA:** compare the implemented UI against Figma frames; test mobile width, keyboard navigation, visible focus, reduced motion, labels, contrast, loading, empty and error states.
8. **Release review:** update the checklist with observed evidence, request review, remove Draft only when all gates are met, merge, then verify the exact GitHub Pages deployment and smoke-test it.

## Current completion ledger

| Item | Status | Evidence / next action |
|---|---|---|
| Branch conflicts against `main` | Confirmed resolved at previous branch head | PR #6 reports mergeable; recheck after latest commit |
| Phase 4 UI and workflow implementation | Implemented in candidate branch | Review exact PR diff and verify in browser |
| Google OAuth server-side Turnstile gate | Implemented in candidate source | Static contract test; live function still needs deployment and browser verification |
| Static contract CI | Passed on `ec49c67d813903ac57d4ab6b99d21a3edc63bb6e` | New commits require fresh CI results |
| PostgreSQL contract | Passed on earlier candidate run | Reconfirm on latest head if workflow completes |
| Local Supabase Auth/PostgREST integration | Pending at last observation | Wait for run result and inspect failures |
| Hosted Supabase security review | Partial read-only inspection | RLS enabled on all eight tables; one organization, one membership, one commitment, two audit events; leaked-password protection disabled; no Edge Functions deployed. No writes performed. |
| Figma auth/data-flow diagram | Created | https://www.figma.com/board/bliDYfRfVBmKNw44lJVakX |
| Canva handoff | Reviewed, not modified | Preserve existing design until a specific change is approved |
| Production deployment | Not confirmed | Do not represent candidate branch as live |

## Release decision

**Not ready to merge or deploy yet.** The next concrete action is to get the latest CI fully green, then resolve access to a dedicated disposable Supabase environment and verify the OAuth/Turnstile flow in a real browser.
