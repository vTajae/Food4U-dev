import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const codePattern = /\b[A-Z]\d\d(?:\.\w+)?\b/;
const evidence = resolve(process.env.PICKER_EVIDENCE || 'contract/.evidence');
const prefix = process.env.PICKER_PREFIX || '017';

// The harness deliberately discards ownerless formState. Inspect/seed only this
// real login's versioned draft; the official-payload assertions below remain.
async function ownDraft(page) {
  await page.waitForFunction(() => Object.keys(localStorage).some(key => key.startsWith('food4u:intake:v1:')));
  const draft = await page.evaluate(() => {
    const keys = Object.keys(localStorage).filter(key => key.startsWith('food4u:intake:v1:'));
    if (keys.length !== 1) throw new Error('Expected exactly one current-login draft');
    return { key: keys[0], envelope: JSON.parse(localStorage.getItem(keys[0])), legacy: localStorage.getItem('formState') };
  });
  assert.match(draft.key, /^food4u:intake:v1:[0-9a-f-]{36}$/i);
  assert.equal(draft.envelope.version, 1);
  assert.equal(draft.key, `food4u:intake:v1:${draft.envelope.identity}`);
  assert.equal(draft.legacy, null, 'ownerless legacy draft must not remain');
  return draft;
}

export async function runOnboardingPickers(t, harness) {
  const { base, register, login, email } = harness;
  await mkdir(evidence, { recursive: true });
  let diagnosticId = 0;
  const withContext = callback => harness.withContext(async surfaces => {
    const id = ++diagnosticId;
    const diagnostics = { pageErrors: [], consoleErrors: [], requestFailures: [] };
    surfaces.page.on('pageerror', error => diagnostics.pageErrors.push(error.message));
    surfaces.page.on('console', message => {
      if (message.type() === 'error') diagnostics.consoleErrors.push({ text: message.text(), url: message.location().url });
    });
    surfaces.page.on('requestfailed', request => diagnostics.requestFailures.push({ url: request.url(), error: request.failure()?.errorText }));
    try {
      await callback(surfaces);
      assert.deepEqual(diagnostics.pageErrors, [], 'no renderer exceptions');
    } finally {
      await writeFile(resolve(evidence, `${prefix}-browser-diagnostics-${id}.json`), JSON.stringify(diagnostics, null, 2));
    }
  });
  const welcome = async page => {
    const account = email();
    await register(page, account);
    await login(page, account);
    await page.goto(`${base}/welcome`, { waitUntil: 'networkidle' });
    await page.getByText('Step 1 of 5', { exact: true }).waitFor();
  };
  const screenshot = (page, name) => page.screenshot({ path: resolve(evidence, `${prefix}-${name}.png`), fullPage: true });
  const noCodes = async page => assert.doesNotMatch(await page.locator('body').innerText(), codePattern, 'ICD metadata must not be visible');
  const fits = async page => {
    const box = await page.locator('[data-slot="popover-content"]').boundingBox();
    assert.ok(box && box.x >= 0 && box.x + box.width <= page.viewportSize().width + 1, 'picker stays inside the viewport');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no horizontal overflow');
  };

  for (const [device, width] of [['desktop', 1280], ['phone', 390]]) {
    await t.test(`onboarding ${device}: browse cuisines before typing, select multiple and filter`, () => withContext(async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await welcome(page);
      const trigger = page.getByRole('combobox', { name: 'What cuisines do you enjoy?', exact: true });
      await trigger.click();
      try {
        const italian = page.getByRole('checkbox', { name: 'Italian', exact: true });
        await italian.waitFor({ timeout: 4000 });
        await page.getByText('Choose all that apply.', { exact: true }).waitFor();
        assert.equal(await page.getByRole('group', { name: 'Cuisines', exact: true }).count(), 1);
        const controls = await trigger.getAttribute('aria-controls');
        assert.equal(await page.locator(`[id="${controls}"]`).count(), 1, 'controls points to actual dialog');
        assert.equal(await trigger.getAttribute('aria-haspopup'), 'dialog');
        assert.equal(await page.getByRole('checkbox', { checked: true }).count(), 0, 'focus is not selection');
        await page.keyboard.press('Tab');
        await page.keyboard.press('Space');
        assert.equal(await page.getByRole('checkbox', { name: 'African', exact: true }).isChecked(), true, 'native keyboard selection');
        await page.keyboard.press('Space');
        assert.equal(await page.getByRole('checkbox', { checked: true }).count(), 0);
        assert.equal(await page.getByRole('checkbox').count(), 27);
        const input = page.getByPlaceholder('Search cuisines, e.g. Italian, Thai', { exact: true });
        assert.equal(await input.inputValue(), '');
        await fits(page);
        await noCodes(page);
        await screenshot(page, `cuisines-${device}`);
        await italian.click();
        await page.getByRole('checkbox', { name: 'French', exact: true }).click();
        assert.match(await trigger.innerText(), /Italian.*French/);
        assert.equal(await italian.isChecked(), true);
        assert.equal(await page.getByRole('checkbox', { name: 'French', exact: true }).isChecked(), true);
        assert.equal(await page.getByRole('checkbox', { checked: true }).count(), 2);
        await page.keyboard.press('Escape');
        await page.waitForFunction(() => document.activeElement?.getAttribute('role') === 'combobox' && document.activeElement?.getAttribute('aria-expanded') === 'false');
        assert.equal(await trigger.evaluate(element => element === document.activeElement), true, 'Escape returns focus');
        const chips = page.getByRole('list', { name: 'Your answers' });
        assert.match(await chips.innerText(), /Italian/);
        assert.match(await chips.innerText(), /French/);
        await trigger.click();
        await page.getByRole('checkbox', { name: 'Greek', exact: true }).click();
        assert.match(await trigger.innerText(), /Italian[\s\S]*French[\s\S]*\+1 more/);
        await input.fill('tha');
        await page.getByRole('checkbox', { name: 'Thai', exact: true }).waitFor();
        await page.waitForFunction(() => document.querySelectorAll('input[type="checkbox"]').length === 1);
        assert.equal(await page.getByRole('checkbox').count(), 1);
        await input.fill('');
        await page.getByRole('checkbox', { name: 'Italian', exact: true }).waitFor();
        assert.equal(await page.getByRole('checkbox').count(), 27);
      } catch (error) {
        await screenshot(page, `cuisines-${device}-failure`);
        throw error;
      }
    }));

    await t.test(`onboarding ${device}: browse peanut allergy with learning text and hidden metadata`, () => withContext(async ({ page, context }) => {
      await page.setViewportSize({ width, height: 900 });
      await welcome(page);
      for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Continue', exact: true }).click();
      const trigger = page.getByRole('combobox', { name: 'Any allergies or foods you avoid?', exact: true });
      await trigger.click();
      try {
        const peanut = page.getByRole('checkbox', { name: 'Peanut allergy', exact: true });
        await peanut.waitFor({ timeout: 4000 });
        await page.getByText('Common food allergies and intolerances', { exact: true }).waitFor();
        assert.ok((await peanut.getAttribute('aria-describedby'))?.length > 0, 'curated option teaches with secondary text');
        await page.getByText('Choose all that apply.', { exact: true }).waitFor();
        await fits(page);
        await noCodes(page);
        await screenshot(page, `allergies-${device}`);
        await page.getByText('Your immune system reacts to peanuts.', { exact: true }).waitFor();
        await peanut.click();
        assert.match(await trigger.innerText(), /Peanut allergy/);
        await page.keyboard.press('Escape');
        assert.match(await page.getByRole('list', { name: 'Your answers' }).innerText(), /Peanut allergy/);
        const stored = (await ownDraft(page)).envelope.state;
        assert.deepEqual(stored.answers.find(q => q.questionId === 11).answers, [{ name: 'Allergy to peanuts', code: 'Z91.010' }]);

        // Fixture only at the public remote-search response boundary. Curated
        // browsing above uses the real route; no clinical/Render egress is needed.
        await context.route('**/api/refs?**', async route => {
          const url = new URL(route.request().url());
          if (url.searchParams.get('type') === 'conditions' && url.searchParams.get('query') === 'celiac') {
            await route.fulfill({ json: { suggestions: [{ name: 'Celiac disease', code: 'K90.0' }] } });
          } else await route.continue();
        });
        await trigger.click();
        const input = page.getByPlaceholder('Search allergies or intolerances, e.g. peanut, lactose', { exact: true });
        await input.fill('celiac');
        await page.getByText('Search results', { exact: true }).waitFor();
        await page.getByRole('checkbox', { name: 'Celiac disease (gluten)', exact: true }).waitFor();
        assert.equal(await page.getByRole('checkbox').count(), 1);
        await noCodes(page);
        await input.fill('');
        await page.getByText('Common food allergies and intolerances', { exact: true }).waitFor();
        await page.keyboard.press('Escape');
        await page.getByRole('button', { name: 'Continue', exact: true }).click();
        assert.equal(await page.getByText('Choose all that apply.', { exact: true }).count(), 0, 'price is single-valued');
        await page.getByText('e.g. 12.50', { exact: true }).waitFor();
        await page.getByPlaceholder('Enter price', { exact: true }).fill('12.50');
        await page.getByRole('button', { name: 'Review', exact: true }).click();
        await page.getByRole('heading', { name: "Here's what we'll check against", exact: true }).waitFor();
        await page.getByText('Peanut allergy', { exact: true }).waitFor();
        await noCodes(page);
      } catch (error) {
        await screenshot(page, `allergies-${device}-failure`);
        throw error;
      }
    }));
  }

  await t.test('onboarding diets browse immediately and filter locally; common conditions keep official payloads', () => withContext(async ({ context, page }) => {
    await welcome(page);
    let dietLoads = 0;
    await context.route('**/api/refs?**', async route => {
      const url = new URL(route.request().url());
      if (url.searchParams.get('type') === 'diets') {
        dietLoads++;
        assert.equal(url.searchParams.get('query'), '', 'load full diet list only');
        await route.fulfill({ json: { suggestions: [{ name: 'Vegetarian' }, { name: 'Vegan' }] } });
      } else await route.continue();
    });
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    const diets = page.getByRole('combobox', { name: 'Do you follow a particular diet?', exact: true });
    await diets.click();
    await page.getByRole('checkbox', { name: 'Vegetarian', exact: true }).waitFor();
    await page.getByPlaceholder('Search diets, e.g. vegetarian, vegan', { exact: true }).fill('vega');
    await page.getByRole('checkbox', { name: 'Vegan', exact: true }).waitFor();
    assert.equal(await page.getByRole('checkbox').count(), 1);
    assert.equal(dietLoads, 1);
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    const medical = page.getByRole('combobox', { name: 'Do you have a medical condition?', exact: true });
    await medical.click();
    await page.getByText('Common conditions', { exact: true }).waitFor();
    const diabetes = page.getByRole('checkbox', { name: 'Type 2 diabetes', exact: true });
    await diabetes.waitFor();
    assert.equal(await page.getByRole('checkbox').count(), 9);
    assert.ok((await diabetes.getAttribute('aria-describedby'))?.length > 0);
    await noCodes(page);
    await diabetes.click();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Remove Type 2 diabetes', exact: true }).waitFor();
    const stored = (await ownDraft(page)).envelope.state;
    assert.deepEqual(stored.answers.find(q => q.questionId === 1).answers, [{ name: 'Type 2 diabetes mellitus without complications', code: 'E11.9' }]);
  }));

  await t.test('onboarding clearing a pending clinical search restores curated options without stale results', () => withContext(async ({ context, page }) => {
    await welcome(page);
    for (let i = 0; i < 2; i++) await page.getByRole('button', { name: 'Continue', exact: true }).click();
    const searching = page.waitForRequest(request => new URL(request.url()).searchParams.get('query') === 'late');
    let release;
    const pending = new Promise(ok => { release = ok; });
    await context.route('**/api/refs?**', async route => {
      const url = new URL(route.request().url());
      if (url.searchParams.get('query') === 'late') {
        await pending;
        await route.fulfill({ json: { suggestions: [{ name: 'Late result, unspecified', code: 'X99.9' }] } }).catch(() => {});
      } else await route.continue();
    });
    await page.getByRole('combobox', { name: 'Do you have a medical condition?', exact: true }).click();
    await page.getByText('Common conditions', { exact: true }).waitFor();
    const input = page.getByPlaceholder('Search conditions, e.g. diabetes, celiac', { exact: true });
    await input.fill('late');
    await searching;
    await input.fill('');
    await page.getByText('Common conditions', { exact: true }).waitFor();
    release();
    await page.waitForLoadState('networkidle');
    assert.equal(await page.getByRole('checkbox').count(), 9);
    assert.equal(await page.getByRole('checkbox', { name: 'Late result', exact: true }).count(), 0);
    await noCodes(page);
  }));

  await t.test('onboarding previously saved official medical answers render plain labels without changing metadata', () => withContext(async ({ page }) => {
    await welcome(page);
    const saved = { currentStep: 2, answers: [{ questionId: 1, answers: [{ name: 'Allergic rhinitis, unspecified', code: 'J30.9' }] }] };
    const draft = await ownDraft(page);
    await page.evaluate(({ key, envelope, state }) => localStorage.setItem(key, JSON.stringify({ ...envelope, state })), { ...draft, state: saved });
    await page.reload({ waitUntil: 'networkidle' });
    const trigger = page.getByRole('combobox', { name: 'Do you have a medical condition?', exact: true });
    assert.match(await trigger.innerText(), /Seasonal allergies \(hay fever\)/);
    await noCodes(page);
    for (let i = 0; i < 2; i++) await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.getByRole('button', { name: 'Review', exact: true }).click();
    await page.getByText('Seasonal allergies (hay fever)', { exact: true }).waitFor();
    await noCodes(page);
    const stored = (await ownDraft(page)).envelope.state;
    assert.deepEqual(stored.answers, saved.answers);
  }));
}
