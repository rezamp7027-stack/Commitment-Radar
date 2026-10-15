import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('workspace navigation exposes all implemented modules', () => {
  for (const view of ['overview', 'projects', 'evidence', 'reviews', 'audit']) {
    assert.match(html, new RegExp('data-view="' + view + '"'));
    assert.match(html, new RegExp('data-view-panel="' + view + '"'));
  }
});

test('projects use existing organization-scoped schema and archive rather than destructive delete', () => {
  assert.match(app, /from\('cr_projects'\)\.select/);
  assert.match(app, /from\('cr_projects'\)\.insert/);
  assert.match(app, /from\('cr_projects'\)\.update/);
  assert.match(app, /created_by:user\.id/);
  assert.match(app, /status==='active'\?'archived':'active'/);
});

test('evidence creation validates URL protocols and scopes mutations to the workspace', () => {
  assert.match(app, /from\('cr_evidence'\)\.insert/);
  assert.match(app, /from\('cr_evidence'\)\.delete\(\)\.eq\('id',item\.id\)\.eq\('organization_id',orgId\)/);
  assert.match(app, /\['https:','http:'\]\.includes\(parsed\.protocol\)/);
});

test('review requests begin pending and decision UI excludes the request author', () => {
  assert.match(app, /from\('cr_reviews'\)\.insert\(\{organization_id:orgId,commitment_id:commitmentId,status:'pending',created_by:user\.id/);
  assert.match(app, /item\.created_by!==user\.id&&canEdit\(\)/);
  assert.match(app, /reviewed_by:user\.id,reviewed_at:new Date\(\)\.toISOString\(\)/);
});

test('audit log is read-only and limits workspace events', () => {
  assert.match(app, /from\('cr_audit_events'\)\.select/);
  assert.match(app, /\.eq\('organization_id',orgId\)\.order\('created_at',\{ascending:false\}\)\.limit\(100\)/);
  assert.doesNotMatch(app, /from\('cr_audit_events'\)\.(insert|update|delete)/);
});

test('commitments can be assigned to an active project', () => {
  assert.match(html, /id="projectId"/);
  assert.match(app, /project_id:\$\('projectId'\)\.value\|\|null/);
});
