import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const auditMigration = readFileSync(new URL('../commitment-radar/supabase/migrations/20261018094039_commitment_radar_audit_trigger_hardening.sql', import.meta.url), 'utf8');
const moduleSource = readFileSync(new URL('../app.js', import.meta.url), 'utf8').replace(
  /import\s+\{\s*createClient\s*\}\s+from\s+['"][^'"]+['"];\s*/,
  ''
);
assert.match(html, /<link rel="stylesheet" href="\.\/styles\.css">/);
assert.match(html, /<script type="module" src="\.\/app\.js"><\/script>/);

test('CSS exposes the shared Commitment Radar design tokens', () => {
  for (const token of [
    '--cr-color-brand-primary', '--cr-color-navigation-navy', '--cr-color-canvas',
    '--cr-color-surface', '--cr-color-text-primary', '--cr-color-text-muted',
    '--cr-color-border-default', '--cr-color-status-success',
    '--cr-color-status-warning', '--cr-color-status-danger',
    '--cr-space-1', '--cr-space-6', '--cr-radius-small', '--cr-radius-large'
  ]) assert.match(styles, new RegExp(token + ':'));
  assert.match(styles, /--blue:var\\(--cr-color-brand-primary\\)/);
});

test('browser module parses as an async function body', () => {
  assert.doesNotThrow(() => new Function(`return async function(){\n${moduleSource}\n}`));
});

test('frontend defaults to the intended Supabase project with a public key', () => {
  assert.match(moduleSource, /https:\/\/htfrixfcirgrhlmwtkjs\.supabase\.co/);
  assert.match(moduleSource, /sb_publishable_[A-Za-z0-9_-]+/);
  assert.doesNotMatch(moduleSource, /sb_secret_[A-Za-z0-9_-]+/);
});

