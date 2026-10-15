# Commitment Radar — Reference Architecture

## Current verified shape

- Static browser app with `index.html`, `styles.css`, and `app.js` on the PWA branch.
- PWA manifest, install prompt, service worker and offline informational page are present on `feature/pwa-foundation`.
- Supabase project `htfrixfcirgrhlmwtkjs` is reported `ACTIVE_HEALTHY`; inspected `cr_*` application tables have RLS enabled.
- Authenticated workspace operations include commitments, projects, evidence, review requests/decisions and read-only audit-event display.
- The frontend uses only the public publishable key; authorization must remain enforced by RLS.
- GitHub Actions contract tests passed on the PWA branch after module separation and workspace module additions.

## Not yet verified

- Browser/device installation and PWA update lifecycle.
- Live sign-up/sign-in and full CRUD workflows in a real browser.
- Hosted tenant-isolation and role-permission tests against a disposable Supabase project.
- Figma/Canva visual parity: the Figma dashboard frame contains additional modules and a light palette; the current UI retains its dark palette. The Canva handoff contains schema drift and remains a design artifact, not a source of truth for database contracts.
- Production hosting and deployment.

## Request path

1. Browser loads the static HTML, stylesheet and application module over HTTPS (or localhost during development).
2. Supabase Auth establishes an email/password session.
3. The application discovers memberships and loads the selected workspace.
4. The UI calls Supabase Data API with the current authenticated session.
5. PostgreSQL RLS and private helper functions authorize each read/write.
6. UI state updates only after successful responses; errors are shown to the user.
7. The service worker caches only the offline page and icon. It does not cache Supabase/API/CDN traffic or private workspace records.

## Module seams

- **Presentation:** `index.html` and `styles.css`; semantic forms, navigation, responsive views, loading/error/empty states.
- **Application logic:** `app.js`; auth lifecycle, workspace selection, domain operations, view rendering.
- **Identity:** Supabase Auth email/password session.
- **Authorization:** PostgreSQL RLS and `private.cr_is_member`, `private.cr_can_edit`, and `private.cr_can_manage` helpers.
- **Durable state:** `cr_organizations`, `cr_memberships`, `cr_projects`, `cr_commitments`, `cr_evidence`, `cr_reviews`, and `cr_audit_events`.
- **PWA shell:** `manifest.webmanifest`, `sw.js`, `offline.html`, and `icons/icon.svg`.

## Security invariants

- Never place service-role/secret credentials in browser code.
- Every mutation is organization-scoped and must be authorized by RLS; UI hiding/disablement is not a security boundary.
- All user-provided text is rendered as text, not interpreted as HTML.
- Cross-origin and non-GET requests are excluded from service-worker caching.
- Do not cache authenticated responses or claim offline availability of private data.
- Do not apply schema changes to the connected shared project without a reviewed migration and explicit approval.

## Failure behavior

- Missing/invalid public configuration: display connection settings and do not make database calls.
- Auth failure: show a bounded error and keep the user unauthenticated.
- Empty workspace: prompt workspace creation without displaying stale data from a prior session.
- Query/write failure: surface an error; never claim the mutation succeeded.
- Offline navigation: show the static offline explanation rather than a blank app shell.
- Uncertain outcome for a destructive write: query authoritative state before retrying.

## Release gates

1. All contract tests pass on the exact candidate commit.
2. Browser tests cover authentication, workspace selection, CRUD for each module, permission errors, reload, and offline navigation.
3. Test two independent users and viewer/editor/owner permissions against a dedicated disposable hosted project.
4. Confirm PWA installability, manifest/icon compatibility, service-worker update behavior and mobile layout on actual browsers/devices.
5. Review Figma/Canva parity or explicitly approve the documented design deviations.
6. Verify HTTPS hosting, public configuration, error handling and rollback path before declaring production readiness.
