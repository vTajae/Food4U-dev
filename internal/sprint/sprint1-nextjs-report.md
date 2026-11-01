# Sprint 1: Next.js on Cloudflare Workers port, report

_2026-10-11 · `G:\WebDev\Food4U\Food4U` · branch `sprint1-nextjs` (cut from `5a3129b`, the end of item 3) · not pushed, no PR. The abandoned React Router attempt is preserved as branch `rr7-attempt` (`03af7ef`)._

## 1. Approach and why

**Chosen: vinext (Next.js 16 API on Vite 8) targeting Cloudflare Workers**, as the Cloudflare guide recommends. Reasons, in order:

1. `npx vinext check` on the ported app reports **97% compatible, 0 issues** (14 supported, 1 partial). The one partial item is `reactStrictMode`, which vinext doesn't wrap for the App Router; Next.js defaults App Router strict mode on anyway, so nothing is lost.
2. Everything this app needs is in vinext's supported set: App Router, Server Components, Server Actions, route handlers, `proxy.ts` middleware, `next/headers` cookies, `next/navigation` redirects, Tailwind 4, and bindings via `import { env } from "cloudflare:workers"`.
3. It keeps the Vite toolchain the sprint already runs on (Tailwind 4 Vite plugin, `@cloudflare/vite-plugin`), and the `workerd` that wrangler 4 ships (2026-10-06) runs on this Windows machine (verified in the wrangler report).
4. OpenNext was not needed. If a gap had appeared (none did) the fallback was `@opennextjs/cloudflare`; see §8.

Setup used the official commands: `npx vinext check`, then `npx vinext init --platform=cloudflare --legacy-wrangler-cloudflare-init --skip-check --no-install --image-optimization=none --cdn-cache=none`. `--legacy-wrangler-cloudflare-init` was chosen deliberately: the request asked for wrangler 4 + `wrangler.jsonc`, and the alternative (`cf` + `cloudflare.config.ts`) is still a beta CLI (`cf@1.0.0-beta.14`). No cache adapters were enabled: the app is fully dynamic (per-user sessions), so ISR/`"use cache"` adapters would add Cloudflare resources for no benefit yet.

## 2. Versions

