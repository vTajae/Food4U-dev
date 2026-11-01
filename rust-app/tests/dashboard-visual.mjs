// Actual app states, not a replacement preview page. Baseline gallery differences are explicit.
import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { root, base, profile, foods, launchProof, loginUI, expectProfile, ask } from './dashboard-browser.mjs';
const output = resolve(root, 'internal/sprint/screenshots/rust-007');
const baseline = resolve(root, 'internal/sprint/screenshots/nextjs/after');
await mkdir(output, { recursive: true });
const proof = await launchProof('dashboard-visual');
proof.report.shots = []; proof.report.comparisons = [];
proof.report.fixtureDifferences = [
  '05 desktop baseline is legacy login server failure and mobile is pending login; Rust is actual successful login with local mocked profile, intentionally not the same state.',
  '07/08 baseline used deleted uncommitted dev-preview with Q avatar; Rust uses genuine local D1 login with random ts- username, thus T avatar and different account label. Chips match visible baseline text and order.',
  '09 baseline showed simultaneous cards, skeleton and empty components in deleted preview. Rust captures separate actual API-driven states, with cards primary plus separate loading/empty comparisons.',
  '09 first baseline card has preview-only verdict/reason/check strip. Live legacy AskScreen does not pass those safety props; live Rust likewise does not invent safety metadata. Fixture food text reconstructed from baseline; hidden salmon ingredient/nutrient values are local sample data.',
];
async function shot(page, name, viewport, fullPage = true, reference = name) {
  // Do not await networkidle: the loading shot intentionally has an outstanding mock request.
  await page.evaluate(() => document.fonts.ready);
  const metrics = await page.evaluate(() => ({ width: innerWidth, height: innerHeight, dpr: devicePixelRatio, scrollWidth: document.documentElement.scrollWidth, url: location.pathname }));
  proof.check(`${viewport} ${name}: no horizontal overflow`, metrics.scrollWidth <= metrics.width);
  const file = `rust-${name}-${viewport}.png`;
  await page.screenshot({ path: resolve(output, file), fullPage, animations: 'disabled' });
  proof.report.shots.push({ file, name, viewport, reference, metrics });
}
function size(bytes) { assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a'); return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }; }
async function compare() {
  const context = await proof.contextFor({ deviceScaleFactor: 1 });
  try {
    const page = await context.newPage();
    for (const shot of proof.report.shots) {
      const reference = `next-${shot.reference}-${shot.viewport}.png`;
      const [left, right] = await Promise.all([readFile(resolve(baseline, reference)), readFile(resolve(output, shot.file))]);
      const a = size(left), b = size(right); const width = a.width + b.width, height = Math.max(a.height, b.height) + 32;
      await page.setViewportSize({ width, height });
      await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>*{box-sizing:border-box}html,body{margin:0;background:#dedde3;font:16px/32px Arial,sans-serif}main{display:flex;align-items:flex-start}figure{margin:0;flex:none}figcaption{height:32px;padding:0 12px;background:#23202a;color:white}img{display:block}</style></head><body><main><figure style="width:${a.width}px"><figcaption>Next.js baseline — ${shot.viewport}</figcaption><img width="${a.width}" height="${a.height}" src="data:image/png;base64,${left.toString('base64')}"></figure><figure style="width:${b.width}px"><figcaption>Rust actual ${shot.name} — ${shot.viewport}</figcaption><img width="${b.width}" height="${b.height}" src="data:image/png;base64,${right.toString('base64')}"></figure></main></body></html>`);
      await page.evaluate(() => Promise.all([...document.images].map(img => img.decode())));
      const file = `compare-${shot.name}-${shot.viewport}.png`;
      await page.screenshot({ path: resolve(output, file), fullPage: true, animations: 'disabled' });
      proof.report.comparisons.push({ file, baseline: reference, rust: shot.file, width, height });
    }
  } finally { await context.close(); }
}
let failure;
try {
  for (const [vp, options] of Object.entries({ desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 }, mobile: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } })) {
    const context = await proof.contextFor(options);
    try {
      const page = await context.newPage(); const user = await loginUI(page);
      await shot(page, '05-after-login', vp, false);
      // Separate anonymous page matches baseline06 auth state without deleting this session.
      const guest = await proof.contextFor({ ...options, colorScheme: 'dark' });
      try { const auth = await guest.newPage(); await auth.goto(`${base}/login`, { waitUntil: 'networkidle' }); await shot(auth, '06-login-dark', vp, false); } finally { await guest.close(); }
      await expectProfile(user); await page.goto(`${base}/dashboard`, { waitUntil: 'networkidle' });
      for (const chip of profile.attributes) proof.check(`${vp} profile ${chip.attribute_name}`, await page.getByText(chip.attribute_name, { exact: true }).isVisible());
      await shot(page, '07-dashboard', vp);
      const input = page.getByLabel('Ask about food'); await input.focus(); await input.press('Enter');
      await page.getByText('Type a question to get suggestions.', { exact: true }).waitFor();
      const menu = page.getByRole('button', { name: 'Account menu' }); await menu.focus(); await page.keyboard.press('Enter');
      await page.getByRole('menuitem', { name: 'Sign out' }).waitFor();
      await shot(page, '08-account-menu', vp, false); await page.keyboard.press('Escape');
      await ask(page, user, 'A gentle dinner', foods, 2500);
      await page.getByText('Finding meals that fit your plan…', { exact: true }).waitFor();
      await shot(page, '09-loading', vp, true, '09-cards-skeleton-empty');
      await page.getByRole('heading', { name: foods[0].description, exact: true }).waitFor();
      await page.getByRole('button', { name: 'Ingredients', exact: true }).first().click();
      await page.getByRole('button', { name: 'Nutrients', exact: true }).first().click();
      proof.check(`${vp} live Ask does not invent safety strips`, await page.getByText('Checked against', { exact: true }).count() === 0);
      await shot(page, '09-cards-skeleton-empty', vp);
      await ask(page, user, 'No local matches', []);
      await page.getByText('No matches for that', { exact: true }).waitFor();
      await shot(page, '09-empty', vp, true, '09-cards-skeleton-empty');
      await page.getByRole('button', { name: 'Account menu' }).click();
      await page.getByRole('menuitem', { name: 'Sign out' }).click(); await page.waitForURL(`${base}/login`);
    } finally { await context.close(); }
  }
  await compare();
} catch (error) { failure = error; }
await proof.finish(failure);
