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
  await new Promise(resolveListen => server.listen(0, '127.0.0.1', resolveListen));
  const address = server.address();
  return { server, url: 'http://127.0.0.1:' + address.port };
}

async function openApp(viewport = { width: 1280, height: 900 }) {
  const { server, url } = await startServer();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport });
  await context.route('https://esm.sh/@supabase/supabase-js@2', route => route.fulfill({
    status: 200,
    contentType: 'text/javascript',
    headers: { 'access-control-allow-origin': '*' },
    body: `
      export function createClient() {
        return {
          auth: {
            onAuthStateChange() {},
            async getSession() { return { data: { session: null }, error: null }; },
            async signOut() { return { error: null }; }
          }
        };
      }
    `
  }));
  const page = await context.newPage();
  return { browser, context, page, server, url };
}

test('browser smoke: app shell and unauthenticated state render without runtime errors', async () => {
  const env = await openApp();
  const pageErrors = [];
  env.page.on('pageerror', error => pageErrors.push(error.message));
  try {
    await env.page.goto(env.url, { waitUntil: 'networkidle' });
    await env.page.waitForSelector('#authPanel:not(.hidden)');
    assert.equal(await env.page.title(), 'Commitment Radar');
    assert.equal(await env.page.locator('#authTitle').innerText(), 'Sign in to Commitment Radar');
    assert.equal(await env.page.locator('link[rel="manifest"]').getAttribute('href'), './manifest.webmanifest');
    assert.deepEqual(pageErrors, []);
  } finally {
    await env.browser.close();
    await new Promise(resolveClose => env.server.close(resolveClose));
  }
});

test('browser smoke: manifest loads and service worker registers on localhost', async () => {
  const env = await openApp();
  try {
    await env.page.goto(env.url, { waitUntil: 'networkidle' });
    const result = await env.page.evaluate(async () => {
      const response = await fetch('./manifest.webmanifest');
      const manifest = await response.json();
      const registration = await navigator.serviceWorker.getRegistration('./');
      return { ok: response.ok, display: manifest.display, name: manifest.name, registered: Boolean(registration) };
    });
    assert.equal(result.ok, true);
    assert.equal(result.display, 'standalone');
    assert.equal(result.name, 'Commitment Radar');
    assert.equal(result.registered, true);
  } finally {
    await env.browser.close();
    await new Promise(resolveClose => env.server.close(resolveClose));
  }
});

test('browser smoke: offline navigation falls back to the privacy-safe offline page', async () => {
  const env = await openApp();
  try {
    await env.page.goto(env.url, { waitUntil: 'networkidle' });
    await env.page.evaluate(async () => { await navigator.serviceWorker.ready; });
    await env.page.waitForFunction(() => Boolean(navigator.serviceWorker.controller), null, { timeout: 10000 });
    const shell = await env.page.evaluate(async () => {
      const cache = await caches.open('commitment-radar-shell-v2');
      const offlineUrl = new URL('./offline.html', location.href).toString();
      return {
        cachedOfflinePage: Boolean(await cache.match(offlineUrl)),
        cachedIcon: Boolean(await cache.match(new URL('./icons/icon-192.png', location.href).toString()))
      };
    });
    assert.deepEqual(shell, { cachedOfflinePage: true, cachedIcon: true });
    await env.context.setOffline(true);
    await env.page.goto(env.url + '/offline-probe', { waitUntil: 'domcontentloaded', timeout: 10000 });
    await env.page.getByRole('heading', { name: "You're offline." }).waitFor({ timeout: 5000 });
    assert.match(await env.page.locator('body').innerText(), /private workspace data is not stored/i);
  } finally {
    await env.context.setOffline(false).catch(() => {});
    await env.browser.close();
    await new Promise(resolveClose => env.server.close(resolveClose));
  }
});

test('browser smoke: mobile layout does not overflow horizontally', async () => {
  const env = await openApp({ width: 390, height: 844 });
  try {
    await env.page.goto(env.url, { waitUntil: 'networkidle' });
    const dimensions = await env.page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth
    }));
    assert.ok(dimensions.document <= dimensions.viewport + 1, JSON.stringify(dimensions));
  } finally {
    await env.browser.close();
    await new Promise(resolveClose => env.server.close(resolveClose));
  }
});
