# Commitment Radar — Phase 3 Design Report

**Date:** 2026-10-15  
**Status:** Design draft created; awaiting product-owner review before frontend implementation  
**Branch:** `main`  
**Figma:** https://www.figma.com/design/CueLiOMpV0m7OY7BEYEFcs

## Outcome

Created a new editable Figma design file with six product screens and a design-system page. The work is a design specification, not a shipped frontend, live prototype, or deployment.

## Artifacts

- **Product UI page:** `Product UI`
  - `01 Dashboard — Desktop` (1440 × 1000)
  - `02 Commitments — Desktop` (1440 × 1000)
  - `03 Commitment Detail — Desktop` (1440 × 1000)
  - `04 New Commitment — Desktop` (1440 × 1000)
  - `05 Review Queue — Desktop` (1440 × 1000)
  - `06 Dashboard — Mobile` (390 × 844)
- **Design System page:** semantic color palette, typography, spacing/radius references, product rules, and five editable Figma components.
- **Local variables:** 27 named tokens in the `Commitment Radar Tokens` collection.
- **Typeface:** IBM Plex Sans (selected as a proposed product-design decision; no existing frontend source was found to establish an existing font standard).
- **Canva:** Phase 3 handoff presentation generation was requested. The design link is not recorded as complete until a generated presentation can be verified.

## Screen scope

| Screen | Core purpose | Main elements |
|---|---|---|
| Dashboard | Surface team delivery health | Open/due/blocked/completed metrics, delivery trend, attention items, recent commitments |
| Commitments | Find and triage commitments | Search, status/priority/project filters, due dates, status, owner, pagination |
| Commitment detail | Understand one commitment | Description, status, priority, confidence, owner, counterparty, project, due date, source excerpt/link, dependencies, activity |
| New commitment | Capture a trackable outcome | Title, details, project, counterparty, owner, due date, priority, confidence, source type, source excerpt, source URL |
| Review queue | Make explicit review decisions | Pending items, submitter/timestamp, decision checklist, note, approve/return actions |
| Mobile dashboard | Preserve core overview on small screens | Compact summary, attention panel, upcoming commitments, bottom navigation |

## Design-system foundations

- Semantic brand, surface, text, border, and success/warning/danger/info/review colors.
- Spacing references: 2, 4, 8, 12, 16, 24, 32 px.
- Radius references: small, medium, large, full.
- Editable component samples: primary button, secondary button, default field, blocked status badge, summary metric card.
- Status is never communicated by color alone; each status also has a text label.
- Desktop-first operational views plus one mobile overview frame.
- All screen elements are editable Figma layers; the deliverable is not a flattened screenshot.

## Supabase schema alignment

The design was checked against the existing `cr_*` schema read-only. The observed domain tables are:

- `cr_organizations`
- `cr_memberships`
- `cr_projects`
- `cr_commitments`
- `cr_evidence`
- `cr_dependencies`
- `cr_reviews`
- `cr_audit_events`

The commitment form and detail view use fields observed in `cr_commitments`, including title, details, counterparty, owner name, due date, status, priority, confidence, source type, source excerpt, source URL, and project relationship. Review and evidence concepts correspond to their existing tables.

**Data safety:** this phase performed read-only schema inspection only. No migration was applied, no Supabase data was inserted or changed, and all names/counts/dates in the mockups are illustrative examples—not production data. The linked Supabase project also contains Hashttick migrations; no unrelated Hashttick objects were changed.

## Verification evidence

- Figma creation returned file key `CueLiOMpV0m7OY7BEYEFcs`.
- Figma inspection confirmed six screen frames and a Design System page.
- Figma inspection confirmed 27 local design-token variables and five reusable components.
- Dashboard and mobile dashboard screenshots were reviewed. The spacing-token swatch layout was corrected after visual inspection.
- Supabase table and migration listing were read-only; all eight `cr_*` tables reported RLS enabled and zero rows at inspection time.
- No frontend build, browser end-to-end test, accessibility audit, or production deployment was performed in Phase 3.

## Acceptance gates before Phase 4

1. Product owner reviews the six screens and confirms the information architecture.
2. Confirm whether IBM Plex Sans and the blue/navy palette are accepted.
3. Confirm whether the first implementation should include all five desktop views or prioritize a smaller vertical slice.
4. Convert the accepted Figma screens into frontend components, using the existing Supabase schema and authorization model.
5. Add empty, loading, validation, error, and permission-denied states during implementation; they are not yet fully represented as separate frames.

## Explicit limitations

- No production frontend code was written in this phase.
- The screens are not wired to live Supabase queries.
- Prototype navigation/actions are not connected.
- No live product data is displayed.
- No hosted integration test, penetration test, or accessibility certification was performed.
- Codelit architecture and agent-team templates informed the handoff format; no Codelit agent runtime was executed.
