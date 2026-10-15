# Commitment Radar — Supervised Agent Team Contract

**Outcome:** Deliver and independently verify the Commitment Radar PWA, including authenticated workspace operations, projects, evidence, review decisions, audit visibility, install shell and release gates without changing unrelated projects or bypassing Supabase authorization.
**Mode:** Design-only. No Codelit agent run or deployment is claimed.
**Source:** GitHub `rezamp7027-stack/Commitment-Radar`, Supabase project `htfrixfcirgrhlmwtkjs`, current schema and migration metadata.
**Destination:** Proposed workflow and review artifacts in this repository.
**Trigger:** Manual.
**Human owner:** Project owner; must approve schema changes, secrets/configuration, and production deployment.

## Roster

The Codelit integration exposes planning templates in this environment, not a live agent-run endpoint. This contract is therefore a supervised workflow design; it is not evidence that autonomous agents executed tasks.

| ID | Responsibility | Inputs | Allowed scope | Output | Stop/escalate |
|---|---|---|---|---|---|
| A-01 Implementer | Implement one approved feature slice | Current main branch, requirements, schema metadata | Edit only Commitment Radar frontend/docs and narrowly scoped tests | Commit SHA, change summary, test evidence | Stop on unclear schema, unrelated diff, secret exposure, or failed authorization assumption |
| A-02 Independent verifier | Review without editing production code | Exact commit/diff, schema constraints, RLS policies, test results | Read-only GitHub/Supabase inspection and permitted test execution | Findings by severity, reproduction steps, release verdict | Block release on untested tenant isolation, failed tests, or critical authorization risk |
| A-03 PWA and UX verifier | Check installability, cache safety, accessibility and design parity | Manifest, service worker, Figma frame metadata, Canva handoff, mobile checklist | Read-only source/design inspection and browser/device tests when available | Installability report, design drift list, UX regressions | Block PWA release if private data is cached or installation cannot be verified |
| H-01 Human owner | Approve consequential side effects | Proposed diff, migration, deployment plan | Approve/reject exact change and destination | Version-bound approval | Re-approval required if payload or destination changes |

## Workflow
1. A-01 inspects repository instructions, source, current diff, schema columns, constraints, and policy expressions.
2. A-01 implements the smallest cohesive change and records the exact commit.
3. Deterministic checks parse the client module and validate allowed status/priority/source values, workspace module contracts, manifest metadata and service-worker cache scope.
4. A-02 inspects the resulting commit independently and runs the available verification checklist.
5. A-03 compares the candidate implementation with Figma/Canva references, validates PWA cache rules and records any unsupported visual or browser claims.
6. Human owner reviews any migration, production configuration, or deployment request.
7. Release is blocked until authenticated CRUD, cross-organization RLS isolation, browser/device installation, and the deployed revision are evidenced.

## State, limits, and recovery
- Durable identifiers: repository, branch, commit SHA, migration version, test account IDs (never passwords), test result references.
- Retry policy: at most two retries for transient read/test failures; inspect error before retrying writes.
- Never auto-retry destructive writes when the outcome is unknown; read the authoritative row state first.
- Stop on budget/rate-limit exhaustion, unexpected tool permissions, missing test accounts, or any possible credential leak.
- Do not store secrets, session tokens, passwords, or sensitive user commitment contents in logs.

## Evaluation cases

| Test | Expected result | Evidence | Status |
|---|---|---|---|
| E-01 | Valid client module parses | Parser output tied to commit | Passed for current inline script |
| E-02 | Status/priority values satisfy DB constraints | Constraint query plus source review | Passed by static inspection |
| E-03 | Authenticated user can create/read/update/delete own-org commitments | Browser/network or integration test evidence | Not run |
| E-04 | User A cannot read or mutate User B's organization data | Two-account isolation test evidence | Not run |
| E-05 | No service-role key in frontend history/current files | Secret scan and source review | Not run |
| E-06 | Independent verifier reports no release-blocking issues | Review artifact tied to exact commit | Not run |

This is a workflow design, not evidence that a live Codelit agent team exists or has executed.
