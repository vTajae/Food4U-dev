# Sprint 1: wrangler / Cloudflare tooling upgrade, report

_2026-10-10 · `G:\WebDev\Food4U\Food4U` · branch `sprint1-ui-foundation` · 2 new commits, not pushed, no PR · Node 24.18.0 on Windows 11_

## Outcome

`npm run build` and `npm run dev` now work on this machine with the real `vite.config.ts`. The `workerd` crash (`structured exception 0xe06d7363`) is gone. Typecheck and lint have no new failures. Screenshots of every reachable route were taken at mobile and desktop widths and compared pixel by pixel against `main`: no layout changes.

## Versions

| Package | Before (`main`) | After (HEAD) |
|---|---|---|
| wrangler | 3.78.12 | **3.114.17** |
| miniflare (via wrangler) | 3.20240925.0 | 3.20250718.3 |
| workerd (via miniflare) | 1.20240925.0 (crashes here) | **1.20250718.0** (runs) |
| @cloudflare/workers-types | 4.20240925.0 | **4.20260702.1** |
| @remix-run/dev, cloudflare, cloudflare-pages, react | 2.11.2 | **2.17.5** (latest Remix 2) |
| vite | 5.4.8 | 5.4.8 (no change needed) |

**Deviation: wrangler 3.114.17, not the current 4.149.0.** Wrangler 4 cannot be installed cleanly next to Remix 2:
- `@remix-run/dev@2.17.5` declares `wrangler ^3.28.2`.
- `@remix-run/cloudflare@2.17.5` and `cloudflare-pages@2.17.5` require `@cloudflare/workers-types ^4`, while `wrangler@4.149.0` requires `^5`.

`npm install` fails with `ERESOLVE` (checked with `--dry-run`). Forcing it with `--legacy-peer-deps` or overrides would ship a dependency tree that npm calls "potentially broken". 3.114.17 is the newest wrangler that satisfies all peers, and its workerd (2025-07-18) runs here. I also checked workerd 2026-10-06 (wrangler 4's), which runs too, so moving to wrangler 4 later is possible. That needs the Remix 2 → React Router 7 migration, or accepting forced peer resolution.

## Commits (this step)

| Commit | Change |
|---|---|
| `eb6f39f` | Upgrade `@remix-run/*` to 2.17.5 |
| `4cef145` | Upgrade wrangler to 3.114.17 and workers-types to 4.20260702.1 (the commit message records the reasoning) |

No source changes were needed: the upgrade caused no breakage. `npm run typegen` (`wrangler types`) regenerates `worker-configuration.d.ts` identically apart from line endings, so it was not committed.

## Check results (`frontend/`)

| Check | Before this step | After | New failures |
|---|---|---|---|
| `npm run build` (real config) | ✗ workerd crash | **✓** client + SSR build; root CSS byte-identical to before (`root-CBBGRYlL.css`, 32.0 kB) | none |
| `npm run dev` | ✗ workerd crash | **✓** serves on :5173 | none |
| `npm run typecheck` | ✗ 2 errors | ✗ the same 2 errors | **none** |
| `npm run lint` | ✗ 8 errors | ✗ the same 8 errors | **none** |

The pre-existing typecheck and lint errors are unchanged and listed in `sprint1-step1-2-report.md`. Dev also prints Remix's React Router v7 future-flag notices (`v3_lazyRouteDiscovery`, `v3_singleFetch`). These are informational, and the flags were left off because turning them on changes runtime behavior.

## Screenshots (`docs/sprint/screenshots/`)

Captured with headless Chrome (playwright-core, run from a scratch folder, not added to the project) at **mobile 390×844 @2x** and **desktop 1440×900**, full page.

| File (`-mobile` / `-desktop`) | Route | What it shows |
|---|---|---|
| `branch-01-index-*` | `/` | redirects to `/login` (unauthenticated) |
| `branch-02-login-*` | `/login` | login tab |
| `branch-03-login-register-tab-*` | `/login` | register tab |
| `branch-04-after-login-*` | `/login` | after submitting login: stays on `/login` (see Blocked 1) |
| `branch-05-welcome-*` | `/welcome` → `/login` | not reachable without a session |
| `branch-06-dashboard-*` | `/dashboard` → `/login` | not reachable without a session |
| `baseline-main/main-*` | same | the same flow on `main` (Tailwind 3), run from a `git archive` copy with the fixed wrangler swapped in locally, not committed |
| `compare/cmp-*` | — | main / branch / diff side by side for the login and register views |
| `*-manifest.json` | — | final URL and HTTP status for each shot |

**Visual comparison, main vs branch:** identical image sizes and element boxes on every route, so there are **no layout, spacing, size or font changes**. Pixel differences (0.07–4% of each image) are color only, and both come from Tailwind 4 defaults in the earlier upgrade commit, not from this step:
1. Tailwind 4's default palette is OKLCH, so `blue-500/600` (the buttons and the "Login"/"Register" heading) are slightly more saturated, and the default placeholder gray is a little different.
2. `hover:` now applies only on devices that support hover, so in the mobile (touch) shots the just-tapped tab shows `blue-500` instead of its hover `blue-600`.

Neither is a regression in layout or function. Both disappear when items 3/5 move these screens onto the DESIGN.md tokens. To get exact v3 colors before then, the old hex values could be pinned in `@theme`; I didn't, since the legacy colors are being replaced.

## Blocked / notes

1. **`/welcome` and `/dashboard` could not be screenshotted, on `main` or the branch.** Registration works (local D1), but login calls the deployed backend (`GET https://food4u-nrpy.onrender.com/profile`) with a JWT signed by the local dev secret. The backend returns **500 Internal Server Error**, so `loginUser` fails and the user stays on `/login`. `main` behaves identically, so this is pre-existing and backend-side. The Render service is up but took **76 s to cold-start**. Reaching those routes needs a backend that accepts local tokens (local FastAPI, or a dev secret shared with the deployed one).
2. **Pre-existing bug seen along the way:** `/welcome`'s loader reads `session.get("welcome").isComplete` and throws `TypeError` (HTTP 500) when the session has auth but no `welcome` key (for example, an existing user who logs in).
3. **Pre-existing security issue:** `UserService.registerUser` logs the submitted `userData`, **including the plaintext password**, to the server console (`api/services/userService.ts:20`). Worth removing soon. Not touched here (out of scope).
4. **Local `wrangler.toml` created (gitignored, not committed).** The repo had none, so dev had no KV/D1 bindings. I recreated it from the binding names and dev values already committed in `worker-configuration.d.ts` (`cloudflare_KV`, `cloudflare_db`, the `testing123`/`happy` dev secrets) and ran `npm run d1:local-initialize`. Production bindings and secrets stay in the Cloudflare Pages project. Consider committing a `wrangler.toml.example` so a fresh clone can run `npm run dev`.
5. **Test data:** local D1 only has the user `qa@food4u.test`. No data was written to the remote backend; the only remote calls were the app's own read requests during login.
6. **Housekeeping:** both dev servers were stopped, including orphaned node processes on :5173/:5174. The working tree is clean. npm 11 still warns that install scripts for `esbuild`/`workerd` are pending approval; both binaries work without them.
