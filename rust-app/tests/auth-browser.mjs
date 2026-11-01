// Real Windows Chrome against WSL local workerd; use existing frontend tooling.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from '../../frontend/node_modules/playwright-core/index.mjs';
import { base, seedFixture, session, sessionKeys, randomUUID } from './auth-fixtures.mjs';

const screenshot = new URL('../../internal/sprint/screenshots/rust-spike/002-login.png', import.meta.url);
const executablePath = process.env.CHROME_PATH || (process.platform === 'win32'
  ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : '/usr/bin/chromium');
const fixture = await seedFixture();
const browser = await chromium.launch({ executablePath, headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  const failures = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`); });
  page.on('requestfailed', request => failures.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText}`));

  assert.equal((await page.goto(`${base}/login`, { waitUntil: 'networkidle' })).status(), 200);
  const before = await sessionKeys();
  await page.getByLabel('Username', { exact: true }).fill(`absent-${randomUUID()}`);
  await page.getByLabel('Password', { exact: true }).fill(fixture.password);
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await page.getByText('User does not exist.', { exact: true }).waitFor();
  assert.deepEqual(await sessionKeys(), before);
  assert.equal((await page.context().cookies()).find(cookie => cookie.name === '__session'), undefined);

  await page.getByLabel('Username', { exact: true }).fill(fixture.row.username);
  await page.getByLabel('Password', { exact: true }).fill('wrong-password');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await page.getByText('Incorrect password.', { exact: true }).waitFor();
  assert.deepEqual(await sessionKeys(), before);

  await page.getByLabel('Password', { exact: true }).fill(fixture.password);
  await Promise.all([
    page.waitForURL(`${base}/me`),
    page.getByRole('button', { name: 'Log in', exact: true }).click(),
  ]);
  await page.getByText(fixture.row.username, { exact: true }).waitFor();
  const cookie = (await page.context().cookies()).find(item => item.name === '__session');
  assert.ok(cookie);
  assert.equal(cookie.httpOnly, true);
  assert.equal(cookie.secure, true);
  assert.equal(cookie.sameSite, 'Lax');
  const id = cookie.value.slice(0, cookie.value.lastIndexOf('.'));
  assert.equal((await session(id)).auth.username, fixture.row.username);
  // Capture authenticated proof but save only after logout and browser checks pass.
  const authenticatedScreenshot = await page.screenshot({ fullPage: true });
  await Promise.all([
    page.waitForURL(`${base}/login`),
    page.getByRole('button', { name: 'Log out', exact: true }).click(),
  ]);
  assert.equal(await session(id), null);
  assert.equal((await page.context().cookies()).find(item => item.name === '__session'), undefined);
  await page.goto(`${base}/me`, { waitUntil: 'networkidle' });
  assert.equal(new URL(page.url()).pathname, '/login');
  assert.deepEqual(errors, [], 'no browser console or runtime errors');
  assert.deepEqual(failures, [], 'no failed browser requests');
  await mkdir(fileURLToPath(new URL('.', screenshot)), { recursive: true });
  const { writeFile } = await import('node:fs/promises');
  await writeFile(fileURLToPath(screenshot), authenticatedScreenshot);
  console.log(JSON.stringify({ result: 'PASS', browser: await browser.version(),
    assertions: ['unknown user rendered/no session', 'wrong password rendered/no session',
      'real form -> /me', 'username rendered', 'secure cookie', 'logout KV deletion',
      'guest redirect', 'no browser errors'], screenshot: fileURLToPath(screenshot) }, null, 2));
} finally { await browser.close(); }
