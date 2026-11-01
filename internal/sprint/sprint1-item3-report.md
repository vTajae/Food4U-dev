# Sprint 1: credential logging, local dev config, and backlog item 3 (shadcn/ui), report

_2026-10-10 · `G:\WebDev\Food4U\Food4U` · branch `sprint1-ui-foundation` · 17 commits (`d8963ff`…`5a3129b`), not pushed, no PR_

## What changed

### (1) Credential logging (`d8963ff`)
- `api/services/userService.ts`: removed `console.log(userData, "userData")` in `registerUser` (logged the **plaintext password**). Also removed `console.log(user, "user")` in `refreshUser` (logged the D1 row including the **bcrypt `user_password` hash**).
- Audited every active `console.*` in `api/`, `app/` and `functions/`. The rest log errors, status codes, URLs (no tokens in them), `userId`, or non-sensitive API data. `baseService` adds the JWT only to request headers and never logs headers. Some commented-out `//console.log(...)` lines mention passwords (e.g. `_auth.login.tsx`); they are inactive and were left alone.

### (2) Local dev config (`1cdedba`)
- New `frontend/wrangler.toml.example`: the KV/D1 binding names plus **dev-only placeholder** secrets, with comments saying production values live in the Cloudflare Pages project. `wrangler.toml` stays gitignored.
- `frontend/README.md` gains a "Local development" section (`cp wrangler.toml.example wrangler.toml` → `npm run d1:local-initialize` → `npm run dev`, plus a note that login needs a backend sharing `JWT_SECRET_KEY`). The root README frontend steps gain the `cp` line.

### (3) shadcn/ui (item 3)

**Foundation (`56d588a`, `c4d24a5`, `b020432`)**
- `components.json` (new-york, Tailwind 4, `~/` aliases) and `app/lib/utils.ts` (`cn`).
- `app/components/ui/`: button, input, label, form, dialog, tabs, popover, command, badge, card, skeleton, sonner. Sources were taken from the **shadcn 4.21.4 registry** (`shadcn view`) instead of `shadcn add`, so the CLI couldn't install unpinned `zod`/`@hookform/resolvers` (zod 3.23 / resolvers 3.9 / RHF 7.53 unchanged). Then:
  - converted to `React.forwardRef`: the registry targets React 19, and on React 18 refs to function components are dropped, which breaks Radix `asChild` triggers and react-hook-form focus-on-error (verified working below);
  - restyled with DESIGN.md tokens: aubergine primary, 48px controls / 44px targets, `--rounded-*` radii, a 2px focus outline at 2px offset, avoid-red errors with an icon, ink toasts, the overlay shadow;
  - Sonner without `next-themes`.
- `app/tailwind.css`: `@import 'tw-animate-css'`, `--shadow-overlay`, shadcn semantic names (`--color-foreground`, `-card`, `-popover`, `-muted`, `-accent`, `-border`, `-input`, `-ring`, `-destructive`, …) as `@theme inline` **aliases of the DESIGN.md tokens**, so future `shadcn add` components render on-brand and follow the dark swap. Data-slot parts get no animation under `prefers-reduced-motion`. Compiled CSS for every existing utility is unchanged (diffed).
- `app/root.tsx`: mounts `<Toaster/>`; **pins `<html data-theme="light">`** until item 5 restyles the legacy screens, otherwise OS dark mode would darken only the migrated components.
- **Radii:** left as `--rounded-*` variables and **not** moved into `@theme --radius-*`. Legacy classes still use the default names: `rounded-lg` in `_auth.welcome.tsx`, `form/index.tsx` step buttons, `ActionButton`, and the `.input-field`/`.btn-primary` `@apply` rules.
- `.eslintrc.cjs`: `react/prop-types` off for `.ts/.tsx` only. It reported 33 false positives on typed `forwardRef` components; TypeScript already checks props.
- `tailwind-merge` taught the 11 `text-*` type levels, `font-display/body/data` and `shadow-overlay` (`b020432`). Without this, `cn()` dropped e.g. `text-label-sm` whenever `text-ink` followed, so labels lost size and weight. Caught in the screenshots.

**Migrations** (one commit each; behavior kept)

