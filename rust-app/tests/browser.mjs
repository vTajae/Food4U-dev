// Use the existing frontend Playwright dependency; do not install another stack.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from '../../frontend/node_modules/playwright-core/index.mjs';

const base = process.env.SPIKE_URL || 'http://127.0.0.1:8789';
const screenshot = new URL('../../internal/sprint/screenshots/rust-spike/001-counter.png', import.meta.url);
const executablePath = process.env.CHROME_PATH || (
  process.platform === 'win32'
    ? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
    : '/usr/bin/chromium'
);
const browser = await chromium.launch({ executablePath, headless: true });

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  const failedResponses = [];
  page.on('response', response => {
    if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`);
  });
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });

  const response = await page.goto(base, { waitUntil: 'networkidle' });
  assert.equal(response.status(), 200);
  await page.getByRole('heading', { name: 'Food4U compatibility spike', exact: true }).waitFor();
  assert.equal(await page.locator('#count').textContent(), '0');
  await page.getByRole('button', { name: 'Increment', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('#count')?.textContent === '1');
  assert.equal(await page.locator('#count').textContent(), '1');
  await mkdir(fileURLToPath(new URL('.', screenshot)), { recursive: true });
  await page.screenshot({ path: fileURLToPath(screenshot), fullPage: true });

  await page.getByRole('button', { name: 'Increment', exact: true }).press('Enter');
  await page.waitForFunction(() => document.querySelector('#count')?.textContent === '2');
  assert.equal(await page.locator('#count').textContent(), '2');
  await page.reload({ waitUntil: 'networkidle' });
  assert.equal(await page.locator('#count').textContent(), '0');
  assert.deepEqual(failedResponses, [], 'browser requests must succeed');
  assert.deepEqual(errors, [], 'browser console and runtime must have no errors');

  console.log(JSON.stringify({
    result: 'PASS',
    browser: await browser.version(),
    assertions: ['SSR heading', 'initial 0', 'click -> 1', 'keyboard -> 2', 'reload -> 0', 'no browser errors'],
    screenshot: fileURLToPath(screenshot),
  }, null, 2));
} finally {
  await browser.close();
}
