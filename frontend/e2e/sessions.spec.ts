import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { email, login, register } from './journeys';

// The harness owns the PGlite-backed Neon stand-in (e2e/runtime.mjs). These
// calls come from the test process, never from the browser under test.
async function harness(path: string, init?: RequestInit) {
  const response = await fetch(`${process.env.E2E_HARNESS_URL}${path}`, init);
  expect(response.ok, `harness ${path}`).toBe(true);
  return response.json() as Promise<{ total: number; live: number; sql_requests: number }>;
}
// The signed-in identity is the uuid suffix of the owner-scoped intake draft key.
async function publicId(page: Page) {
  await expect.poll(() => page.evaluate(() => Object.keys(localStorage).some(key => key.startsWith('food4u:intake:v1:')))).toBe(true);
  return page.evaluate(() => Object.keys(localStorage).find(key => key.startsWith('food4u:intake:v1:'))!.split(':').at(-1)!);
}
const sessionCookie = async (page: Page) => (await page.context().cookies()).find(cookie => cookie.name === '__session');

test('signing in rotates the session; the pre-login cookie never signs in', async ({ page, gate }) => {
  const user = email();
  await register(page, user);
  const preLogin = await sessionCookie(page);
  expect(preLogin, 'registration starts an anonymous session').toBeDefined();
  await login(page, user);
  const signedIn = await sessionCookie(page);
  expect(signedIn?.value).not.toBe(preLogin!.value);
  await gate.check('020-rotated');
  await page.context().clearCookies();
  await page.context().addCookies([preLogin!]);
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login$/);
  await page.context().clearCookies();
  await page.context().addCookies([signedIn!]);
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/(dashboard|welcome)$/);
  await gate.check('020-signed-in-cookie-still-valid');
});

test('signing out deletes the session record', async ({ page, gate }) => {
  const user = email();
  await register(page, user); await login(page, user);
  const id = await publicId(page);
  expect(await harness(`/__harness__/sessions?user=${id}`)).toMatchObject({ total: 1, live: 1 });
  await page.getByRole('button', { name: 'Account menu' }).click();
  await page.getByRole('menuitem', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(await harness(`/__harness__/sessions?user=${id}`)).toMatchObject({ total: 0, live: 0 });
  await gate.check('020-signed-out');
});

test('an expired session signs the user out', async ({ page, gate }) => {
  const user = email();
  await register(page, user); await login(page, user);
  const id = await publicId(page);
  await harness(`/__harness__/expire-sessions?user=${id}`, { method: 'POST' });
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login$/);
  await gate.check('020-expired');
});

test('anonymous pages never touch the session database', async ({ page, gate }) => {
  const before = (await harness('/__harness__/sessions?user=none')).sql_requests;
  // The not-found page reads the session too; without a cookie it must not query.
  for (const path of ['/login', '/register', '/privacy', '/this-page-does-not-exist-018']) {
    await page.goto(path, { waitUntil: 'networkidle' });
  }
  await page.goto('/login', { waitUntil: 'networkidle' });
  expect((await harness('/__harness__/sessions?user=none')).sql_requests).toBe(before);
  await gate.check('020-anonymous');
});
