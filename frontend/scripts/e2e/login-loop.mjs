// Feedback loop for the user-visible symptom: register → log in → expect /dashboard.
// Usage: node scripts/e2e/login-loop.mjs <baseUrl>   (exit 0 = green, 1 = red). Needs Chrome + playwright-core.
import { chromium } from "playwright-core";
const base = process.argv[2];
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const page = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
page.setDefaultNavigationTimeout(180000);
const net = [];
page.on("response", (r) => { if (r.request().method() === "POST" || r.url().includes("/api/")) net.push(`${r.request().method()} ${r.status()} ${new URL(r.url()).pathname}`); });
const email = `loop${Date.now()}@food4u.test`;
await page.goto(`${base}/login`); await page.waitForLoadState("networkidle");
await page.getByRole("tab", { name: "Create account" }).click();
await page.getByLabel("Email").fill(email); await page.getByLabel("Password").fill("Loop-pass-1");
await page.getByRole("button", { name: "Create account", exact: true }).click();
await page.getByRole("heading", { name: "Welcome back" }).waitFor({ timeout: 60000 });
await page.getByLabel("Email").fill(email); await page.getByLabel("Password").fill("Loop-pass-1");
const t0 = Date.now();
await page.getByRole("button", { name: "Log in", exact: true }).click();
await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 150000 }).catch(() => {});
await page.waitForLoadState("networkidle").catch(() => {});
const where = new URL(page.url()).pathname;
const alert = await page.getByRole("alert").textContent().catch(() => null);
console.log(JSON.stringify({ email, where, alert, ms: Date.now() - t0, net }, null, 1));
await b.close();
process.exit(where === "/dashboard" || where === "/welcome" ? 0 : 1);
