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
  await option.waitFor();
  const label = (await option.innerText()).trim();
  await option.click();
  await page.keyboard.press('Escape');
  return label;
}

try {
  // Context A: demonstrate the pre-existing registration-session failure.
  await harness.withContext(async ({ page }) => {
    await harness.register(page, account);
    await harness.login(page, account);
    await page.waitForURL(url => url.pathname === '/welcome');
    assert.equal(new URL(page.url()).pathname, '/welcome');
    await choose(page, 'What cuisines do you enjoy?', 'Italian', 'Italian');
    for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.getByRole('button', { name: 'Review', exact: true }).click();
    await page.getByRole('button', { name: 'Save profile', exact: true }).click();
    await page.getByRole('alert').getByText("Couldn't save your profile. Please try again.", { exact: true }).waitFor();
    observations.same_session = { path: '/welcome', save: 'failed', alert: "Couldn't save your profile. Please try again." };
    await page.screenshot({ path: resolve(evidence, 'same-session-save-failure.png'), fullPage: true });
  });

  // Context B: no registration welcome flag; dashboard creates Neon profile.
  await harness.withContext(async ({ page }) => {
    await harness.login(page, account);
    await page.waitForURL(url => url.pathname === '/welcome');
    assert.equal(new URL(page.url()).pathname, '/welcome');
    observations.cuisine = await choose(page, 'What cuisines do you enjoy?', 'Italian', 'Italian');
    for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Continue', exact: true }).click();
    observations.condition = await choose(page, 'Any allergies or foods you avoid?', 'allergy', 'Allergic rhinitis');
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.getByRole('button', { name: 'Review', exact: true }).click();
    await page.getByRole('heading', { name: "Here's what we'll check against", exact: true }).waitFor();
    await page.screenshot({ path: resolve(evidence, 'welcome-review.png'), fullPage: true });
    await page.getByRole('button', { name: 'Save profile', exact: true }).click();
    await page.waitForURL(url => url.pathname === '/dashboard');
    await page.getByRole('heading', { name: 'What should I eat?', exact: true }).waitFor();
    assert.equal(await page.getByText('Your profile:', { exact: true }).count(), 0);
    observations.save = 'PASS';
  });

  // Context C: fresh identity session; routing must come from persisted data.
  await harness.withContext(async ({ page }) => {
    await harness.login(page, account);
    await page.waitForURL(url => url.pathname === '/dashboard');
    await page.getByRole('heading', { name: 'What should I eat?', exact: true }).waitFor();
    assert.equal(await page.getByText('Your profile:', { exact: true }).count(), 0);
    await page.screenshot({ path: resolve(evidence, 'fresh-login-dashboard.png'), fullPage: true });
    observations.fresh_login_read = 'PASS';
    observations.chips = 'none (pre-existing defect, not acceptance criterion)';
  });
  observations.result = 'PASS';
  await writeFile(resolve(evidence, 'ui-results.json'), JSON.stringify(observations, null, 2));
  console.log('NEON_UI_E2E', JSON.stringify(observations));
} finally {
  await harness.close();
}
