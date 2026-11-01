// Windows Chrome visual/keyboard proof. Start the local app with contract/local-rust.mjs --visual.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '../../frontend/node_modules/playwright-core/index.mjs';
import { localBase } from '../../contract/harness.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const base = localBase(process.env.BASE_URL || process.env.BASE || 'http://127.0.0.1:8789');
const output = resolve(root, process.env.FOOD4U_AUTH_VISUAL_DIR || 'internal/sprint/screenshots/rust-005');
const baseline = resolve(root, 'internal/sprint/screenshots/nextjs/after');
const evidence = resolve(root, 'rust-app/.evidence/007-auth-visual.json');
await mkdir(output, { recursive: true });
await mkdir(resolve(root, 'rust-app/.evidence'), { recursive: true });
const report = { status: 'starting', base, shots: [], comparisons: [], checks: [], pageErrors: [], consoleErrors: [], blockedRequests: [], onrender: 0 };
await writeFile(evidence, JSON.stringify(report, null, 2));
const check = (name, value, detail) => {
  report.checks.push({ name, pass: Boolean(value), ...(detail === undefined ? {} : { detail }) });
  assert.ok(value, name);
};
const listen = server => new Promise((ok, fail) => {
  server.once('error', fail);
  server.listen(0, '127.0.0.1', ok);
});
const close = server => server.listening ? new Promise(ok => server.close(ok)) : Promise.resolve();
const denyProxy = createServer((_, res) => { res.writeHead(403); res.end('Visual proof denies external connections'); });
denyProxy.on('connect', (_, socket) => socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'));
await listen(denyProxy);
const proxy = { server: `http://127.0.0.1:${denyProxy.address().port}`, bypass: '<-loopback>,127.0.0.1,localhost' };
let browser;
let unsafe;
const onrender = value => {
  const host = new URL(value).hostname.toLowerCase().replace(/\.$/, '');
  return host === 'onrender.com' || host.endsWith('.onrender.com');
};

async function proveRedirectDenial() {
  let hits = 0;
  const destination = createServer((_, res) => { hits++; res.setHeader('access-control-allow-origin', '*'); res.end('canary'); });
  let source;
  let context;
  try {
    await listen(destination);
    const blocked = `http://127.0.0.1:${destination.address().port}`;
    source = createServer((req, res) => {
      if (req.url === '/redirect') res.writeHead(302, { location: `${blocked}/landed` });
      else res.setHeader('content-type', 'text/html');
      res.end('<title>Local safety canary</title>');
    });
    await listen(source);
    assert.equal((await fetch(blocked)).status, 200);
    hits = 0;
    context = await browser.newContext({ serviceWorkers: 'block', proxy: { ...proxy, bypass: '<-loopback>,localhost' } });
    const page = await context.newPage();
    const origin = `http://localhost:${source.address().port}`;
    await page.goto(origin);
    await page.goto(`${origin}/redirect`, { waitUntil: 'networkidle' }).catch(() => {});
    check('deny proxy blocks redirected navigation', hits === 0);
    await page.goto(origin);
    const denied = await page.evaluate(async url => {
      try { await fetch(url); return false; } catch { return true; }
    }, `${origin}/redirect`);
    check('deny proxy blocks redirected fetch', denied && hits === 0);
    console.log(`LOCAL_REDIRECT_DENY_PROOF=PASS destination_requests=${hits}`);
  } finally {
    await context?.close();
    if (source) await close(source);
    await close(destination);
  }
}

async function contextFor(options, allowAuthentication = false) {
  const context = await browser.newContext({ ...options, colorScheme: 'light', serviceWorkers: 'block', proxy });
  context.on('request', request => {
    const url = new URL(request.url());
    if (request.method() === 'GET' && (url.searchParams.has('username') || url.searchParams.has('password'))) {
      unsafe = new Error('Credentials appeared in a GET request URL');
    }
    if (onrender(request.url())) {
      report.onrender++;
      unsafe = new Error(`Forbidden Render request: ${request.url()}`);
    }
  });
  await context.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    // Only app-origin GET assets/pages are needed; this script never submits valid credentials.
    const permittedPost = allowAuthentication && request.method() === 'POST' && ['/api/login', '/api/register', '/logout'].includes(url.pathname);
    if (url.origin === base && (permittedPost || (request.method() === 'GET' && !url.pathname.startsWith('/api/')))) {
      await route.continue();
    } else {
      report.blockedRequests.push({ url: request.url(), method: request.method() });
      if (url.origin === base || onrender(request.url())) unsafe ??= new Error(`Unexpected application/backend request: ${request.url()}`);
      await route.abort('blockedbyclient');
    }
  });
  context.on('page', page => {
    page.on('pageerror', error => { report.pageErrors.push(String(error)); });
    page.on('console', message => {
      if (message.type() === 'error') report.consoleErrors.push({ text: message.text(), location: message.location() });
    });
  });
  return context;
}

