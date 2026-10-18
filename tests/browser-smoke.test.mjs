import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { chromium } from 'playwright';

const root = process.cwd();
let server;
let origin;
let browser;

before(async () => {
  server = createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
      const file = resolve(root, relative);
      if (file !== root && !file.startsWith(root + sep)) {
        res.writeHead(403).end('Forbidden');
        return;
      }
      const body = await readFile(file);
      const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };
      res.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(body);
    } catch {
      res.writeHead(404).end('Not found');
    }
  });
  await new Promise((resolveListen, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolveListen);
  });
  origin = 'http://127.0.0.1:' + server.address().port;
  browser = await chromium.launch({ headless: true });
});

after(async () => {
  await browser?.close();
  if (server) await new Promise(resolveClose => server.close(resolveClose));
});

async function openIsolatedPage() {
  const context = await browser.newContext();
  await context.addInitScript(() => localStorage.setItem('commitment-radar-supabase-public-config-v1', JSON.stringify({ url: 'https://isolated-test.supabase.co', key: 'sb_publishable_test_key_12345678901234567890' })));
  const page = await context.newPage();
  await page.route('https://esm.sh/@supabase/supabase-js@2', route => route.fulfill({
    status: 200,
    contentType: 'text/javascript',
    body: `
      export function createClient() {
        return { auth: {
          onAuthStateChange() { return { data: { subscription: { unsubscribe() {} } } }; },
          async getSession() { return { data: { session: null }, error: null }; },
          async signInWithPassword() { return { data: { user: null }, error: { message: 'Invalid login credentials' } }; },
          async signUp() { return { data: { user: null, session: null }, error: null }; },
          async resetPasswordForEmail() { return { error: null }; },
          async signOut() { return { error: null }; }
        }};
      }
    `,
  }));
  await page.route('https://challenges.cloudflare.com/turnstile/v0/api.js*', route => route.fulfill({
    status: 200,
    contentType: 'text/javascript',
    body: `
      window.turnstile = {
        render(_selector, options) { window.__turnstileOptions = options; return 1; },
        reset() { if (window.__turnstileOptions) setTimeout(() => window.__turnstileOptions.callback('test-captcha-token'), 0); },
        remove() {}
      };
    `,
  }));
  return { context, page };
}

test('auth screen renders, Turnstile gates submission, and email-only modes work', async () => {
  const { context, page } = await openIsolatedPage();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto(origin, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('#authPanel') && !document.querySelector('#authPanel').classList.contains('hidden'));
  await page.waitForFunction(() => window.turnstile && window.__turnstileOptions);

  assert.match(await page.locator('#authTitle').innerText(), /Sign in to Commitment Radar/);
  assert.equal(await page.locator('#authSubmit').isDisabled(), true, 'auth submission must remain disabled until a CAPTCHA token exists');
  await page.evaluate(() => window.__turnstileOptions.callback('test-captcha-token'));
  await page.waitForFunction(() => document.querySelector('#authSubmit').disabled === false);
  assert.equal(await page.locator('#authSubmit').isDisabled(), false);
  assert.equal(await page.getByText(/Continue with Google|Sign in with Google/i).count(), 0);

  await page.locator('#toggleAuthMode').click();
  assert.match(await page.locator('#authTitle').innerText(), /Create your account/);
  await page.locator('#toggleAuthMode').click();
  await page.locator('#forgotPasswordBtn').click();
  assert.match(await page.locator('#authTitle').innerText(), /Reset your password/);
  assert.equal(await page.locator('#passwordField').isVisible(), false);

  await page.locator('#toggleAuthMode').click();
  await page.locator('#toggleAuthMode').click();
  assert.match(await page.locator('#authTitle').innerText(), /Sign in to Commitment Radar/);
  await page.locator('#email').fill('person@example.test');
  await page.locator('#password').fill('wrong-password');
  await page.locator('#authSubmit').click();
  await page.waitForFunction(() => !document.querySelector('#authStatus').classList.contains('hidden'));
  assert.match(await page.locator('#authStatus').innerText(), /Invalid login credentials/);
  assert.deepEqual(pageErrors, []);
  await context.close();
});