test('commitment operations use the existing schema and authenticated user identity', () => {
  assert.match(moduleSource, /from\('cr_commitments'\)\.select/);
  assert.match(moduleSource, /from\('cr_commitments'\)\.insert/);
  assert.match(moduleSource, /from\('cr_commitments'\)\.update/);
  assert.match(moduleSource, /from\('cr_commitments'\)\.delete/);
  assert.match(moduleSource, /rpc\('cr_create_organization'/);
  assert.match(moduleSource, /created_by:user\.id/);
});

test('status and priority values match the inspected database constraints', () => {
  assert.match(moduleSource, /const status=done\?'done':'open'/);
  assert.match(html, /value="urgent">Urgent/);
  assert.doesNotMatch(html, /value="critical">Critical/);
});

test('audit trigger hardening migration fixes search_path and blocks direct execution', () => {
  assert.match(auditMigration, /SECURITY DEFINER[\s\S]*SET search_path = pg_catalog/i);
  assert.match(auditMigration, /REVOKE ALL ON FUNCTION public\.cr_log_commitment_change\(\) FROM PUBLIC, anon, authenticated/i);
  assert.match(auditMigration, /INSERT INTO public\.cr_audit_events/i);
});

test('no privileged Supabase key pattern is embedded in the frontend', () => {
  assert.doesNotMatch(html, /sb_secret_[A-Za-z0-9_-]+/);
  assert.doesNotMatch(html, /service_role\s*[:=]/i);
});

test('commitment title validation matches the database minimum after trimming', () => {
  assert.match(html, /id="commitTitle" minlength="2" maxlength="240"/);
  assert.match(moduleSource, /if\(title\.length<2\).*Commitment title must contain at least 2 non-space characters/);
});

test('auth state listener is registered only after the Supabase client is created', () => {
  assert.match(moduleSource, /client\.auth\.onAuthStateChange\(\(event,session\)/);
  assert.doesNotMatch(moduleSource, /client\?\.auth\?\.onAuthStateChange/);
});

test('cancelled commitments are not counted as open or overdue', () => {
  assert.match(moduleSource, /function isCancelled\(x\)\{return x\.status==='cancelled'\}/);
  assert.match(moduleSource, /function isOpen\(x\)\{return !isDone\(x\)&&!isCancelled\(x\)\}/);
  assert.match(moduleSource, /const active=commitments\.filter\(isOpen\)\.length/);
  assert.match(moduleSource, /function isOverdue\(x\)\{return isOpen\(x\)&&x\.due_date/);
  assert.match(moduleSource, /cb\.dataset\.permissionDisabled=String\(isCancelled\(x\)\|\|!canEdit\(\)\)/);
});

test('commitment search, priority filtering, and sorting are wired to the rendered list', () => {
  assert.match(html, /id="commitSearch"/);
  assert.match(html, /id="priorityFilter"/);
  assert.match(html, /id="sortOrder"/);
  assert.match(moduleSource, /searchQuery=.*toLowerCase\(\)/);
  assert.match(moduleSource, /priorityFilter==='all'\|\|x\.priority===priorityFilter/);
  assert.match(moduleSource, /sortOrder==='updated'/);
  assert.match(moduleSource, /sortOrder==='priority'/);
});

test('commitments can be edited and source context is persisted using existing schema columns', () => {
  assert.match(moduleSource, /function startEdit\(x\)/);
  assert.match(moduleSource, /from\('cr_commitments'\)\.update\(payload\)/);
  assert.match(moduleSource, /source_excerpt:\$\('sourceExcerpt'\)\.value\.trim\(\)/);
  assert.match(moduleSource, /source_url:sourceUrl/);
  assert.match(html, /id="sourceExcerpt" maxlength="12000"/);
  assert.match(html, /id="sourceUrl" type="url" maxlength="2000"/);
});

test('source URLs are restricted to HTTP(S) and opened without opener access', () => {
  assert.match(moduleSource, /if\(!\['http:','https:'\]\.includes\(parsed\.protocol\)\)/);
  assert.match(moduleSource, /link\.rel='noopener noreferrer'/);
});

test('settings changes reload once rather than recursively registering event listeners', () => {
  assert.match(moduleSource, /\$\('settingsForm'\)\.addEventListener\('submit'/);
  assert.match(moduleSource, /saveCfg\(\{url,key\}\);hide\('settingsStatus'\);window\.location\.reload\(\)/);
  assert.doesNotMatch(moduleSource, /await init\(\);if\(client\)/);
});

test('updated UI includes visible keyboard focus, responsive layout, and reduced-motion support', () => {
  assert.match(styles, /:focus-visible/);
  assert.match(styles, /@media\(max-width:600px\)/);
  assert.match(styles, /prefers-reduced-motion:reduce/);
  assert.match(html, /aria-pressed=/);
});

test('update and delete mutations require a returned affected row', () => {
  assert.match(moduleSource, /update\(patch\)\.eq\('id',x\.id\)\.eq\('organization_id',orgId\)\.select\('id'\)\.maybeSingle\(\)/);
  assert.match(moduleSource, /delete\(\)\.eq\('id',x\.id\)\.eq\('organization_id',orgId\)\.select\('id'\)\.maybeSingle\(\)/);
  assert.match(moduleSource, /No record was updated/);
  assert.match(moduleSource, /No record was deleted/);
  assert.match(moduleSource, /if\(busy\)return;if\(!orgId\)/);
});

test('project management uses existing schema fields and preserves workspace scoping', () => {
  assert.match(html, /id="projectsView"/);
  assert.match(html, /id="projectId"/);
  assert.match(moduleSource, /from\('cr_projects'\)\.select\('id,organization_id,name,description,status,created_by,created_at,updated_at'\)/);
  assert.match(moduleSource, /from\('cr_projects'\)\.insert\(\{\.\.\.payload,organization_id:orgId,created_by:user\.id\}\)/);
  assert.match(moduleSource, /from\('cr_projects'\)\.update\(payload\)\.eq\('id',editingProjectId\)\.eq\('organization_id',orgId\)/);
  assert.match(moduleSource, /await loadProjects\(\);await loadCommitments\(\)/);
});

test('review requests and decisions follow the existing RLS contract', () => {
  assert.match(html, /id="reviewsView"/);
  assert.match(moduleSource, /from\('cr_reviews'\)\.insert\(\{organization_id:orgId,commitment_id:x\.id,created_by:user\.id,status:'pending'\}\)/);
  assert.match(moduleSource, /created_by!==user\?\.id/);
  assert.match(moduleSource, /reviewed_by:user\.id/);
  assert.match(moduleSource, /eq\('status','pending'\)\.select\('id'\)\.maybeSingle\(\)/);
  assert.match(moduleSource, /A pending review already exists for this commitment/);
});

test('interactive workspace view controls have accessible tab state and unique element IDs', () => {
  assert.match(html, /role="tablist"/);
  assert.match(html, /role="tab" aria-controls="commitmentsView" aria-selected="true" tabindex="0"/);
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length, 'HTML element IDs must be unique');
});

test('commitment detail lazily loads evidence, dependencies, review history, and audit activity', () => {
  assert.match(moduleSource, /async function loadRelatedRecords\(/);
  assert.match(moduleSource, /from\('cr_evidence'\)\.select\('id,organization_id,commitment_id,label,url,note,created_by,created_at'\)/);
  assert.match(moduleSource, /from\('cr_dependencies'\)\.select\('id,organization_id,commitment_id,depends_on_commitment_id,created_by,created_at'\)/);
  assert.match(moduleSource, /from\('cr_audit_events'\)\.select\('id,entity_type,entity_id,action,created_at'\)/);
  assert.match(moduleSource, /detailsNode\.dataset\.loaded/);
  assert.match(moduleSource, /more\.dataset\.loading!=='true'/);
  assert.match(moduleSource, /delete detailsNode\.dataset\.loading/);
  assert.match(moduleSource, /link\.rel='noopener noreferrer'/);
});

test('evidence and dependency mutations are workspace-scoped and require server-confirmed rows', () => {
  assert.match(moduleSource, /from\('cr_evidence'\)\.insert\(\{organization_id:orgId,commitment_id:commitment\.id,label,url,note:evNote\.value\.trim\(\),created_by:user\.id\}\)/);
  assert.match(moduleSource, /from\('cr_evidence'\)\.delete\(\)\.eq\('id',evidence\.id\)\.eq\('organization_id',orgId\)\.select\('id'\)\.maybeSingle\(\)/);
  assert.match(moduleSource, /from\('cr_dependencies'\)\.insert\(\{organization_id:orgId,commitment_id:commitment\.id,depends_on_commitment_id:dependencySelect\.value,created_by:user\.id\}\)/);
  assert.match(moduleSource, /from\('cr_dependencies'\)\.delete\(\)\.eq\('id',dependency\.id\)\.eq\('organization_id',orgId\)\.select\('id'\)\.maybeSingle\(\)/);
});

test('busy state preserves role and workspace restrictions', () => {
  assert.match(moduleSource, /b\.disabled=v\|\|b\.dataset\.permissionDisabled==='true'\|\|b\.dataset\.workspaceDisabled==='true'/);
  assert.match(moduleSource, /b\.dataset\.permissionDisabled=String\(!allowed\)/);
  assert.match(moduleSource, /b\.dataset\.workspaceDisabled=String\(b\.dataset\.view!=='commitments'\)/);
});

test('needs-attention metrics and filters include blocked and due-today open commitments', () => {
  assert.match(moduleSource, /attention=commitments\.filter\(x=>isOpen\(x\)&&\(isOverdue\(x\)\|\|x\.status==='blocked'\|\|x\.due_date===today\(\)\)\)/);
  assert.match(moduleSource, /filter==='attention'&&\(isOverdue\(x\)\|\|x\.status==='blocked'\|\|\(isOpen\(x\)&&x\.due_date===today\(\)\)\)/);
});

test('project and review tabs are disabled until a workspace exists', () => {
  assert.match(moduleSource, /b\.dataset\.workspaceDisabled=String\(b\.dataset\.view!=='commitments'\)/);
  assert.match(moduleSource, /b\.dataset\.workspaceDisabled='false';b\.disabled=busy/);
});

test('mutation affordances follow the existing owner/admin/editor permission contract', () => {
  assert.match(moduleSource, /function canEdit\(\)\{return \['owner','admin','editor'\]\.includes\(orgs\.find\(o=>o\.id===orgId\)\?\.role\)\}/);
  assert.match(moduleSource, /cb\.dataset\.permissionDisabled=String\(isCancelled\(x\)\|\|!canEdit\(\)\)/);
  assert.match(moduleSource, /review\.dataset\.permissionDisabled=String\(!canEdit\(\)\|\|isCancelled\(x\)/);
  assert.match(moduleSource, /Your current workspace role cannot decide reviews/);
});

test('read-only members are blocked from mutation handlers before requests are sent', () => {
  assert.match(moduleSource, /if\(!canEdit\(\)\)\{show\('commitStatus','Your current workspace role is read-only\.'/);
  assert.match(moduleSource, /if\(!canEdit\(\)\)\{show\('projectFormStatus','Your current workspace role is read-only\.'/);
  assert.match(moduleSource, /Your current workspace role cannot request reviews/);
  assert.match(moduleSource, /Your current workspace role cannot decide reviews/);
  assert.match(moduleSource, /if\(!canEdit\(\)\)\{evidenceStatus\.textContent='Your current workspace role is read-only\.'/);
});

test('workspace tabs expose controlled panels and keyboard navigation', () => {
  assert.match(html, /aria-controls="commitmentsView"/);
  assert.match(html, /aria-controls="projectsView"/);
  assert.match(html, /aria-controls="reviewsView"/);
  assert.match(html, /role="tabpanel"/);
  assert.match(moduleSource, /\$\('viewTabs'\)\.addEventListener\('keydown'/);
  assert.match(moduleSource, /ArrowRight','ArrowLeft','Home','End'/);
});


test('signup explains Supabase email rate limits without encouraging repeated retries', () => {
  assert.match(moduleSource, /function authErrorText\(e\)/);
  assert.match(moduleSource, /over_email_send_rate_limit/);
  assert.match(moduleSource, /email rate limit exceeded/i);
  assert.match(moduleSource, /Do not keep retrying/);
  assert.match(moduleSource, /configure custom SMTP in Supabase Auth/);
  assert.match(moduleSource, /show\('authStatus',authErrorText\(ex\),'error'\)/);
});

test('built-in Supabase email authorization failures have actionable guidance', () => {
  assert.match(moduleSource, /email address not authorized/i);
  assert.match(moduleSource, /only sends to authorized team addresses/);
});


test('email authentication passes the server-verified Turnstile token to Supabase Auth', () => {
  assert.match(html, /id="turnstileWidget"/);
  assert.match(html, /challenges\.cloudflare\.com\/turnstile/);
  assert.match(moduleSource, /options:\{captchaToken\}/);
  assert.match(moduleSource, /options:\{captchaToken,emailRedirectTo:/);
  assert.match(moduleSource, /resetPasswordForEmail\(email,\{redirectTo:.*captchaToken\}\)/);
  assert.match(moduleSource, /TURNSTILE_SITE_KEY='0x[0-9A-Za-z_-]+'/);
  assert.doesNotMatch(moduleSource, /TURNSTILE_SECRET_KEY\s*=/);
});

test('authentication supports password recovery and resets the CAPTCHA after each attempt', () => {
  assert.match(html, /id="forgotPasswordBtn"/);
  assert.match(moduleSource, /authMode==='recovery'/);
  assert.match(moduleSource, /resetPasswordForEmail/);
  assert.match(moduleSource, /finally\{resetCaptcha\(\);setBusy\(false\)\}/);
  assert.match(moduleSource, /Complete the CAPTCHA before continuing/);
});


test('password recovery completes with an update-password screen after the recovery callback', () => {
  assert.match(html, /id="passwordUpdatePanel"/);
  assert.match(html, /id="newPassword"/);
  assert.match(moduleSource, /event==='PASSWORD_RECOVERY'/);
  assert.match(moduleSource, /client\.auth\.updateUser\(\{password\}\)/);
  assert.match(moduleSource, /continueAfterPasswordUpdate/);
  assert.match(moduleSource, /window\.location\.hash\.includes\('type=recovery'\)/);
});


test('authentication submit blocks duplicate requests while busy', () => {
  assert.match(moduleSource, /authForm'\)\.addEventListener\('submit',async e=>\{e\.preventDefault\(\);if\(busy\|\|!client\)return/);
});

test('workspace and commitment forms guard duplicate submissions', () => {
  assert.match(moduleSource, /workspaceForm'\)\.addEventListener\('submit',async e=>\{e\.preventDefault\(\);if\(busy\)return/);
  assert.match(moduleSource, /commitForm'\)\.addEventListener\('submit',async e=>\{e\.preventDefault\(\);if\(busy\)return/);
});



test('Google OAuth is intentionally absent; email/password auth remains available', () => {
  assert.doesNotMatch(html, /googleSignInBtn|Continue with Google|Sign in with Google/i);
  assert.doesNotMatch(moduleSource, /signInWithOAuth|provider:'google'|googleSignInBtn/);
  assert.match(html, /id="authForm"/);
  assert.match(moduleSource, /signInWithPassword/);
  assert.match(moduleSource, /signUp\(/);
  assert.match(moduleSource, /resetPasswordForEmail/);
});


test('workspace creation requires a returned organization ID and avoids duplicate refreshes', () => {
  assert.match(moduleSource, /Workspace creation was not confirmed by the server/);
  assert.match(moduleSource, /orgId=typeof data/);
  assert.doesNotMatch(moduleSource, /await loadOrganizations\(\);if\(data\)/);
});
