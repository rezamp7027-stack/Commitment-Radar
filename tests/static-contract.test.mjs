import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const moduleMatch = html.match(/<script type="module">([\s\S]*?)<\/script>/);
assert.ok(moduleMatch, 'index.html contains a module script');
const moduleSource = moduleMatch[1].replace(
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
  assert.match(moduleSource, /value="urgent">Urgent/);
  assert.doesNotMatch(moduleSource, /value="critical">Critical/);
});

test('no privileged Supabase key pattern is embedded in the frontend', () => {
  assert.doesNotMatch(html, /sb_secret_[A-Za-z0-9_-]+/);
  assert.doesNotMatch(html, /service_role\s*[:=]/i);
});
