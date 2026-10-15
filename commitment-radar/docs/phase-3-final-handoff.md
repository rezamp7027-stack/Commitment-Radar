# Commitment Radar — Phase 3 Final Product & Engineering Handoff

**Date:** 2026-10-15  
**Status:** Implementation-ready specification baseline; final Figma canvas synchronization remains open  
**Repository:** https://github.com/rezamp7027-stack/Commitment-Radar  
**Existing Figma file:** https://www.figma.com/design/CueLiOMpV0m7OY7BEYEFcs  
**Canonical editable Canva Doc:** https://www.canva.com/d/Gx2q99U6TKNfShP (edit: https://www.canva.com/d/-3ugm7vZ-SO2F-O)  
**Scope:** Product UX, design contract, schema alignment, accessibility requirements, and Phase 4 handoff. No frontend implementation, production schema write, or deployment is included.

## 1. Executive decision

Phase 3 establishes a coherent UI contract for the first usable Commitment Radar release. The existing design contains six key frames and design-system foundations. This document resolves the engineering-facing decisions and acceptance criteria so Phase 4 can proceed without inventing fields or authorization behavior.

The chosen first vertical slice is **authenticated workspace shell → authorized commitments list → commitment detail**. After that slice passes its integration gate, add create/edit, project management, review workflow, and secondary record views.

**Important delivery boundary:** the existing Figma artifact was not changed in this pass because the connected Figma service reported its tool-call limit. Canva reported its AI design-credit quota was exhausted, so a new AI-generated slide deck could not be created. An editable Canva Doc was imported successfully from the corrected, versioned GitHub source: https://www.canva.com/d/Gx2q99U6TKNfShP. The specification and acceptance contract below are committed independently in GitHub; visual synchronization of the existing Figma file and correction of the old Canva slide handoff remain explicit follow-ups rather than claimed completed actions.

## 2. Verified baseline and constraints

- The repository’s main branch contains documentation, two Supabase migrations, SQL contract/behavior tests, a real Auth/PostgREST integration harness, a CI workflow, and a local Supabase configuration. No frontend app, frontend package manifest, or runnable UI is present in the inspected main tree.
- The two checked-in migrations and SQL tests passed the recorded PostgreSQL CI run.
- The most recent recorded CI run on main passed both the PostgreSQL contract job and the local Supabase Auth/JWT/PostgREST integration job. The Phase 2 report records 11/11 integration scenarios passing.
- The optional hosted-disposable-Supabase parity job was skipped. A passing local harness does not prove a fresh hosted project is configured identically.
- The currently connected Supabase project ref inspected during this work is htfrixfcirgrhlmwtkjs. It is reached through the connection labelled Hashttick and its migration history includes Hashttick migrations as well as the two Commitment Radar migrations. All eight cr_* tables have RLS enabled, 22 policies exist, and the eight application tables plus Auth users were empty at inspection time.
- Do not run cleanup, reset, baseline replay, or production data changes against that shared project as part of Phase 3. Resolve whether this shared project is intentional before hosted testing or production release.
- Codelit templates inform the planning contract below; no Codelit agent runtime is claimed to have run.

Evidence:
- CI: https://github.com/rezamp7027-stack/Commitment-Radar/actions/runs/38745585280
- Phase 2 evidence report: https://github.com/rezamp7027-stack/Commitment-Radar/blob/main/commitment-radar/docs/phase-2-report.md
- Phase 2 auth test contract: https://github.com/rezamp7027-stack/Commitment-Radar/blob/main/commitment-radar/docs/phase-2-auth-integration.md

## 3. Product principles and design direction

**Product outcome:** turn a promise or obligation into a visible, owned, time-bound record with enough source context to review progress and make a defensible decision.

1. **Clarity over density:** make the commitment, status, due date, owner label, and next relevant action easy to scan.
2. **Context stays attached:** source excerpt/link, evidence, dependencies, review decision, and activity belong to the record.
3. **Risk is explicit:** overdue, blocked, and due-soon states need words and a next step; do not invent an opaque “health” database field.
4. **Honest interaction:** no false success before the server confirms a mutation; preserve form input after recoverable errors.
5. **Security is not a visual trick:** hiding a button is not authorization. Supabase RLS and server-side policy decisions remain authoritative.
6. **Status is not color-only:** pair semantic color with readable text and, where useful, an icon.
7. **Progressive disclosure:** show high-value fields first, with source, evidence, dependencies, and audit detail available without cluttering the main list.

