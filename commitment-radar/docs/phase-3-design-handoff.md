# Commitment Radar — Phase 3 Architecture & Design Handoff

**Status:** Proposed design contract; not a deployed Codelit workflow  
**Source of truth:** Figma Phase 3 file and existing `cr_*` schema  
**Figma:** https://www.figma.com/design/CueLiOMpV0m7OY7BEYEFcs  
**Repository:** https://github.com/rezamp7027-stack/Commitment-Radar

## 1. Decision and scope

**Recommended shape:** a responsive web application organized around a small set of deep product modules: workspace navigation, commitment query/listing, commitment details, commitment creation, and review decisions.

**Why:** users need to capture promises, assign accountability, inspect evidence and dependencies, and make explicit review decisions without losing organization-level isolation.

**Verified existing system:** Supabase has eight `cr_*` domain tables with RLS enabled. The Phase 2 Auth/RLS integration suite passed against an isolated local Supabase stack. Phase 3 did not modify database schema or production data.

**Proposed scope:** product UI specification and design-system foundations only. Frontend implementation, runtime integration, and deployment are outside this phase.

## 2. Request and data path (proposed)

1. User signs in through Supabase Auth.
2. The application resolves the active organization from authorized memberships.
3. A screen requests or mutates commitments through the authenticated Supabase client.
4. Postgres RLS and existing database constraints remain authoritative for tenant and role permissions.
5. The UI renders the confirmed response, or a loading, empty, validation, error, or permission-denied state.
6. Review decisions are written through the existing review model and are not treated as approved until the database confirms the result.

The UI must not infer authorization from hidden controls alone. The database remains the enforcement point.

## 3. Proposed module contracts

| Module | Responsibility | Inputs / outputs | Authority and constraints |
|---|---|---|---|
| Workspace shell | Navigation, active organization, user context | Active workspace and route | Display only organizations the current user can access |
| Commitment list | Search, filters, sort, pagination | Filter state → commitment rows | Query only authorized tenant data; preserve clear empty/error states |
| Commitment detail | Commitment fields, source, evidence, dependencies, activity | Commitment ID → detail view | Show only fields available from authorized records |
| Commitment editor | Create/update commitment data | Validated form → mutation result | Validate required title and lengths; never invent owner or organization IDs |
| Review queue | Pending reviews and decision actions | Review record + decision note → confirmed outcome | Enforce role checks in database; distinguish pending, approved, rejected |
| Evidence module | Source excerpts, URLs, notes | Commitment relationship → evidence list | Treat source text and URLs as untrusted user content |
| Status presentation | Status, priority, confidence badges | Enum value → text and visual token | Never rely on color alone; handle unknown enum values safely |

## 4. Screen-to-schema traceability

| Design field or feature | Existing schema source |
|---|---|
| Organization and membership context | `cr_organizations`, `cr_memberships` |
| Project name and status | `cr_projects` |
| Title, details, counterparty, owner, due date, status, priority, confidence, source type, excerpt, URL | `cr_commitments` |
| Evidence labels, URL, note | `cr_evidence` |
| Commitment dependencies | `cr_dependencies` |
| Review status, reviewer, decision note, timestamps | `cr_reviews` |
| Activity timeline | `cr_audit_events` |

Only columns observed in the current schema are in scope. Any additional fields must be introduced through a separately reviewed migration rather than assumed by the frontend.

## 5. Failure behavior required in Phase 4

| Failure | UI behavior | Evidence needed |
|---|---|---|
| No commitments | Explain empty state and offer authorized create action | Component test |
| Loading | Stable skeleton or progress state; prevent duplicate submission | Component test |
| Invalid form | Inline field messages and preserved user input | Validation tests |
| Permission denied | Explain that action is unavailable; do not leak tenant details | Auth/RLS integration test |
| Network or API error | Keep user input, show retryable error, avoid false success | Integration test |
| Duplicate submit | Disable while pending and handle server response safely | Interaction test |
| Review decision uncertain after timeout | Do not display success until outcome is confirmed; reload the record before retry | Integration test |
| Empty evidence/dependencies | Show a clear optional empty state | Component test |

## 6. Acceptance criteria for the design draft

- [x] Desktop dashboard exists as editable Figma layers.
- [x] Commitments list exists with search/filter/sort context.
- [x] Commitment detail includes source, evidence, dependency, and activity sections.
- [x] Create form fields map to observed schema columns.
- [x] Review queue shows an explicit decision workflow.
- [x] Mobile dashboard frame exists.
- [x] Color, typography, spacing, and component foundations are documented in Figma.
- [x] Initial visual inspection was performed and the spacing-token swatch overlap was fixed.
- [ ] Product owner approves the information architecture and visual direction.
- [ ] Phase 4 implementation reproduces the accepted designs and adds all failure states.
- [ ] Runtime accessibility, keyboard, and responsive checks pass.

## 7. Supervised engineering-team contract (Codelit template-informed)

**Mode:** Design-only / proposed roster  
**Trigger:** Manual  
**Human owner:** Product owner  
**Execution status:** No Codelit agent runtime was executed.

| Role | One responsibility | Allowed input | Output contract | Stop / escalate |
|---|---|---|---|---|
| Product/UX reviewer | Validate workflows and information hierarchy | Figma screens and product requirements | Screen-by-screen acceptance checklist | Stop if core workflow or labels are ambiguous |
| Data-contract reviewer | Check design fields against schema | Read-only schema and migrations | Field-to-column traceability matrix | Stop if a field lacks a verified schema source |
| Accessibility reviewer | Review status, contrast, labels, and mobile layout | Figma screenshots and token page | Findings with severity and reproduction context | Escalate contrast or non-text status failures |
| Independent verifier | Validate the final handoff and evidence | Final Figma file and repository docs | Pass/partial/fail matrix | Do not declare complete when a gate is unverified |

Deterministic checks and human approval remain outside the proposed roster. These roles are a documented contract, not evidence of autonomous execution.

## 8. Phase 4 handoff gates

1. Product owner approves the Figma draft or lists changes.
2. Choose the smallest vertical slice to implement first: authenticated workspace shell + commitments list.
3. Implement through the existing repository's conventions; do not alter unrelated Hashttick code or Supabase objects.
4. Add tests for loading, empty, error, permission-denied, and mutation-confirmation states.
5. Run build, lint/type checks, and tests on the integrated `main` state before reporting completion.
6. Keep deployment and production schema changes out of scope until separately authorized.
