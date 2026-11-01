// Real Chrome UI on the isolated local runner. No backend mocks or token injection.
import assert from 'node:assert/strict';
import process from 'node:process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHarness, localBase } from '../../../contract/harness.mjs';

const evidence = resolve(process.env.EVIDENCE_DIR ?? 'e2e/.artifacts/neon-evidence');
await mkdir(evidence, { recursive: true });
assert.ok(process.env.NEON_E2E_OWNER, 'runner ownership token required');
const base = localBase(process.env.BASE_URL || 'http://127.0.0.1:3001');
const proofResponse = await fetch(`${base}/_contract_local_setup/proof`);
assert.ok(proofResponse.ok, 'guarded Neon runner preflight required');
const proof = await proofResponse.json();
assert.equal(proof.owner, process.env.NEON_E2E_OWNER);
assert.equal(proof.backend, 'http://127.0.0.1:8000');
assert.equal(proof.server_egress_guard, true);
const harness = await createHarness();
const account = harness.email();
const observations = { browser: 'real Chrome via Playwright', backend_mocked: false };

async function choose(page, heading, query, name) {
  await page.getByRole('combobox', { name: heading, exact: true }).click();
  await page.getByPlaceholder('Type to search', { exact: true }).fill(query);
  const option = name ? page.getByRole('option').filter({ hasText: name }).first() : page.getByRole('option').first();
  await option.waitFor({ timeout: 10000 });
  const label = (await option.innerText()).trim();
  await option.click();
  await page.keyboard.press('Escape');
  return label;
}

async function checkChips(page) {
  const region = page.locator('p').filter({ hasText: 'Your profile:' });
  await region.waitFor();
  const chips = await region.locator('span').allTextContents();
  assert.deepEqual(chips.filter(text => text !== 'Your profile:'), ['Vegetarian', 'Allergic rhinitis, unspecified']);
  assert.ok(!chips.includes('Italian') && !chips.includes('12.50'));
}

try {
  // One browser session: registration -> login -> onboarding save.
  await harness.withContext(async ({ page }) => {
    await harness.register(page, account);
    await harness.login(page, account);
    await page.waitForURL(url => url.pathname === '/welcome');
    observations.cuisine = await choose(page, 'What cuisines do you enjoy?', 'Italian', 'Italian');
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    observations.diet = await choose(page, 'Do you follow a particular diet?', 'Vegetarian', 'Vegetarian');
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    observations.condition = await choose(page, 'Do you have a medical condition?', 'allergy', 'Allergic rhinitis, unspecified');
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.getByPlaceholder('Enter price', { exact: true }).fill('12.50');
    await page.getByRole('button', { name: 'Review', exact: true }).click();
    await page.getByRole('heading', { name: "Here's what we'll check against", exact: true }).waitFor();
    await page.screenshot({ path: resolve(evidence, '003-welcome-review.png'), fullPage: true });
    await page.getByRole('button', { name: 'Save profile', exact: true }).click();
    const outcome = await Promise.race([
      page.waitForURL(url => url.pathname === '/dashboard').then(() => 'PASS'),
      page.getByRole('alert').getByText("Couldn't save your profile. Please try again.", { exact: true }).waitFor().then(() => 'failed'),
    ]);
    observations.same_session = { path: new URL(page.url()).pathname, save: outcome };
    await page.screenshot({ path: resolve(evidence, `003-same-session-${outcome}.png`), fullPage: true });
    await writeFile(resolve(evidence, '003-ui-results.json'), JSON.stringify(observations, null, 2));
    console.log('NEON_SAME_SESSION', JSON.stringify(observations));
    assert.equal(outcome, 'PASS', 'same-session onboarding must save without a second login');
    await page.getByRole('heading', { name: 'What should I eat?', exact: true }).waitFor();
    await checkChips(page);
    observations.save = 'PASS';
  });

  // Context C: fresh identity session; routing must come from persisted data.
  await harness.withContext(async ({ page }) => {
    await harness.login(page, account);
    await page.waitForURL(url => url.pathname === '/dashboard');
    await page.getByRole('heading', { name: 'What should I eat?', exact: true }).waitFor();
    await checkChips(page);
    await page.screenshot({ path: resolve(evidence, '003-fresh-login-dashboard.png'), fullPage: true });
    observations.fresh_login_read = 'PASS';
    observations.chips = ['Vegetarian', 'Allergic rhinitis, unspecified'];
  });
  observations.result = 'PASS';
  await writeFile(resolve(evidence, '003-ui-results.json'), JSON.stringify(observations, null, 2));
  console.log('NEON_UI_E2E', JSON.stringify(observations));
} catch (error) {
  observations.result = 'FAIL';
  observations.error = error.message;
  await writeFile(resolve(evidence, '003-ui-results.json'), JSON.stringify(observations, null, 2));
  throw error;
} finally {
  await harness.close();
}
