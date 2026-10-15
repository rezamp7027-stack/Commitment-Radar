import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = resolve(fileURLToPath(new URL('../', import.meta.url)));
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png'
};
const mockModule = "\nconst state = {\n  organizations: [{ id: 'org-1', name: 'Personal commitments' }, { id: 'org-2', name: 'Client work' }],\n  cr_memberships: [\n    { organization_id: 'org-1', user_id: 'test-user', role: 'owner' },\n    { organization_id: 'org-2', user_id: 'test-user', role: 'editor' }\n  ],\n  cr_projects: [],\n  cr_commitments: [\n    { id: 'commitment-1', organization_id: 'org-1', project_id: null, title: 'Existing commitment', details: 'Seed record', counterparty: 'Team', owner_name: 'Test User', due_date: null, status: 'open', priority: 'normal', confidence: 'medium', source_type: 'manual', source_excerpt: '', source_url: '', created_by: 'test-user', created_at: '2026-10-01T10:00:00.000Z', updated_at: '2026-10-01T10:00:00.000Z', completed_at: null },\n    { id: 'commitment-other', organization_id: 'org-2', project_id: null, title: 'Second workspace only', details: '', counterparty: '', owner_name: '', due_date: null, status: 'open', priority: 'low', confidence: 'medium', source_type: 'manual', source_excerpt: '', source_url: '', created_by: 'test-user', created_at: '2026-10-02T10:00:00.000Z', updated_at: '2026-10-02T10:00:00.000Z', completed_at: null }\n  ],\n  cr_evidence: [],\n  cr_reviews: [\n    { id: 'review-1', organization_id: 'org-1', commitment_id: 'commitment-1', status: 'pending', created_by: 'other-user', reviewed_by: null, decision_note: '', created_at: '2026-10-02T12:00:00.000Z', reviewed_at: null }\n  ],\n  cr_audit_events: [\n    { id: 1, organization_id: 'org-1', actor_id: 'other-user', entity_type: 'commitment', entity_id: 'commitment-1', action: 'insert', metadata: { source: 'browser-test' }, created_at: '2026-10-02T13:00:00.000Z' }\n  ]\n};\nwindow.__commitmentRadarMock = state;\nlet nextId = 1;\nconst currentUser = { id: 'test-user', email: 'test@example.test' };\nconst session = { user: currentUser, access_token: 'browser-test-token' };\nfunction matches(row, filters) { return filters.every(([field, value]) => row[field] === value); }\nfunction query(table) {\n  let action = 'select', payload = null, filters = [], orders = [], rowLimit = null;\n  const builder = {\n    select() { return builder; },\n    insert(value) { action = 'insert'; payload = value; return builder; },\n    update(value) { action = 'update'; payload = value; return builder; },\n    delete() { action = 'delete'; return builder; },\n    eq(field, value) { filters.push([field, value]); return builder; },\n    order(field, options = {}) { orders.push([field, options]); return builder; },\n    limit(value) { rowLimit = value; return builder; },\n    then(resolve, reject) {\n      return Promise.resolve().then(() => {\n        const rows = state[table] || [];\n        if (action === 'select') {\n          let result = rows.filter(row => matches(row, filters)).map(row => {\n            if (table === 'cr_memberships') {\n              const org = state.organizations.find(item => item.id === row.organization_id);\n              return { ...row, cr_organizations: org ? { ...org } : null };\n            }\n            return { ...row };\n          });\n          for (const [field, options] of orders) {\n            result.sort((a, b) => {\n              const av = a[field] ?? null, bv = b[field] ?? null;\n              if (av === bv) return 0;\n              if (av === null) return options.nullsFirst ? -1 : 1;\n              if (bv === null) return options.nullsFirst ? 1 : -1;\n              const cmp = av < bv ? -1 : 1;\n              return options.ascending === false ? -cmp : cmp;\n            });\n          }\n          if (rowLimit !== null) result = result.slice(0, rowLimit);\n          return { data: result, error: null };\n        }\n        if (action === 'insert') {\n          const values = Array.isArray(payload) ? payload : [payload];\n          const inserted = values.map(value => {\n            const now = new Date().toISOString();\n            const record = {\n              id: table === 'cr_audit_events' ? nextId++ : table + '-' + nextId++,\n              created_at: now, updated_at: now,\n              status: table === 'cr_projects' ? 'active' : (table === 'cr_reviews' ? 'pending' : 'open'),\n              details: '', description: '', counterparty: '', owner_name: '', source_excerpt: '', source_url: '', note: '', url: '',\n              confidence: 'medium', priority: 'normal', source_type: 'manual', completed_at: null, reviewed_at: null, reviewed_by: null,\n              metadata: {}, ...value\n            };\n            rows.push(record);\n            return { ...record };\n          });\n          return { data: inserted, error: null };\n        }\n        if (action === 'update') {\n          const updated = rows.filter(row => matches(row, filters));\n          for (const row of updated) Object.assign(row, payload);\n          return { data: updated.map(row => ({ ...row })), error: null };\n        }\n        if (action === 'delete') {\n          const removed = rows.filter(row => matches(row, filters));\n          state[table] = rows.filter(row => !matches(row, filters));\n          return { data: removed.map(row => ({ ...row })), error: null };\n        }\n        return { data: null, error: { message: 'unsupported mock query' } };\n      }).then(resolve, reject);\n    }\n  };\n  return builder;\n}\nexport function createClient() {\n  return {\n    auth: {\n      onAuthStateChange() { return { data: { subscription: { unsubscribe() {} } } }; },\n      async getSession() { return { data: { session }, error: null }; },\n      async signOut() { return { error: null }; },\n      async signInWithPassword() { return { data: { user: currentUser, session }, error: null }; },\n      async signUp() { return { data: { user: currentUser, session }, error: null }; }\n    },\n    from(table) { return query(table); },\n    async rpc(name, args) {\n      if (name !== 'cr_create_organization') return { data: null, error: { message: 'unknown RPC' } };\n      const org = { id: 'org-created-' + nextId++, name: args.p_name };\n      state.organizations.push(org);\n      state.cr_memberships.push({ organization_id: org.id, user_id: currentUser.id, role: 'owner' });\n      return { data: org.id, error: null };\n    }\n  };\n}\n";