### Proposed visual tokens for implementation

These follow the existing design proposal and are a working baseline, not proof that the Figma file was updated during this pass.

| Token | Value | Usage |
|---|---|---|
| Brand / primary | #2563EB | Primary action, links, visible focus |
| Navigation / navy | #10233F | Navigation and strong structural emphasis |
| Canvas / cool gray | #EEF2F6 | App background |
| Surface | #FFFFFF | Cards and forms |
| Success | #16855B | Completed/success status, always with text |
| Warning | #B66A08 | Due soon or at-risk messaging, always with text |
| Danger | #C43D4B | Overdue or destructive/error status, always with text |
| Body/border | Neutral gray ramp | Long-form text, dividers, field borders |

- Typeface baseline: IBM Plex Sans, subject to availability in the implementation environment.
- Spacing scale: 4, 8, 12, 16, 24, 32 px; use 48/64 px only for major section rhythm.
- Radius scale: 8, 12, and 16 px.
- Focus indicator: clearly visible outline; proposed 3 px using the primary color with sufficient offset/contrast.
- Touch target: aim for at least 44 × 44 CSS px for primary interactive controls.
- Accessibility target for Phase 4: WCAG 2.2 AA evaluation. This is a target, not a claim of current conformance or certification.

## 4. Information architecture

### Primary navigation

1. **Dashboard** — portfolio summary and records needing attention.
2. **Commitments** — searchable, filterable list and record entry point.
3. **Projects** — active/archived project list and project-scoped commitments.
4. **Review queue** — pending review records and explicit decisions.
5. **Workspace/settings** — only settings actually supported by the schema and authorized membership role.

Evidence, dependencies, review history, and audit history are contextual sections inside a commitment detail view. Do not promote them to separate top-level routes until user research or product scope requires it.

### Primary user journey

Sign in → load authorized workspace memberships → select/resolve the active organization → read the commitments list → open a commitment → inspect context/evidence/history → perform an action allowed by the current membership role → wait for a confirmed server response → show the resulting state.

A zero-membership user needs a clear empty/no-access route. Do not fabricate a workspace, insert a membership from the client, or expose another organization's identifiers.

## 5. Screen-level design contracts

### 5.1 Dashboard — desktop and mobile

**Purpose:** answer “what needs attention now?” without implying that data is live when it is illustrative.

- Summary cards may derive counts from the authorized commitment rows: open, due soon, overdue, blocked, and completed. Define the due-soon window in product configuration or a documented product rule; do not hard-code it invisibly.
- Needs-attention list should show title, status label, due date, owner label, and a route to the record.
- Recent activity may use cr_audit_events only where permitted by policy.
- Every metric must be calculated from records the user is authorized to read.
- Empty state: explain that no commitments exist and expose “Create commitment” only if permitted.
- Error state: show retry and retain navigation; never substitute sample values for a failed live query.
- Mobile: prioritize attention items; stack summary cards or use a horizontal scroller with keyboard and touch support; keep primary navigation reachable.

### 5.2 Commitments list

**Purpose:** locate and triage records without losing context.

- Columns/row content: title, status, owner_name, due date, priority, project, and last updated where useful.
- Controls: search title/details, filters for status/priority/project and owner label, sort by due date/updated time, pagination.
- Preserve active filters when opening a record and returning to the list.
- Zero results must distinguish “no commitments exist” from “filters match nothing.”
- Use the exact enum values in Section 6 as UI labels; never send presentation-only labels as stored values.
- Do not display a confidence percentage: the exact confidence enum is low, medium, high.

### 5.3 Commitment detail

**Purpose:** show one auditable record and its related context.