| Piece | Commit | Now | Keyboard / a11y |
|---|---|---|---|
| `form/modal.tsx` | `09dc22c`, `6785b29` | Dialog, same props, "No" secondary left / "Yes" primary right | focus trap; Esc/outside = No; focus returns to the opener (it has no trigger, so this is done manually) |
| `_auth.login.tsx` toggle | `7795275` | Tabs (same `isRegister` state, inactive form unmounted) | role=tab, arrow keys |
| `loginForm` / `registerForm` | `b684e04`, `780bc3e` | shadcn Form (same zod schema, fetch submit, redirect) | labels tied to inputs; errors via `aria-describedby`/`aria-invalid` + icon; focus moves to the first invalid field; `autocomplete` hints |
| dashboard `SearchBar` | `a733446` | shadcn Form + primary Button (no hover scale) | sr-only label "Ask about food" |
| `refSearchwButton` + `questionBase` | `db12ad5`, `5a3129b` | Command+Popover multi-select combobox; selected answers as constraint Badges | trigger role=combobox labelled by the question; Enter opens with focus in the search; arrows/Enter toggle; Esc closes and returns focus; checked rows announce "(selected)"; 44px "Remove …" buttons |
| result cards (`display.tsx`) | `db7e945` | Card; ingredients as neutral Badges; nutrient table with `th scope`, tabular amounts | toggles are Buttons with `aria-expanded`/`aria-controls` |
| dashboard spinner | `c357dbd` | 3 Skeleton cards + `role="status"` "Loading results..." | pulse off under reduced motion |
| fetcher messages | `a8fac09`, `0da3a77` | Sonner toasts: dashboard `SearchResult` (errors / message list / "Results updated"), welcome submit error, refs `message` | polite live region, 5s, pause on hover |

**Deliberate behavior changes (small, called out):**
- The result-card title was a focusable `<button>` with an empty click handler; it is now a plain heading.
- The combobox shows "No matches. Try a different word." instead of nothing when a search returns no results.
- Login/register forms gained `method="post" action="/login"`. Before hydration, the old method-less form did a **native GET that put the password in the URL**, which I saw in a screenshot run. That path now posts to the route action, which already handles it. The hydrated path is unchanged.
- The welcome stepper buttons, `ActionButton`, the dashboard gradient and the `*-hide-after-*` result truncation are untouched (items 4–5).

## Check results (`frontend/`, HEAD `5a3129b`)

| Check | Baseline (before this batch) | Now | New failures |
|---|---|---|---|
| `npm run typecheck` | ✗ 2 errors | ✗ the same 2 | **none** |
| `npm run lint` | ✗ 8 errors | ✗ the same 8 | **none** |
| `npm run build` | ✓ | ✓ (root CSS 40.8 kB / gzip 8.1 kB) | — |
| `npm run dev` | ✓ | ✓ | — |

## Screenshots (`docs/sprint/screenshots/item3/`)

Headless Chrome, **mobile 390×844 @2x** and **desktop 1440×900**:

- `item3-01-login-*`, `item3-03-login-errors-*`, `item3-04-register-*`, `item3-05-register-errors-*`, `item3-02-login-tab-focus-desktop`, and `item3-report.json` (shots + checks).
- `preview/preview-*`: combobox open, constraint chips, expanded result cards, skeletons, dialog, toasts. These came from a **temporary `/dev-preview` route with sample data**, which was deleted afterwards and never committed, because `/welcome` and `/dashboard` aren't reachable locally (see Blocked). `preview-report.json` holds the checks.

**Keyboard/a11y checks run (all pass):** Tab reaches the tabs; ArrowLeft/Right switch Login/Register; Enter submits; the first invalid field gets focus (proves ref forwarding on React 18); errors are linked via `aria-describedby`; Enter opens the combobox with focus in the search; Escape closes it and returns focus to the trigger; chip remove buttons are labelled and ≥44×44; card disclosure works by keyboard with `aria-expanded`; the dialog opens with focus inside, and Escape closes it and returns focus to the opener. No console errors or React ref warnings on the final runs.
One check reads ✗ only as a test artifact: "mobile: toasts render 1". On a phone the first toast covers the "Message toast" button, so the second click waits until the first toast has gone. Both toasts render (see the screenshots).

## Blocked / notes
1. `/welcome` and `/dashboard` (and the live combobox search, which calls `/api/refs` behind auth) still can't be reached locally. Login depends on the Render backend, which returns 500 for local users (see `sprint1-wrangler-report.md`). The migrated pieces were verified on the temporary preview route instead.
2. Existing behavior kept on purpose: failed login/register show no error, because the forms submit with `fetch` and `useActionData` never fills. Worth fixing in item 5.
3. Vite re-optimizes dependencies the first time new imports are seen in dev (slow on G:). A run during that reload shows a one-off "Invalid hook call" from two React copies, which goes away after the reload.
