import { test, expect } from './fixtures';
import { credentials, email, login, register, choose } from './journeys';

test('register, duplicate account, validation, login and logout', async ({ page, gate }, info) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);
  await gate.check('root-login');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page.getByText('Enter a valid email address.', { exact: true })).toBeVisible();
  await expect(page.getByText('Use at least 6 characters.', { exact: true })).toBeVisible();
  await gate.check('login-validation');
  await page.goto('/register', { waitUntil: 'networkidle' });
  await gate.check('register');
  const user = email();
  await register(page, user);
  await gate.check('registered');
  await page.getByRole('tab', { name: 'Create account', exact: true }).click();
  await credentials(page, user, 'Create account');
  await expect(page.getByRole('alert').filter({ hasText: 'User already exists.' })).toBeVisible();
  await gate.check('duplicate-account');
  await login(page, user);
  await expect(page.getByRole('heading', { name: 'Tell us about you' })).toBeVisible();
  await gate.check('logged-in');
  await page.getByRole('button', { name: 'Account menu' }).click();
  // Audit evidence only here; the menu's failing axe gate is D018-03 below.
  await page.screenshot({ path: info.outputPath('018-account-menu-known-D018-03.png'), fullPage: true, animations: 'disabled' });
  await page.getByRole('menuitem', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.waitForLoadState('networkidle');
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login$/);
});

test('D018-03 account menu has no serious accessibility violations', async ({ page, gate }, info) => {
  test.fixme(process.env.E2E_AUDIT !== '1', 'D018-03: serious aria-hidden-focus; see internal/e2e/DEFECTS.md');
  await login(page, `dashboard-${info.project.name}@food4u.test`);
  await page.getByRole('button', { name: 'Account menu' }).click();
  await gate.check('account-menu');
});

test('D018-05 a second account cannot see the first account intake', async ({ page, gate }) => {
  const first = email(), second = email();
  await register(page, first); await login(page, first);
  await choose(page, 'What cuisines do you enjoy?', 'Italian');
  await expect.poll(() => page.evaluate(() => Object.entries(localStorage).some(([key, value]) => key.startsWith('food4u:intake:v1:') && value.includes('Italian')))).toBe(true);
  const firstKey = await page.evaluate(() => Object.keys(localStorage).find(key => key.startsWith('food4u:intake:v1:'))!);
  expect(firstKey).toMatch(/^food4u:intake:v1:[0-9a-f-]{36}$/i);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Remove Italian', exact: true })).toBeVisible();
  const unrelatedKey = 'food4u:intake:v1:22222222-2222-4222-8222-222222222222';
  await page.evaluate(key => localStorage.setItem(key, 'unrelated-account-sentinel'), unrelatedKey);
  await page.getByRole('button', { name: 'Account menu' }).click();
  const logout = page.waitForResponse(response => new URL(response.url()).pathname === '/api/auth/logout');
  await page.getByRole('menuitem', { name: 'Sign out' }).click();
  expect((await logout).status()).toBe(303);
  await expect(page).toHaveURL(/\/login$/);
  expect(await page.evaluate(key => localStorage.getItem(key), firstKey)).toBeNull();
  expect(await page.evaluate(key => localStorage.getItem(key), unrelatedKey)).toBe('unrelated-account-sentinel');
  await page.waitForLoadState('networkidle');
  await register(page, second); await login(page, second);
  await page.screenshot({ path: test.info().outputPath('018-second-account-leak-D018-05.png'), fullPage: true, animations: 'disabled' });
  await expect(page.getByRole('button', { name: 'Remove Italian', exact: true })).toBeHidden();
  await gate.check('second-account-intake');
});

test('D018-10 signup continues directly to authenticated intake', async ({ page, gate }) => {
  test.fixme(process.env.E2E_AUDIT !== '1', 'D018-10: signup forces a second login; see internal/e2e/DEFECTS.md');
  await page.goto('/register', { waitUntil: 'networkidle' });
  await credentials(page, email(), 'Create account');
  await page.waitForLoadState('networkidle');
  await gate.check('signup-second-login-D018-10');
  await expect(page).toHaveURL(/\/(welcome|dashboard)$/);
});