- Main attributes: title, details, status, priority, confidence, owner_name, counterparty, due date, project, source type, source excerpt, source URL, created/updated timestamps, completed timestamp if present.
- Evidence section: labels, URL, note from cr_evidence.
- Dependencies section: linked commitment records from cr_dependencies.
- Review section: pending/approved/rejected records from cr_reviews, with decision note and review timestamps where present.
- Activity section: chronological entries from cr_audit_events that the user is allowed to read.
- Missing optional information should display a neutral “Not provided” or a targeted empty state, not fabricated values.
- Invalid or unknown enum values should degrade safely to a readable fallback rather than breaking the screen.

### 5.4 Create and edit commitment

**Schema-backed fields:**
- Title — required; match database length validation (2–240 characters after trim).
- Details — optional; maximum 10,000 characters.
- Project — optional; select only from projects in the active organization.
- Counterparty — optional text; maximum 180 characters.
- Owner label (owner_name) — optional text; maximum 180 characters. It is not a foreign key to a user account in the current schema.
- Due date — optional date; store as a date, not a timestamp.
- Status, priority, confidence, source type — select from the exact allowed values in Section 6.
- Source excerpt — optional text; maximum 12,000 characters.
- Source URL — optional text; maximum 2,000 characters; validate URL format at the client but treat it as untrusted content.
- Organization and creator attribution are derived from verified session/workspace context and server policy, not trusted from user-editable fields.

Behavior:
- Validate required fields before submission and show errors next to fields.
- Preserve input after API/network failure.
- Disable or guard duplicate submissions while a request is in flight.
- Show success only after the database returns a confirmed successful result.
- For update actions, consider row-level permissions and policy constraints; zero returned rows can mean not authorized or no longer present.
- If a request times out after it may have reached the server, re-fetch the record/list before retrying to avoid duplicate effects.

### 5.5 Review queue

**Purpose:** enable review decisions with context, rather than treating review as an ordinary status toggle.

- List pending reviews and the related commitment title, submitter/creator context available from authorized records, and submission time.
- Detail shows source/evidence, dependencies, owner, due date, and current state before decision controls.
- Store review state using pending, approved, or rejected.
- A decision note is supported by the schema. Do not make it universally mandatory at the database contract level without a separate product decision; if product policy requires it for a particular decision, enforce and test that policy explicitly.
- After approve/reject, confirm the server response before updating the UI to the final state.
- On uncertain timeout, reload the review and its status before offering retry.
- Unavailable actions should show a non-leaking permission message.

### 5.6 Project list and project detail

- Show project name, description, status (active or archived), and associated commitments.
- Creation/edit/archive controls must match actual permissions.
- A project and its commitments must always remain in the same organization; the database already includes same-organization relationship constraints.
- Avoid adding project templates, budgets, or project owners unless separately specified and supported.

### 5.7 Workspace and membership context

- Show only organizations the authenticated user can access through cr_memberships.
- Roles in the existing schema: owner, admin, editor, viewer.
- Role-sensitive controls must mirror the actual database contract, while RLS remains the ultimate enforcement layer.
- Do not design a full invitation lifecycle as if it already exists: no dedicated invitation table/workflow was observed in the current schema. Membership provisioning and identity verification need a separate supported workflow in Phase 4 if invitations are required.

## 6. Verified schema contract — source of truth for UI

The live inspected database contains these eight application tables, all with RLS enabled:

| Table | Product use | Key implementation notes |
|---|---|---|
| cr_organizations | Workspace/tenant | Access determined by membership and database policy |
| cr_memberships | User-to-organization roles | Role enum: owner, admin, editor, viewer |
| cr_projects | Project grouping | name, description, status active/archived, organization relationship |
| cr_commitments | Main trackable record | owner_name and counterparty are text; confidence is categorical |
| cr_evidence | Supporting source references | Label, URL, note, commitment and organization relationship |
| cr_dependencies | Commitment-to-commitment dependencies | Both related commitments must be in the same organization |
| cr_reviews | Explicit review decisions | status pending/approved/rejected; decision_note |
| cr_audit_events | Chronological mutation history | Actor, entity type/ID, action insert/update/delete, metadata, timestamp |

### Exact enum contracts

