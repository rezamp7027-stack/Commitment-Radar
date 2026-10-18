# Commitment Radar — Product Plan (2026-10-18)

**Outcome:** Give a user one authenticated workspace to record commitments, organize them, review progress, and preserve evidence of decisions.  
**Status:** Implementation in progress; release verification remains open.  
**Sources:** Current root frontend, live Supabase schema/migration history, Figma design file, and repository verification checklist.  
**Owner:** Project owner.  
**Assumptions:** Email/password is the supported authentication method; Google OAuth is intentionally excluded. The existing Supabase project is retained and its data must not be reset or deleted.

## User and problem

A user needs a trustworthy place to record who promised what, by when, what evidence supports the commitment, and whether a second person has reviewed it. The product should surface overdue work without treating color as the only status signal or claiming a write succeeded before the server confirms it.

Current implementation evidence exists for the core interface and \`cr_*\` database contract. Real hosted authentication, CAPTCHA enforcement, role/tenant-isolation testing, and accessibility review remain release gates.

## First-release journey

Open the site → connect to the configured Supabase project → sign in or create an account → select or create a workspace → add a commitment → assign it to a project if useful → attach source context/evidence/dependencies → request a review → record an approved/rejected decision.

## Requirements

| ID | User need | Priority | Acceptance check | Status |
|---|---|---|---|
| P-01 | Secure email/password access and recovery | Must | Sign-up, confirmation, sign-in, sign-out, reset, and password update work on hosted project | Implemented in client; hosted verification open |
| P-02 | Create, edit, complete/reopen, cancel, and delete commitments | Must | Mutations confirm returned rows; RLS prevents cross-organization access | Implemented; full hosted E2E open |
| P-03 | Organize commitments into projects | Must | Create/edit/archive/reactivate project; archived projects cannot be newly assigned | Implemented; hosted E2E open |
| P-04 | Request and decide reviews | Should | Pending requests are visible; submitters cannot approve their own request; decisions are server-confirmed | Implemented; hosted role tests open |
| P-05 | Keep evidence, dependencies, and activity attached | Should | Detail view loads only permitted records; foreign keys enforce same-organization relationships | Implemented; hosted E2E open |
| P-06 | Protect organization data | Must | RLS enabled on all eight tables; security contract and multi-tenant integration tests pass | Live RLS observed; fresh CI and hosted disposable test open |
| P-07 | Keep code and design tokens aligned | Should | CSS variables match Figma variables and key dashboard fills/strokes are token-bound | Token collection created and bound |
| P-08 | Provide truthful product measurement | Later | KPI definitions have explicit denominators and no fabricated baseline | Defined in \`docs/product-kpis.md\`; instrumentation not implemented |
| P-09 | Reliable transactional email | Later | Verified sender domain, SMTP/provider configuration, templates, retry behavior, and delivery checks exist | Not enabled; Resend has no verified sending domains |

## Experience and states

Every major view must represent loading, empty, filtered-empty, validation error, permission denied, server/network error, and confirmed success. Preserve form input after recoverable errors. Keyboard focus must remain visible; at narrow viewport widths, controls must remain usable without horizontal overflow. Reduced-motion preferences must be respected.

## Success measures

Use the definitions in \`docs/product-kpis.md\`. Current data is too small for target setting. No retention, conversion, or time-series performance claim is supported until event instrumentation or historical snapshots exist.

## Highest-risk assumptions and validation

- **Auth/CAPTCHA:** client token wiring alone does not prove server-side CAPTCHA enforcement. Verify Supabase Auth settings and test invalid/expired tokens on a safe test project.
- **Tenant isolation:** RLS must be tested with separate users/organizations, including viewer/editor restrictions, on a disposable Supabase project.
- **Organization ownership:** the retained project is still under the Supabase organization named Hashttick. Connected tools cannot rename or transfer it; use the dashboard for that administrative step.
- **Release status:** merge only after the latest GitHub Actions checks pass and hosted browser verification is complete.

## Deliberate exclusions

- Google OAuth.
- Public signup without CAPTCHA protection when enabled.
- Service-role credentials in browser code.
- Destructive migration testing against the retained live project.
- Resend delivery before a sending domain is verified.
- Claims that Figma, Canva, or hosted auth are fully released before the relevant review/approval gate passes.