async function authRegressions() {
  for (const failureMode of ['JavaScript disabled', 'JavaScript assets blocked']) {
    const noScript = await contextFor({ javaScriptEnabled: failureMode !== 'JavaScript disabled' });
    let scriptsBlocked = 0;
    if (failureMode === 'JavaScript assets blocked') await noScript.route(/\.js(?:\?|$)/, async route => {
      scriptsBlocked++;
      await route.abort('blockedbyclient');
    });
    try {
    const page = await noScript.newPage();
    await page.goto(`${base}/login`, { waitUntil: 'networkidle' });
    const form = page.locator('#auth-form');
    check(`${failureMode}: form has safe POST fallback`, (await form.getAttribute('method')).toLowerCase() === 'post');
    await page.getByLabel('Email', { exact: true }).fill('noscript-local@food4u.test');
    await page.getByLabel('Password', { exact: true }).fill('NoScript-local-only!');
    check(`${failureMode}: submit is disabled`, await page.getByRole('button', { name: 'Log in', exact: true }).isDisabled());
    await page.getByLabel('Password', { exact: true }).press('Enter');
    await page.waitForLoadState('networkidle');
    const current = new URL(page.url());
    check(`${failureMode}: Enter does not expose credentials in URL`, current.pathname === '/login' && current.search === '');
    if (failureMode === 'JavaScript assets blocked') check('Script failure fixture actually blocked scripts', scriptsBlocked > 0);
    if (unsafe) throw unsafe;
    } finally { await noScript.close(); }
  }

  const context = await contextFor({}, true);
  let signedIn = false;
  let page;
  try {
    page = await context.newPage();
    await page.goto(`${base}/login`, { waitUntil: 'networkidle' });
    const email = `visual-raw-${randomUUID()}@food4u.test`;
    const rawPassword = '     a'; // Zod checks six UTF-16 code units before trimming to "a".
    await page.getByRole('tab', { name: 'Create account', exact: true }).click();
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill(rawPassword);
    await page.getByRole('button', { name: 'Create account', exact: true }).click();
    await page.getByRole('heading', { name: 'Welcome back', exact: true }).waitFor();
    await page.getByText('Account created. Log in to continue.', { exact: true }).waitFor();
    check('raw six-unit password: registration validates before trimming', true);
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill(rawPassword);
    await page.getByRole('button', { name: 'Log in', exact: true }).click();
    // Registration preserves incomplete welcome; the migrated dashboard now
    // resumes onboarding after the successful credential seam.
    await page.waitForURL(url => url.pathname === '/welcome');
    signedIn = true;
    check('raw six-unit password: login client/server seam succeeds', true);
  } finally {
    try {
      if (page && !page.isClosed()) {
        // Even a partially failed flow clears a possibly established local session.
        const response = await page.evaluate(async () => {
          const result = await fetch('/logout', { method: 'POST' });
          return { status: result.status, path: new URL(result.url).pathname };
        });
        check('raw-password regression: logout cleans the local session', response.status === 200 && response.path === '/login', { signedIn });
      }
    } finally { await context.close(); }
  }
}

async function settle(page) {
  await page.waitForLoadState('networkidle');
  await page.evaluate(async () => { await document.fonts.ready; });
  if (unsafe) throw unsafe;
  assert.deepEqual(report.pageErrors, [], 'No uncaught browser JavaScript errors');
}

async function shot(page, name, viewport) {
  await settle(page);
  const file = `rust-${name}-${viewport}.png`;
  const metrics = await page.evaluate(() => ({
    viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
    scrollY,
    bodyFont: getComputedStyle(document.body).fontFamily,
    loadedFontFaces: [...document.fonts].filter(face => face.status === 'loaded').map(face => face.family),
    scrollWidth: document.documentElement.scrollWidth,
  }));
  check(`${viewport} ${name}: no horizontal overflow`, metrics.scrollWidth <= metrics.viewport.width);
  await page.screenshot({ path: resolve(output, file), fullPage: true, animations: 'disabled' });
  report.shots.push({ file, name, viewport, metrics });
}

async function keyboardChecks(page, viewport) {
  const login = page.getByRole('tab', { name: 'Log in', exact: true });
  const register = page.getByRole('tab', { name: 'Create account', exact: true });
  await login.click();
  await login.focus();
  for (const [key, target, heading] of [
    ['ArrowRight', register, 'Create your account'],
    ['ArrowLeft', login, 'Welcome back'],
    ['End', register, 'Create your account'],
    ['Home', login, 'Welcome back'],
    ['ArrowLeft', register, 'Create your account'],
    ['ArrowRight', login, 'Welcome back'],
  ]) {
    await page.keyboard.press(key);
    check(`${viewport}: ${key} selects and focuses ${heading}`,
      await target.getAttribute('aria-selected') === 'true' && await target.evaluate(node => node === document.activeElement));
    check(`${viewport}: ${key} mounts ${heading}`, await page.getByRole('heading', { name: heading, exact: true }).isVisible());
    check(`${viewport}: one tab in sequential focus order`, await page.locator('[role="tab"][tabindex="0"]').count() === 1);
  }
}