- Commitment status: open, in_progress, blocked, done, cancelled.
- Priority: low, normal, high, urgent.
- Confidence: low, medium, high.
- Source type: manual, chat, email, meeting, document, other.
- Project status: active, archived.
- Review status: pending, approved, rejected.
- Membership role: owner, admin, editor, viewer.

### Prohibited schema assumptions

Do not implement against these names or concepts unless a separately reviewed migration changes the source of truth:

- owner_id or counterparty_id columns on commitments — not in the observed schema.
- Percentage-based confidence — not in the observed schema.
- A persisted health or risk_score column — not in the observed schema.
- Reminder/notification tables or background scheduling — not observed.
- File-upload/storage bucket contracts — not verified in this phase.
- Invitation-token tables/workflows — not observed.
- Fictitious example counts or names as production records.

Derived UI states such as “overdue” may be computed from due_date and status, but the rule must be explicit and tested. It is not a new database field.

## 7. Responsive and accessibility acceptance requirements

These are Phase 4 acceptance targets; they have not yet passed an accessibility audit.

- All interactive actions work with keyboard only; focus order follows the visible hierarchy.
- Focus is clearly visible on links, inputs, menus, dialogs, and buttons.
- Every field has a programmatic and visible label; errors are associated with the affected input and explain how to fix it.
- Color never carries status meaning alone; contrast is evaluated for text, focus indicators, and non-text controls.
- Status and priority remain readable in grayscale/high-contrast contexts.
- Touch targets aim for at least 44 × 44 CSS px without introducing overlapping controls.
- Narrow-screen layouts reflow without horizontal page overflow; filters may move into a responsive panel/sheet but remain accessible and preserve state.
- Loading, empty, invalid, denied, error, confirmed-success, and unknown-outcome states are explicitly implemented and tested.
- Destructive/archive operations require clear labels and an appropriate confirmation or reversible flow.
- Source excerpts and URLs are untrusted user content; escape/render safely, do not execute HTML, and use safe link behavior.
- Confirm language direction, date formatting, keyboard layout, and localization requirements before production if Persian/RTL is in scope. Do not assume the current English design settles localization.

## 8. Phase 4 implementation architecture (proposed, not implemented)

Proposed request path:
Authenticated user → App shell → Workspace context → Commitment data adapter → Supabase Data API → Postgres RLS/constraints. Detail views call evidence, dependency, review, and audit modules through the same authorized data path. The diagram is a proposed application design, not an execution trace.

### Module seams

- **App shell:** owns authenticated route protection, loading/error routes, organization selection, and navigation. It should not duplicate row-level authorization rules.
- **Workspace context module:** resolves the current user and permitted memberships. Its interface should return authorized workspace choices and a clear no-membership state.
- **Commitment data adapter:** centralizes queries/mutations, enum translation, query invalidation, and typed errors. Screens should not each reinvent raw Supabase query details.
- **Commitment form module:** owns client-side validation and form state; server/database validation remains authoritative.
- **Review module:** owns review action state and re-fetch/recovery behavior for uncertain outcomes.
- **Presentation primitives:** reusable buttons, form controls, status badges, cards, empty/error states, and accessible navigation. Bind the agreed tokens rather than duplicating arbitrary values.

Keep modules deep: a small interface should hide query composition, mapping, validation, and recoverable error handling. Do not add speculative microservices, message queues, or agent execution to a CRUD-first web app.

## 9. Phase 4 delivery sequence and acceptance tests

### Slice A — authenticated shell and authorized list

Acceptance:
- Authenticated user sees only permitted workspaces.
- Membershipless user gets a safe empty/no-access path.
- List queries display only records authorized by RLS.
- Loading, empty, filtered-empty, error, and retry states work.
- Integration test proves organization A cannot read organization B.

### Slice B — commitment detail and navigation preservation

Acceptance:
- Record detail maps only to existing columns.
- Evidence, dependencies, reviews, and audit entries are queried separately under the same tenant context.
- Opening a record and returning preserves list filters/sort.
- Missing optional relations show correct empty states.

### Slice C — create/edit and projects