| | Before (end of item 3) | After |
|---|---|---|
| Framework | Remix 2.17.5 (`@remix-run/*`) | Next.js **16.4.0** App Router via **vinext 1.1.0** |
| React | 18.3.1 | **19.3.0** (vinext requires ≥19.2.6) |
| Build/dev | Vite 5.4.8 + Remix plugin | **Vite 8.3.4** + `vinext()` + `@cloudflare/vite-plugin` 1.63.1 + `@tailwindcss/vite` 4.3.3 |
| RSC | — | `@vitejs/plugin-rsc` 0.5.36, `react-server-dom-webpack` 19.3.0 (auto-registered by vinext) |
| Cloudflare | wrangler 3.114.17, Pages Functions, `@cloudflare/workers-types` 4 | **wrangler 4.149.0**, Workers (`wrangler.jsonc`), types from `wrangler types` |
| Deploy | `wrangler pages deploy ./build/client` | `@vinext/cloudflare deploy` 1.1.0 |
| Node | ≥20 | **≥22** (vinext/wrangler 4 requirement; this machine: 24.18) |
| Removed deps | | `@remix-run/*`, `vite-tsconfig-paths`, `vite-plugin-html`, `isbot`, `prop-types`, `aws-sdk`, `mock-aws-s3`, `nock`, `@mapbox/node-pre-gyp`, `autocomplete-lhc`, `postcss`, `@cloudflare/workers-types` (all unused or Remix-only) |
| Bumped | | `@react-spring/web` 9.7 → 10.1 (9.x pins React ≤18); `lodash.debounce` now declared (was only reachable through Remix's tree) |
| Kept | | react-hook-form 7.53, zod 3.23, `@hookform/resolvers` 3.9, radix-ui, cmdk, sonner, lucide, cva, clsx, tailwind-merge, bcrypt-ts, `@tsndr/cloudflare-worker-jwt`, all of `api/` |

## 3. Route mapping (old → new)

| Remix (old) | Next.js (new) | Notes |
|---|---|---|
| `app/root.tsx` | `app/layout.tsx` | fonts, Toaster, no-flash theme script; `data-theme` no longer pinned |
| `app/routes/_index.tsx` (loader redirect) | `app/page.tsx` | `redirect(session ? /dashboard : /login)` |
| `app/routes/_auth.login.tsx` + `components/login/*Form.tsx` | `app/(auth)/layout.tsx`, `app/(auth)/login/page.tsx`, `app/(auth)/login/actions.ts` (`authenticate` Server Action), `components/login/auth-tabs.tsx`, `auth-form.tsx` | same zod rules, D1 register, bcrypt login, JWT mint; the JWT is now stored in the KV session; failed login/register now **shows the message** (was silently swallowed) |
| `app/routes/_auth.welcome.tsx` + `components/form/index.tsx` | `app/(app)/welcome/page.tsx`, `welcome/actions.ts` (`submitWelcome`), `components/onboarding/stepper.tsx` | same 5 questions/ids, same localStorage draft, same `/welcome` payload to the backend |
| `app/routes/_auth.dashboard.tsx` + `search/bar.tsx`, `display.tsx`, `results.tsx` | `app/(app)/dashboard/page.tsx`, `components/ask/*`, `components/results/*` | same profile-load / token-refresh / onboarding-redirect logic; UI redesigned (§5) |
| `app/routes/_auth.api.refs.tsx` (loader) | `app/api/refs/route.ts` `GET` | now requires a session (401 otherwise) |
| `app/routes/_auth.api.suggestion.tsx` (action) | `app/api/suggestion/route.ts` `POST` | same actions; accepts `query` or `text` |
| `app/routes/_auth.api.clinicals.tsx` (action) | `app/api/clinicals/route.ts` `POST` | same zod schema and branches |
| `app/routes/_auth.api.tsx`, `_auth.api.food.tsx` | removed | were empty / fully commented out |
| `app/routes/_auth.$.tsx` (splat 404) | `app/not-found.tsx` | styled with tokens |
| — | `app/api/auth/logout/route.ts` `POST` | new: destroys the KV session (there was no sign-out before) |
| — | `app/privacy/page.tsx` | new: placeholder so the disclaimer footer links resolve |
| `functions/_middleware.ts` (commented-out auth gate) + per-loader `checkAuthentication` | `proxy.ts` (cookie-presence gate on `/`, `/login`, `/welcome/*`, `/dashboard/*`) + `app/(app)/layout.tsx` (`requireSession()`, verifies the KV session and redirects) | the split means the edge gate needs no KV call |
| `functions/[[path]].ts` (Pages Functions handler), `load-context.ts` | removed | the Worker entry is vinext's `vinext/server/fetch-handler`; bindings come from `cloudflare:workers` |
| `app/context/session/session.ts` (Remix KV session storage) | `lib/session.ts` | same cookie name `__session`, same 30-day TTL, data in KV under `session:<id>`, HMAC-SHA256-signed cookie with `USER_SESSION_SECRET` |
| `app/context/session/checkAuthentication.ts` | `lib/auth.ts` (`requireSession`, `applyBackendToken`) | |
| `app/context/auth/auth-service.ts` | `lib/auth-service.ts` | unchanged |
| `app/components/*`, `app/lib/*`, `app/utils/*`, `app/context/refs/*` | `components/*`, `lib/*` | moved out of `app/` (reserved for routes); `~/*` now maps to the project root |

## 4. Deploy-target changes

- **Cloudflare Pages → Cloudflare Workers.** `wrangler.jsonc` (committed) declares: `main: "vinext/server/fetch-handler"`, static assets from `dist/client` (binding `ASSETS`), `nodejs_compat`, observability, the `cloudflare_KV` KV namespace and `cloudflare_db` D1 database bindings (same binding names as before, so `api/` is unchanged), and the non-secret vars `JWT_ACCESS_TOKEN_EXPIRE_MINUTES`, `API_BASE_URL`.
- **Secrets are no longer in config.** `USER_SESSION_SECRET`, `USER_COOKIE_SECRET`, `JWT_SECRET_KEY` come from `.dev.vars` locally (`.dev.vars.example` is committed with placeholders; this replaces `wrangler.toml.example`) and from `wrangler secret put` in production.
- **Scripts:** `dev` = `vite dev --port 3001`, `build` = `vite build` (RSC + SSR + client), `start` = `wrangler dev --config dist/server/wrangler.json` (built Worker locally), `deploy` = `vinext-cloudflare deploy --config dist/server/wrangler.json`, `typegen` = `wrangler types`, `check` = `vinext check`. The D1 scripts are unchanged.
- **Types:** `worker-configuration.d.ts` is generated by `wrangler types` from `wrangler.jsonc` (+ `.dev.vars`) and declares the global `Env` and the `cloudflare:workers` module.

## 5. UI redesign (backlog items 4–5 pulled forward)

Every screen was rebuilt against `DESIGN.md` and `docs/sprint/x-posts-ui-takeaways.md` (T1–T11). Nothing in `app/` or `components/` uses a non-token color any more; `.btn-primary`, `.input-field`, the fade keyframes, `*-hide-after-*` and all gradients are gone.

| Screen | What changed (takeaway) |
|---|---|
| Login / register | Two-pane auth layout: promise + "what we check against" on the left, white form pane on the right; brand mark; Tabs; one aubergine primary button; inline errors with icon; dark mode (T2, T3, T4, T10). Phones get brand + promise above the form. |
| App shell | 64px top bar (brand, Ask/Profile, account menu with theme choice and **Sign out**), 64px bottom tab bar on phones with safe-area inset, disclaimer footer with Privacy / health-data / Support links (T5, T9). |
| Welcome | Stepper: "STEP n OF 5", 4px aubergine progress bar (`role=progressbar`), one question per screen, selected answers as constraint chips with 44px remove buttons, Back (tertiary) / Continue (primary) pinned to the bottom on phones, review step as chips grouped by question (T4, T6, T11). |
| Dashboard | "What should I eat?" + ask box (Enter submits, Shift+Enter newline, grows to 4 lines, inline arrow button, inline validation), suggestion chips replacing the three red buttons, "Your profile" chips from the backend profile, results one column / two at ≥1024px, skeleton cards while loading, designed empty state with a single-color line drawing, toasts for errors (T4, T7, T9). |
| Recommendation card | Verdict badge, reason line and **Check strip** are props; they render **only when data is present**. The USDA payload has none of them today, so live cards show neither (the preview screenshot shows one card with sample verdict data and one without) (T8). |
| Dark mode | `data-theme` unpinned; follows the OS, overridable from the account menu, persisted per device, applied before paint by an inline script; `color-scheme` set so native controls match (T10). |
| Motion | Only feedback transitions (150–200ms), stepper fill, dialog/popover/toast enter-exit; all off under `prefers-reduced-motion` (T11). |

## 6. Check results

All in `frontend/`, on the final commit `9291e8f`, Node 24.18 on Windows 11.

| Check | Result | Versus the pre-existing baseline |
|---|---|---|
| `npx vinext check` | 97% compatible: 14 supported, 1 partial (`reactStrictMode`, see §1), **0 issues** | — |
| `npm run typegen` (`wrangler types`) | ✓ `Env` with `cloudflare_KV`, `cloudflare_db`, vars and `.dev.vars` secrets; `cloudflare:workers` typed | — |
| `npm run d1:local-initialize` | ✓ (local D1 created from `database/basic.sql`) | — |
| `npm run typecheck` (`tsc`) | ✗ **1 error**, pre-existing: `lib/clinicTables.ts` `AutocompleteResult` undefined | baseline had 2; the other (`userRepository` import) is fixed. **No new errors.** |
| `npm run lint` | ✗ **5 errors**, all pre-existing (`no-explicit-any` ×4 in `api/repo/userRepository.ts`, `api/services/clinicalService.ts`, `lib/clinicTables.ts`; unused `parseAutocompleteData`) | baseline had 8; the other 3 were in deleted Remix routes. **No new errors.** (`cloudflare:workers` is declared an ESLint core module.) |
| `npm run build` (`vite build`) | ✓ RSC + SSR + client bundles in `dist/`, `dist/server/index.js` + `dist/server/wrangler.json` | — |
| `npm run dev` (`vite dev` :3001) | ✓ on this Windows machine; `/` → 307 `/login`, `/welcome` and `/dashboard` → 307 `/login` without a session, `/login` 200, `/api/refs` 200, unknown path → styled 404 | — |
| Browser run (Playwright, headless Chrome) | 24 screenshots, **21/22 checks pass**, 0 console errors in both viewports | — |

Browser checks that pass: `/` redirects; Tab reaches the tab list and ArrowLeft/Right switch Log in / Create account; client validation shows both messages and flags `aria-invalid`; **register writes a D1 row and sets the `__session` cookie (KV session)** and switches to the Log in tab with a toast; empty ask box shows an inline error; the account menu opens by keyboard and contains Sign out; the Check strip renders only on the card that has data; the stepper exposes `aria-valuenow`; dark mode renders on every screen.
The one failing check (mobile "login handled") is the Render backend's cold start: the capture shows the button in its "Logging in…" pending state 150 s after submit; the desktop run, which hit the warm backend, passed. Not a port issue (see §9).

Dev-mode console notes (not errors): vinext prints React's "eval() is not supported in this environment" once (React dev tooling inside workerd; production never uses eval), and a one-off Vite "client component dependency is inconsistently optimized" warning on first start.

## 7. Screenshots (`docs/sprint/screenshots/nextjs/`)

**Before** (`before/`, from the item-3 Remix build): `item3-01-login-*`, `item3-04-register-*` (dark gradient-free but still the plain centered card), `preview-01-overview-*` (old onboarding question), `preview-03-cards-expanded-*` (old result cards).

**After** (`after/`, each at mobile 390×844@2x and desktop 1440×900):

| File | Shows |
|---|---|
| `next-01-login-*` | two-pane auth layout, brand, promise, Tabs, primary button |
| `next-02-login-errors-*` | inline validation with icons, flagged fields |
| `next-03-register-*` | Create account tab |
| `next-04-after-register-*` | success toast, back on Log in |
| `next-05-after-login-*` | login submitted (pending/backend outcome) |
| `next-06-login-dark-*` | auth screen in dark mode |
| `next-07-dashboard-*` | app shell, ask box, suggestion chips, profile chips, empty state |
| `next-08-account-menu-*` | account menu: appearance choice, Sign out |
| `next-09-cards-skeleton-empty-*` | recommendation card **with** verdict/reason/Check strip (sample data) next to one **without** (as live USDA data renders), skeletons, empty state |
| `next-10-welcome-step-*` | stepper step 4/5 with progress bar and constraint chips (mobile: pinned Back/Continue + tab bar) |
| `next-11-welcome-review-*` | review step |
| `next-12-dashboard-dark-*` | dashboard in dark mode |
| `next-report.json` | the check results |

`07`–`12` were captured on a temporary, uncommitted `/dev-preview` route (sample data inside the real `AppShell`/`AskScreen`/`OnboardingStepper`), then the route was deleted; everything else is the real app.

## 8. What the user must do in Cloudflare

1. **Create the Worker's resources once:** a KV namespace for sessions and a D1 database (`wrangler kv namespace create cloudflare_KV`, `wrangler d1 create cloudflare_db`), then put their ids into `wrangler.jsonc` (`REPLACE_WITH_KV_NAMESPACE_ID`, `REPLACE_WITH_D1_DATABASE_ID`). Run `npm run d1:remote-initialize` to create the `user` table in the remote D1 (or migrate the existing Pages D1: the binding names are unchanged, so the existing database can be reused by pasting its id).
2. **Set the secrets** on the Worker: `wrangler secret put USER_SESSION_SECRET`, `… USER_COOKIE_SECRET`, `… JWT_SECRET_KEY` (the last must equal the FastAPI backend's secret).
3. **Deploy:** `wrangler login` (or `CLOUDFLARE_API_TOKEN` with the "Edit Cloudflare Workers" template) then `npm run deploy`. The first deploy creates the Worker `food4u-frontend` on `*.workers.dev`; add a custom domain/route in the dashboard if wanted.
4. **Retire the Pages project** (`my-remix-app-7c2.pages.dev`) once the Worker serves traffic, and update the backend's allowed origin if it checks one.
5. Existing users keep working: D1 rows and bcrypt hashes are unchanged. Existing **sessions do not carry over** (different cookie signing), so everyone logs in once.

## 9. Blocked / notes

1. **Live login still depends on the Render backend.** Registration (D1) and the KV session work end to end locally; login mints the JWT locally but then calls `GET /user/profile` on `food4u-nrpy.onrender.com`, which cold-starts for 30–75 s and returns 500 for local users (secret mismatch, see the wrangler report). The new form now **shows** that failure instead of swallowing it. `/welcome` and `/dashboard` with real data therefore still need a backend that shares `JWT_SECRET_KEY`.
2. **vinext is beta.** It passed every check here, but Cloudflare labels it beta; the fallback if a gap appears later is `@opennextjs/cloudflare` (nothing in this app needs it today).
3. **`dist/server/.dev.vars` is written by the build** (vinext copies it for `wrangler dev`). `dist/` is gitignored and `@vinext/cloudflare deploy` uses the Worker's real secrets, but don't publish `dist/`.
4. **`next-env.d.ts`** is rewritten by vinext to also import `.next/types/routes.d.ts` (gitignored, generated on build/dev). A fresh clone must run `npm run build` or `npm run dev` once before `npm run typecheck`, as with Next.js itself.
5. **The static `ApiService.token`** is still a module-level field (pre-existing design). It is now loaded from the KV session right before each use (`applyBackendToken`), which is safe because headers are built synchronously, but threading the token explicitly through `api/` would be cleaner (Phase 1 work).
6. **x-search on nobu:** the server's Chromium (CDP :9250) stopped answering during this session on a host with ~170 MB free RAM; my retries had spawned duplicates, which I killed, but the original 16-h-old instance is still unresponsive. The second post's data used for `x-posts-ui-takeaways.md` came from the successful fetch earlier in the session (`post2.json`), and the review is in `x-post-analysis.md` §5.
7. **Out of scope, unchanged:** the pre-existing `lib/clinicTables.ts` typing error and the `any`s in `api/`; `/privacy` is placeholder copy; Meal plan / Groceries destinations are intentionally absent from the nav until Phase 3.
