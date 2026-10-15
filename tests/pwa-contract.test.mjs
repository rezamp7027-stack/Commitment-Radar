import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const manifest = JSON.parse(readFileSync(new URL('../manifest.webmanifest', import.meta.url), 'utf8'));
const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const offline = readFileSync(new URL('../offline.html', import.meta.url), 'utf8');
const icon = readFileSync(new URL('../icons/icon.svg', import.meta.url), 'utf8');

test('PWA manifest has a valid standalone install configuration', () => {
  assert.equal(manifest.name, 'Commitment Radar');
  assert.equal(manifest.start_url, './');
  assert.equal(manifest.scope, './');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.theme_color, '#0b1220');
  assert.ok(manifest.icons.some(item => item.src === './icons/icon.svg' && item.type === 'image/svg+xml'));
});

test('HTML links the manifest and exposes install prompt only when supported', () => {
  assert.match(html, /rel="manifest" href="\.\/manifest\.webmanifest"/);
  assert.match(html, /id="installAppBtn"/);
  assert.match(app, /beforeinstallprompt/);
  assert.match(app, /navigator\.serviceWorker\.register\('\.\/sw\.js'/);
  assert.match(html, /window\.isSecureContext/);
});

test('service worker uses a versioned shell cache and removes stale app shell caches', () => {
  assert.match(sw, /const CACHE_PREFIX = 'commitment-radar-shell-'/);
  assert.ok(sw.includes("const CACHE_NAME = `${CACHE_PREFIX}v1`"));
  assert.match(sw, /name\.startsWith\(CACHE_PREFIX\).*name !== CACHE_NAME/);
  assert.match(sw, /request\.mode === 'navigate'/);
  assert.match(sw, /cache\.match\(OFFLINE_URL\)/);
});

test('service worker does not intercept cross-origin requests or non-GET requests', () => {
  assert.match(sw, /request\.method !== 'GET'/);
  assert.match(sw, /url\.origin !== self\.location\.origin/);
  assert.match(sw, /Never cache Supabase, auth, or CDN traffic/);
  assert.doesNotMatch(sw, /caches\.open\([^)]*\).*supabase/i);
});

test('offline fallback does not claim private workspace data is available offline', () => {
  assert.match(offline, /needs a connection to securely load your workspace/i);
  assert.match(offline, /private workspace data is not stored/i);
});

test('PWA icon is an SVG with the product palette', () => {
  assert.match(icon, /^<svg\s/);
  assert.match(icon, /#0b1220/);
  assert.match(icon, /#62e0c5/);
});