function pngSize(bytes) {
  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', 'Expected PNG');
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

async function comparisons() {
  // Render existing PNGs as data URLs: deterministic composition, no network or image editing tools.
  const context = await contextFor({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  try {
    const page = await context.newPage();
    for (const shot of report.shots) {
      const reference = `next-${shot.name}-${shot.viewport}.png`;
      const [left, right] = await Promise.all([readFile(resolve(baseline, reference)), readFile(resolve(output, shot.file))]);
      const a = pngSize(left), b = pngSize(right);
      const width = a.width + b.width, height = Math.max(a.height, b.height) + 32;
      await page.setViewportSize({ width, height });
      await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
        *{box-sizing:border-box}html,body{margin:0;background:#dedde3;font:16px/32px Arial,sans-serif}
        main{display:flex;align-items:flex-start}figure{margin:0;flex:none}figcaption{height:32px;padding:0 12px;background:#23202a;color:white}img{display:block}
        </style></head><body><main><figure style="width:${a.width}px"><figcaption>Next.js baseline — ${shot.viewport}</figcaption><img width="${a.width}" height="${a.height}" src="data:image/png;base64,${left.toString('base64')}"></figure><figure style="width:${b.width}px"><figcaption>Rust / Topcoat — ${shot.viewport}</figcaption><img width="${b.width}" height="${b.height}" src="data:image/png;base64,${right.toString('base64')}"></figure></main></body></html>`);
      await page.evaluate(() => Promise.all([...document.images].map(image => image.decode())));
      const file = `compare-${shot.name}-${shot.viewport}.png`;
      await page.screenshot({ path: resolve(output, file), fullPage: true, animations: 'disabled' });
      report.comparisons.push({ file, baseline: reference, rust: shot.file, width, height });
    }
  } finally { await context.close(); }
}

try {
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', proxy });
  report.browser = await browser.version();
  await proveRedirectDenial();
  for (const [viewport, options] of Object.entries({
    desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
    mobile: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  })) {
    const context = await contextFor(options);
    try {
      const page = await context.newPage();
      page.setDefaultTimeout(15000);
      page.setDefaultNavigationTimeout(30000);
      await page.goto(`${base}/`, { waitUntil: 'networkidle' });
      check(`${viewport}: anonymous root redirects to login`, new URL(page.url()).pathname === '/login');
      await page.getByRole('heading', { name: 'Welcome back', exact: true }).waitFor();
      check(`${viewport}: JavaScript enables the initialized submit button`, await page.getByRole('button', { name: 'Log in', exact: true }).isEnabled());
      await shot(page, '01-login', viewport);
      if (viewport === 'desktop') {
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');
        check('Tab reaches Log in tab after brand', await page.getByRole('tab', { name: 'Log in', exact: true }).evaluate(node => node === document.activeElement));
        await page.keyboard.press('ArrowRight');
        await page.getByRole('heading', { name: 'Create your account', exact: true }).waitFor();
        await page.keyboard.press('ArrowLeft');
      }
      await page.getByLabel('Email', { exact: true }).fill('not-an-email');
      await page.getByLabel('Password', { exact: true }).fill('123');
      await page.getByRole('button', { name: 'Log in', exact: true }).click();
      for (const [label, text] of [['Email', 'Enter a valid email address.'], ['Password', 'Use at least 6 characters.']]) {
        const field = page.getByLabel(label, { exact: true });
        check(`${viewport}: ${label} invalid`, await field.getAttribute('aria-invalid') === 'true');
        const described = await field.getAttribute('aria-describedby');
        check(`${viewport}: ${label} visible error description`, await field.evaluate((node, expected) =>
          (node.getAttribute('aria-describedby') || '').split(/\s+/).some(id => {
            const description = document.getElementById(id);
            return description && description.getClientRects().length > 0 && description.textContent === expected;
          }), text), described);
      }
      await shot(page, '02-login-errors', viewport);
      await page.getByRole('tab', { name: 'Create account', exact: true }).click();
      await page.getByRole('heading', { name: 'Create your account', exact: true }).waitFor();
      await shot(page, '03-register', viewport);
      await keyboardChecks(page, viewport);
      await settle(page);
    } finally { await context.close(); }
  }
  await comparisons();
  await authRegressions();
  if (unsafe) throw unsafe;
  assert.equal(report.onrender, 0);
  assert.deepEqual(report.pageErrors, []);
  // Blocked resource loads are expected; console JavaScript failures are not.
  const jsErrors = report.consoleErrors.filter(error => !/^Failed to load resource: net::ERR_(BLOCKED_BY_CLIENT|TUNNEL_CONNECTION_FAILED|PROXY_CONNECTION_FAILED)/.test(error.text));
  assert.deepEqual(jsErrors, [], 'No unexpected console errors');
  report.status = 'PASS';
} catch (error) {
  report.status = 'FAIL';
  report.error = String(error.stack || error);
  process.exitCode = 1;
  console.error(error);
} finally {
  await browser?.close();
  await close(denyProxy);
  await writeFile(evidence, JSON.stringify(report, null, 2));
  console.log(`ONRENDER_REQUESTS_OBSERVED=${report.onrender}`);
  console.log(`VISUAL_${report.status} shots=${report.shots.length} comparisons=${report.comparisons.length} checks=${report.checks.length} pageerrors=${report.pageErrors.length}`);
}
