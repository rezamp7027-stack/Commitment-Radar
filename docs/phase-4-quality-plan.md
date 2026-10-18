# Phase 4 — Quality, UX, and release plan


> **Current-state addendum — 2026-10-18:** This document preserves a historical phase snapshot. The current repository has a runnable frontend at the root (`index.html`, `app.js`, `styles.css`). Live Supabase inspection now shows eight `public.cr_*` tables with RLS enabled and three Commitment Radar migrations, including the applied audit-trigger hardening migration. The latest row-count check found one organization, one membership, one commitment, and two audit events; preserve them. A targeted scan found no Hashttick-named public routines, policies, or storage buckets. The project itself remains in the Supabase organization named **Hashttick**; the connected tools do not expose organization rename/transfer controls. See the current [delivery handoff](./plan-and-ship-2026-10-18.md) where the relative path is available, and the root README for release gates.


Date: 2026-10-16

## Outcome

Bring Commitment Radar's current static browser client closer to a usable MVP while preserving the existing Supabase schema, access model, and unrelated applications.

## Scope delivered on the working branch

- Refine visual hierarchy with a cool-gray canvas, white surfaces, navy typography, blue primary actions, clear card boundaries, consistent field treatment, and responsive spacing.
- Add visible keyboard focus, semantic filter state, touch-friendly controls, and reduced-motion support.
- Add commitment search, priority filtering, and due-date / recently-updated / priority sorting.
- Add edit flow for existing commitments.
- Add source excerpt and URL capture/display using existing schema columns only.
- Validate source URLs as HTTP(S); render external links with `noopener noreferrer`.
- Preserve honest mutation feedback: check server responses and do not report success when an update affects no row.
- Expand static contract tests and release documentation.

## Remaining product scope

Contextual detail UI now supports lazy loading of `cr_evidence`, `cr_dependencies`, review history, and the ten most recent permitted `cr_audit_events`. Evidence and dependency records can be added/removed; audit history is read-only. These flows are implemented in source but remain unverified in an authenticated browser. Evidence editing, audit filtering/pagination, and comprehensive browser failure-state coverage remain follow-up work.

## Safety boundaries

- No Supabase migrations, SQL changes, cleanup, data deletion, or production writes were performed.
- The connected Supabase project `htfrixfcirgrhlmwtkjs` has migration history from Hashttick as well as Commitment Radar. Keep it unchanged until project isolation is confirmed.
- No deployment, merge, or production release is included.
- Figma concept: https://www.figma.com/design/cQoWTowRsC5NkTpabUb4L0
- Canva handoff reviewed and a correction prepared in an unsaved draft: https://www.canva.com/d/vI82lOaOD_AEzV0. Thumbnail preview retrieval returned 503; do not save until the preview is reviewed and approved.

## Architecture and supervised workflow

Keep the existing thin architecture: static browser UI → Supabase Auth session → authenticated PostgREST/RPC calls → PostgreSQL RLS and constraints. Client-side filters improve usability but never replace RLS. Deterministic code handles validation, sorting, rendering, and mutation state. Human approval is required before changing shared database infrastructure, saving the Canva revision, merging to main, or deploying.

Suggested supervised roles (design only; no independent Codelit agent execution is claimed):
- Implementation owner: make the smallest source changes and preserve existing schema contracts.
- Verification reviewer: independently inspect the diff and test evidence.
- UX reviewer: compare responsive layout, keyboard flow, status readability, and empty/error states.
- Release owner: approve environment isolation, hosted tests, merge, and deployment.

## Acceptance matrix

| Requirement | Evidence required | Status |
|---|---|---|
| UI refinement and responsive styles | Source review + browser screenshots at mobile/tablet/desktop | Implemented in branch; visual runtime check pending |
| Search, filters, and sort | Static contract tests + browser interaction tests | Implemented in branch; runtime pending |
| Edit and source context | Static contract tests + authenticated CRUD run | Implemented in branch; runtime pending |
| Schema compatibility | Existing schema inspection + no schema mutations | Existing columns reused; hosted CRUD pending |
| Tenant and role security | Dedicated hosted test project with two users and role variants | Not run |
| CI | Fresh workflow result for candidate branch/PR | Static CI passed (25 tests); PostgreSQL contract passed; final local Auth/PostgREST rerun pending |
| Deployment | Verified host, auth redirects, smoke test, rollback path | Not performed |

## Ordered next steps

1. Run static tests and inspect the exact branch diff.
2. Open a pull request so GitHub Actions can test the candidate.
3. Test the browser UI with a disposable test environment.
4. Resolve the shared-Supabase-project question before hosted security tests.
5. Review the UI against the Figma concept and synchronize Canva only after preview approval.
6. Merge and deploy only after all release gates pass.

## Codelit handoff

Planning reference: https://codelit.io/plan-and-ship

This plan is documentation. It does not mean that a Codelit agent team has executed, deployed, or approved the work.