Acceptance:
- Client validation matches field limits and enum values.
- Cross-organization project IDs are rejected by constraints/policies.
- Editor/viewer restrictions are confirmed with real JWT tests.
- On failure, entered data is preserved; no false success appears.
- Duplicate submission and request-timeout recovery are tested.

### Slice D — review and audit presentation

Acceptance:
- Review states use the exact enum contract.
- Only permitted roles can submit decisions.
- Decisions are confirmed by the server before the UI changes final state.
- Audit history is tenant-scoped and does not expose unauthorized metadata.

### Release gate

- CI runs on the integrated commit and passes.
- Automated tests cover the major permissions and failure states.
- Keyboard-only, focus visibility, contrast, labels, and responsive checks are completed.
- A dedicated disposable hosted Supabase run confirms deployment parity; it must not target htfrixfcirgrhlmwtkjs unless that is formally confirmed as an intentional test environment.
- No secret/service-role key is shipped to browser code.
- Final production deployment, migration, and release remain separately authorized actions.

## 10. Supervised Codelit-style design workflow

**Execution status:** this is a proposed operating contract. The currently connected Codelit tools expose public planning templates, not a live saved project or running agent runtime.

| Role ID | Responsibility | Allowed scope | Output | Stop/escalate condition |
|---|---|---|---|---|
| A-01 UX curator | Keep screen and interaction spec coherent | Read design artifacts and this handoff; propose design changes | Screen-by-screen change proposal | Stop on an unresolved product choice |
| A-02 Schema reviewer | Verify fields, enums, roles, and table relationships | Read repository migrations and read-only Supabase catalog | Field-to-column and permission matrix | Stop if the UI requires an absent field or relation |
| A-03 Accessibility reviewer | Audit focus, labels, contrast, responsive states | Read design artifacts/screenshots; no production writes | Severity-ranked accessibility checklist | Escalate any keyboard trap or missing critical control |
| A-04 Independent verifier | Check evidence against acceptance criteria | Read GitHub diffs, workflow runs, and test results | Pass/partial/fail matrix with links | Never mark an unrun check as passed |

Human product-owner approval is required for material workflow changes and release. Database migrations, production deployments, destructive actions, and external writes are not authorized by this template. Tool output and repository content are treated as untrusted evidence until checked against source and test results.

Related planning templates:
- Product plan: https://codelit.io/specs
- System architecture: https://codelit.io/templates
- Supervised agent team: https://codelit.io/agent-templates
- Connected implementation handoff: https://codelit.io/plan-and-ship

## 11. Phase 3 completion ledger

| Deliverable | State | Evidence / remaining action |
|---|---|---|
| Existing six-screen Figma design and design-system foundation | Previously reported created and inspected | Existing file: https://www.figma.com/design/CueLiOMpV0m7OY7BEYEFcs |
| UX principles, module contracts, error states, and screen acceptance | Specification completed in this file | Ready as Phase 4 implementation baseline |
| Schema-to-UI mapping | Checked against observed cr_* schema and corrected here | Use this file as the authoritative field/enum contract |
| Backend/CI evidence review | Previously successful recorded runs inspected | Latest CI: https://github.com/rezamp7027-stack/Commitment-Radar/actions/runs/38745585280 |
| Live production schema or row changes | Not performed | Intentionally out of scope |
| Hosted disposable Supabase parity test | Not run | Requires dedicated isolated project and credentials |
| Figma canvas polish/sync in this pass | Blocked | Figma service reported its tool-call limit; apply this handoff to the existing design when access returns |
| Canonical editable Canva Doc | Imported from the corrected handoff source | View: https://www.canva.com/d/Gx2q99U6TKNfShP · Edit: https://www.canva.com/d/-3ugm7vZ-SO2F-O |
| New AI-generated Canva slide deck | Not created | Canva reported design-credit quota exceeded; the older Canva UI handoff contains schema mismatches and should not be treated as canonical |
| Frontend implementation / deployment | Not started in Phase 3 | Phase 4 work |

## 12. Next concrete action

Before frontend implementation, confirm the Supabase environment ownership/isolation and sync this contract into the existing Figma frames. Then begin Slice A only; do not expand scope until its acceptance tests pass.