async function startServer() {
  const server = createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
      const file = resolve(root, relative);
      if (file !== root && !file.startsWith(root + sep)) {
        res.writeHead(403).end('Forbidden');
        return;
      }
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': mime[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(body);
    } catch {
      res.writeHead(404).end('Not found');
    }
  });
  await new Promise((resolveListen, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolveListen);
  });
  const address = server.address();
  return { server, url: 'http://127.0.0.1:' + address.port };
}

async function openAuthenticatedApp() {
  const { server, url } = await startServer();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.route('https://esm.sh/@supabase/supabase-js@2', route => route.fulfill({
    status: 200,
    contentType: 'text/javascript',
    headers: { 'access-control-allow-origin': '*' },
    body: mockModule
  }));
  const page = await context.newPage();
  return { browser, context, page, server, url };
}

test('browser workflows: commitments, projects, evidence, reviews, audit and workspace isolation', async () => {
  const env = await openAuthenticatedApp();
  const pageErrors = [];
  env.page.on('pageerror', error => pageErrors.push(error.message));
  env.page.on('dialog', async dialog => {
    if (dialog.type() === 'prompt') await dialog.accept('Verified during browser test');
    else await dialog.accept();
  });
  try {
    await env.page.goto(env.url, { waitUntil: 'networkidle' });
    await env.page.waitForSelector('#workspacePanel:not(.hidden)');
    await env.page.locator('#items').getByText('Existing commitment').waitFor();

    await env.page.locator('[data-view="projects"]').click();
    await env.page.locator('#projectName').fill('Portfolio Redesign');
    await env.page.locator('#projectDescription').fill('Delivery milestones for the portfolio');
    await env.page.getByRole('button', { name: 'Create project' }).click();
    await env.page.locator('#projectsList').getByText('Portfolio Redesign').waitFor();

    await env.page.locator('[data-view="overview"]').click();
    await env.page.locator('#toggleForm').click();
    await env.page.locator('#commitTitle').fill('Build pricing page');
    await env.page.locator('#details').fill('Implement pricing table and validation');
    await env.page.locator('#ownerName').fill('Test User');
    await env.page.locator('#dueDate').fill('2026-11-01');
    await env.page.locator('#priority').selectOption('urgent');
    await env.page.locator('#projectId').selectOption({ label: 'Portfolio Redesign' });
    await env.page.locator('#sourceExcerpt').fill('Quote from the acceptance document');
    await env.page.locator('#sourceUrl').fill('https://example.test/acceptance');
    await env.page.getByRole('button', { name: 'Save commitment' }).click();
    let commitment = env.page.locator('#items .item').filter({ hasText: 'Build pricing page' });
    await commitment.waitFor();
    assert.equal(await commitment.locator('.pill').filter({ hasText: 'urgent' }).count(), 1);
    assert.equal(await env.page.locator('#activeMetric').innerText(), '2');

    await env.page.locator('#commitSearch').fill('Portfolio Redesign');
    assert.equal(await env.page.locator('#items .item').count(), 1);
    await env.page.locator('#commitSearch').fill('');
    commitment = env.page.locator('#items .item').filter({ hasText: 'Build pricing page' });

    await commitment.getByRole('button', { name: 'Edit Build pricing page' }).click();
    await env.page.locator('#commitTitle').fill('Build pricing page v2');
    await env.page.locator('#commitState').selectOption('in_progress');
    await env.page.locator('#sourceExcerpt').fill('Updated acceptance excerpt');
    await env.page.locator('#sourceUrl').fill('https://example.test/pricing-v2');
    await env.page.getByRole('button', { name: 'Save changes' }).click();
    commitment = env.page.locator('#items .item').filter({ hasText: 'Build pricing page v2' });
    await commitment.waitFor();
    await commitment.getByText('In progress', { exact: true }).waitFor();
    assert.equal(await commitment.locator('a.module-link').getAttribute('href'), 'https://example.test/pricing-v2');

    await env.page.locator('[data-view="dependencies"]').click();
    await env.page.locator('#dependencyCommitmentId').selectOption({ label: 'Build pricing page v2' });
    await env.page.locator('#dependsOnCommitmentId').selectOption({ label: 'Existing commitment' });
    await env.page.getByRole('button', { name: 'Add dependency' }).click();
    const dependency = env.page.locator('#dependenciesList .module-row').filter({ hasText: 'Build pricing page v2 depends on Existing commitment' });
    await dependency.waitFor();
    await env.page.locator('#dependencyCommitmentId').selectOption({ label: 'Existing commitment' });
    await env.page.locator('#dependsOnCommitmentId').selectOption({ label: 'Build pricing page v2' });
    await env.page.getByRole('button', { name: 'Add dependency' }).click();
    await env.page.locator('#dependencyStatus').getByText(/circular chain/i).waitFor();
    await dependency.getByRole('button', { name: 'Remove dependency' }).click();
    await dependency.waitFor({ state: 'detached' });

    await env.page.locator('[data-view="overview"]').click();
    commitment = env.page.locator('#items .item').filter({ hasText: 'Build pricing page v2' });
    await commitment.getByRole('checkbox', { name: 'Mark Build pricing page v2 completed' }).click();
    await commitment.getByText('Completed', { exact: true }).waitFor();
    assert.equal(await env.page.locator('#doneMetric').innerText(), '1');

    await env.page.locator('[data-view="evidence"]').click();
    await env.page.locator('#evidenceCommitmentId').selectOption({ label: 'Build pricing page v2' });
    await env.page.locator('#evidenceLabel').fill('Pricing acceptance criteria');
    await env.page.locator('#evidenceUrl').fill('https://example.test/pricing-acceptance');
    await env.page.locator('#evidenceNote').fill('Verified copy and pricing tiers');
    await env.page.getByRole('button', { name: 'Add evidence' }).click();
    const evidence = env.page.locator('#evidenceList .module-row').filter({ hasText: 'Pricing acceptance criteria' });
    await evidence.waitFor();
    await evidence.getByRole('button', { name: 'Delete' }).click();
    await evidence.waitFor({ state: 'detached' });

    await env.page.locator('[data-view="reviews"]').click();
    await env.page.locator('#reviewCommitmentId').selectOption({ label: 'Build pricing page v2' });
    await env.page.getByRole('button', { name: 'Request review' }).click();
    const reviews = env.page.locator('#reviewsList');
    await reviews.getByText('Build pricing page v2').waitFor();
    const existingReview = reviews.locator('.module-row').filter({ hasText: 'Existing commitment' });
    await existingReview.getByRole('button', { name: 'Approve' }).click();
    await existingReview.getByText('Status · approved').waitFor();

    await env.page.locator('[data-view="audit"]').click();
    await env.page.locator('#auditList').getByText('commitment · insert').waitFor();

    await env.page.locator('[data-view="overview"]').click();
    await env.page.locator('#workspaceSelect').selectOption('org-2');
    await env.page.locator('#items').getByText('Second workspace only').waitFor();
    assert.equal(await env.page.locator('#items').getByText('Existing commitment').count(), 0);
    await env.page.locator('#workspaceSelect').selectOption('org-1');
    await env.page.locator('#items').getByText('Existing commitment').waitFor();
    assert.deepEqual(pageErrors, []);
  } finally {
    await env.browser.close();
    await new Promise(resolveClose => env.server.close(resolveClose));
  }
});
