// Usage: node scripts/e2e/screenshots.mjs <baseUrl> <outDir>   Needs Chrome + playwright-core.
// Screenshots the Next.js port: login/register (light + dark), stepper, dashboard,
// cards/skeleton/empty, at mobile and desktop; plus keyboard/a11y checks.
import { chromium } from "playwright-core";
import { mkdirSync, writeFileSync } from "node:fs";
import { scopedIntakeDraft } from "../../../scripts/post-deploy-common.mjs";

const [base, outDir] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const CHROME = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const viewports = {
  mobile: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  desktop: { width: 1440, height: 900, deviceScaleFactor: 1 },
};
const report = { shots: [], checks: [], consoleErrors: {} };
const check = (name, ok, detail = "") => report.checks.push({ name, ok, detail });
const browser = await chromium.launch({ executablePath: CHROME, headless: true });

const settle = async (page, ms = 700) => {
  await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
  await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
  await page.waitForTimeout(ms);
};
async function go(page, url) {
  for (let i = 0; i < 4; i++) {
    try { return await page.goto(url); } catch (e) {
      if (!String(e).includes("ERR_ABORTED")) throw e;
      await page.waitForTimeout(1500);
    }
  }
}
const shot = async (page, name, vp, full = true) => {
  await settle(page);
  const file = `next-${name}-${vp}.png`;
  await page.screenshot({ path: `${outDir}/${file}`, fullPage: full });
  report.shots.push({ file, url: page.url().replace(base, "") });
};
const active = (page) => page.evaluate(() => {
  const el = document.activeElement;
  return { tag: el?.tagName, role: el?.getAttribute("role"), name: el?.getAttribute("name"), text: (el?.getAttribute("aria-label") || el?.textContent || "").trim().slice(0, 40) };
});

for (const [vp, opts] of Object.entries(viewports)) {
  const ctx = await browser.newContext({ viewport: { width: opts.width, height: opts.height }, ...opts });
  const page = await ctx.newPage();
  page.setDefaultNavigationTimeout(180000);
  page.setDefaultTimeout(60000);
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 240)));
  page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 240)}`));

  // Auth: redirects, login tab, register tab, validation errors, dark mode.
  let r = await go(page, `${base}/`);
  await settle(page);
  check(`${vp}: / -> /login without session`, new URL(page.url()).pathname === "/login", `${r?.status()} ${page.url()}`);
  await shot(page, "01-login", vp);

  if (vp === "desktop") {
    await page.keyboard.press("Tab"); // brand link
    await page.keyboard.press("Tab"); // first tab
    let a = await active(page);
    check("Tab reaches the Log in tab", a.role === "tab", JSON.stringify(a));
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(250);
    check("ArrowRight switches to Create account", await page.getByRole("heading", { name: "Create your account" }).isVisible());
    await page.keyboard.press("ArrowLeft");
    await page.waitForTimeout(250);
  }

  await page.getByLabel("Email").fill("not-an-email");
  await page.getByLabel("Password").fill("123");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await page.waitForTimeout(500);
  const msgs = await page.locator('[data-slot="form-message"]').allTextContents();
  check(`${vp}: client validation shows both errors`, msgs.length === 2, JSON.stringify(msgs));
  const invalid = await page.getByLabel("Email").getAttribute("aria-invalid");
  check(`${vp}: invalid field flagged`, invalid === "true", String(invalid));
  await shot(page, "02-login-errors", vp);

  await page.getByRole("tab", { name: "Create account" }).click();
  await shot(page, "03-register", vp);

  // Register a real local user (D1 + KV session), then try to log in.
  const email = `next${Date.now()}@food4u.test`;
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("Sprint1-local");
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await page.waitForTimeout(2500);
  await settle(page);
  const cookies = await ctx.cookies();
  check(`${vp}: register sets __session cookie (KV session)`, cookies.some((c) => c.name === "__session"), cookies.map((c) => c.name).join(","));
  check(`${vp}: register switches to Log in tab`, await page.getByRole("heading", { name: "Welcome back" }).isVisible().catch(() => false));
  await shot(page, "04-after-register", vp, false);

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("Sprint1-local");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 150000 }).catch(() => {});
  await settle(page);
  const afterLogin = new URL(page.url()).pathname;
  check(`${vp}: login handled (dashboard if backend accepts, else error shown)`, afterLogin !== "/login" || (await page.getByRole("alert").isVisible().catch(() => false)), afterLogin);
  await shot(page, "05-after-login", vp, false);

  // Dark mode on the auth screen.
  await page.emulateMedia({ colorScheme: "dark" });
  await go(page, `${base}/login`);
  await shot(page, "06-login-dark", vp, false);
  await page.emulateMedia({ colorScheme: "light" });

  // App surfaces via the temporary preview route (backend-independent).
  await go(page, `${base}/dev-preview?view=dashboard`);
  await shot(page, "07-dashboard", vp);
  const ask = page.getByLabel("Ask about food");
  await ask.focus();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
  check(`${vp}: empty ask shows inline error`, await page.getByRole("alert").isVisible());
  const menu = page.getByRole("button", { name: "Account menu" });
  await menu.focus();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(400);
  check(`${vp}: account menu opens with Sign out`, await page.getByRole("menuitem", { name: /Sign out/ }).isVisible());
  await shot(page, "08-account-menu", vp, false);
  await page.keyboard.press("Escape");

  await go(page, `${base}/dev-preview?view=cards`);
  await page.getByRole("button", { name: "Ingredients" }).first().click();
  await page.getByRole("button", { name: "Nutrients" }).first().click();
  await shot(page, "09-cards-skeleton-empty", vp);
  const strips = await page.locator("text=Checked against").count();
  check(`${vp}: Check strip only on the card with data`, strips === 1, String(strips));

  // The real signed-in intake supplies the identity; anonymous preview providers
  // cannot read an account-scoped draft. Never invent an id or use formState.
  await go(page, `${base}/welcome`);
  await settle(page);
  await page.waitForFunction(() => Object.keys(localStorage).some(key => key.startsWith("food4u:intake:v1:")));
  const draft = scopedIntakeDraft(await page.evaluate(() => Object.entries(localStorage)));
  if (!draft) throw new Error("Expected exactly one current-account intake draft and no legacy key");
  await page.evaluate(({ key, envelope, state }) => localStorage.setItem(key, JSON.stringify({ ...envelope, state })), {
    ...draft, state: { currentStep: 3, answers: [{ questionId: 11, answers: [{ name: "Lactose intolerance", code: "E73.9" }, { name: "Peanut allergy" }] }] },
  });
  await page.reload();
  await shot(page, "10-welcome-step", vp);
  const pb = await page.getByRole("progressbar").getAttribute("aria-valuenow");
  check(`${vp}: stepper progress exposed`, pb === "60", String(pb));
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Review" }).click();
  await shot(page, "11-welcome-review", vp);

  await page.emulateMedia({ colorScheme: "dark" });
  await go(page, `${base}/dev-preview?view=dashboard`);
  await shot(page, "12-dashboard-dark", vp, false);

  report.consoleErrors[vp] = errors;
  await ctx.close();
}
await browser.close();
writeFileSync(`${outDir}/next-report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
