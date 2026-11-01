# Food4U web-layer contract

Black-box acceptance tests for the web layer.
Uses Node's built-in test runner and the existing frontend `playwright-core`;
no installation or new dependencies. Tests inspect public HTTP, accessible UI,
and real response cookies, not framework transports, action IDs or payloads.

## Safe run

**Never run this against production or a local server connected to production.**
`BASE_URL` must be an HTTP(S) origin at `127.0.0.1` or `localhost`; other targets
are rejected before launching Chrome. The first prerequisite proves browser
redirect denial using two local listeners. Every browser context uses a local
deny-only proxy (no forwarding), bypassing only those two loopback hosts;
service workers are blocked. Render requests are independently observed and
fail fast, with `ONRENDER_REQUESTS_OBSERVED=0` printed on completion. API calls
disable auto-redirects and assert redirects explicitly.

The browser guard **cannot observe server-side backend requests**, so the
runner below also proves, inside the server, that `API_BASE_URL` points at an
unreachable loopback address before any browser traffic starts.

Use the safe local setup runner from the repo root (the frontend dependencies must
be installed for the platform you run on):

```sh
node contract/local-next.mjs
```

It refuses an occupied port 3001, backs up the owner's `.dev.vars`, adds the
unreachable `http://127.0.0.1:9` override, and creates a temporary Vite config.
The original config/plugins are retained. A dev-only transform narrowly
replaces the hardcoded backend constant and wraps its three fetch sites with a
loopback-origin-only guard. All app traffic returns 503 until the actual
RSC/SSR/client transform pipelines prove the local URL and absence of Render.
Only then does it run the contract command and frontend `npm test`.

Afterwards it closes only its owned Vite instance, restores `.dev.vars`
byte-for-byte, verifies the before/after SHA256, and removes the temporary
config and backup. Restoration is independent of shutdown/logging failures;
a failed restoration retains the backup path in the error. Ignored proofs and
logs live in `contract/.evidence/`. No application source/config changes are
committed. Do not concurrently edit the owner's `.dev.vars` during this run.

The local D1 database must already have the current `user` schema. Initialize
**only a new, empty local database** if needed; `basic.sql` drops the local
user table, so do not reset existing local data. Never use `--remote` or
`d1:remote-initialize`. Test registrations remain isolated local test accounts;
there is no public account-delete endpoint. Each authenticated test registers
its own unique account/context, with no test ordering dependency.

Authenticated API checks explicitly replay the real UI-issued cookie to the
same loopback origin. Playwright's HTTP cookie filtering does not share
Chromium's Secure-cookie exception for localhost; no cookie is forged.

Against an **already safely isolated** app, the portable command is:

```sh
BASE_URL=http://127.0.0.1:3001 node --test contract/
```

PowerShell equivalent:

```powershell
$env:BASE_URL='http://127.0.0.1:3001'
node --test contract/
```

`CHROME_PATH` selects an existing Chromium executable; default is installed
Windows Chrome or `/usr/bin/chromium` on Linux. `CONTRACT_TIMEOUT_MS` controls
UI waits (default 15000); use a shorter wait only for an expected gap run.
`contract/package.json` resolves the directory command to the single test
entrypoint; it declares no dependencies.

## Pinned surface

| Surface | Acceptance |
|---|---|
| Pages | Anonymous `/`, `/dashboard`, `/welcome` redirect to `/login`; authenticated `/` and `/login` redirect to `/dashboard`; public privacy headings/text/links |
| Auth UI | Named tabs, successful registration notice, duplicate/unknown/wrong-password alerts; both forms' invalid/empty email and short/empty password Zod messages with input accessibility linkage |
| Session | Real UI login lands on `/dashboard` or `/welcome`; `__session` UUID.signature, HttpOnly, Secure, SameSite=Lax, Path=/, Max-Age=2592000 |
| Logout | POST `/api/auth/logout` redirects to `/login`, cookie is removed, replay of the old cookie cannot authenticate `/dashboard` |
| Anonymous API | Refs requires query/type for 401; missing input returns 200 empty suggestions. Clinicals authenticates first. Suggestion validates required parameters before 401. Exact JSON bodies pinned |
| API validation | Authenticated clinicals enum/query/required-field 400s; authenticated suggestion unknown-action 400; no backend required. Refs has no 400 branch |
| Backend outage | Dashboard's specific alert/heading/retry link; welcome review/save failure's exact alert and retained page |

Observed Next.js page redirects and POST logout are **307**. The contract
accepts **302, 303 or 307**, never cached permanent **301/308**, while still
pinning the Location path. It does not pin framework-specific login-action
transport; it pins the user's destination.

Last recorded run: **37 passed, 0 failed, 6 skipped** (including the parent
test), Render requests **0**. Raw logs land under the ignored `contract/.evidence/`.

## Explicit skips: real backend required

All six are reported as skipped with a reason, never silently omitted:

1. Dashboard displays backend profile and meal data.
2. Welcome saves profile answers and completes onboarding.
3. Refs returns backend-backed clinical and diet suggestions.
4. Clinicals search/autocomplete returns backend suggestions.
5. Clinicals consider persists a medical code.
6. Suggestion returns generated meal/diet/recipe results.

These require separate authorization for a **non-production** backend and
isolated profile data. This suite deliberately does not enable them.

Setup references: [Vite alternate configuration](https://vite.dev/config/),
[plugin hooks](https://vite.dev/guide/api-plugin),
[environment transform pipelines](https://vite.dev/guide/api-environment-instances),
[Playwright proxy options](https://playwright.dev/docs/api/class-browser#browser-new-context-option-proxy).
