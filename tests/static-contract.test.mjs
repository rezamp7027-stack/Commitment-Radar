import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const moduleSource = readFileSync(new URL('../app.js', import.meta.url), 'utf8').replace(
  /import\s+\{\s*createClient\s*\}\s+from\s+['"][^'"]+['"];\s*/,
  ''
);

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

test('no privileged Supabase key pattern is embedded in the frontend', () => {
  assert.doesNotMatch(html + moduleSource, /sb_secret_[A-Za-z0-9_-]+/);
  assert.doesNotMatch(html + moduleSource, /service_role\s*[:=]/i);
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
  assert.match(moduleSource, /cb\.disabled=isCancelled\(x\)/);
});
