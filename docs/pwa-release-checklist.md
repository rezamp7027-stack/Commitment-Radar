# Commitment Radar — PWA Release Checklist

## Implemented on `feature/pwa-foundation`

- [x] Standalone web app manifest with name, scope, start URL, theme and background colors.
- [x] SVG application icon.
- [x] Browser install prompt handling when `beforeinstallprompt` is supported.
- [x] Service worker registration gated to secure contexts.
- [x] Versioned cache namespace and stale shell cache cleanup.
- [x] Offline informational page cached for navigation fallback.
- [x] Cache excludes cross-origin traffic, Supabase APIs, authentication responses and CDN assets.
- [x] Contract tests for manifest, install wiring, cache scope and offline privacy.
- [x] Application JS and CSS separated from HTML for easier maintenance.
- [x] Workspace modules for projects, evidence, reviews and read-only audit history.

## Required before public release

- [ ] Merge the reviewed PWA branch into `main` after checks and code review.
- [ ] Confirm manifest icon support on current Chrome/Edge and iOS Safari; add raster 192×192 and 512×512 icons if any target browser requires them.
- [ ] Serve the application from HTTPS and verify manifest scope/start URL at the final deployment path.
- [ ] Test install, launch, refresh, offline navigation, reconnect and service-worker update on real Android/iOS devices.
- [ ] Confirm app JS/CDN dependency failure is visible and recoverable.
- [ ] Run browser E2E for sign-up, email confirmation, sign-in, workspace create/switch, commitment CRUD, project archive, evidence add/delete, review request/decision, and audit visibility.
- [ ] Verify two-user tenant isolation and viewer/editor/owner behavior on a disposable hosted Supabase project.
- [ ] Check mobile viewport, keyboard navigation, focus states, screen-reader labels and contrast.
- [ ] Choose a hosting target and approve the exact production destination before deployment.
- [ ] Verify the deployed commit, HTTPS, headers, error paths and rollback plan.

## Offline contract

The first release supports a clear offline fallback, not offline editing or queued mutations. Private workspace data is deliberately not cached. Offline write/sync behavior requires a separate conflict-resolution design and security review.
