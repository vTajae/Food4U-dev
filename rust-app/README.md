# Food4U Rust / Topcoat app — auth, APIs and Ask

The Rust app serves Food4U's public authentication, privacy and JSON API surfaces.
Dashboard serves the signed-in Ask screen; welcome remains a protected
**not-yet-migrated placeholder**. This
is not a complete application replacement. Backend and ClinicalTables calls are
verified against local mocks, never production services.

## Pinned local environment

- WSL Ubuntu-24.04 (`apples`), Linux Node22+ (verified24.15.0).
- Rust1.98.1, wasm32-unknown-unknown, rustfmt/Clippy.
- Topcoat0.9.0, topcoat-cloudflare0.2.0, worker/worker-build0.8.7.
- npm adapter0.2.0, Wrangler4.142.0, compatibility date2026-09-27.

Run npm/Cargo/Wrangler **in WSL only**: dependencies contain Linux binaries.
On `/mnt/g`, npm bin links fail with EPERM; the existing postinstall creates
regular wrappers for the pinned CLIs without modifying packages.

```sh
cd /mnt/g/WebDev/Food4U/Food4U
export PATH="$HOME/.local/bin:$HOME/.cargo/bin:$PATH"
export CARGO_TARGET_DIR="$HOME/.cargo/food4u-rust-targets/slice001"
# Dependencies already installed; for a fresh checkout: (cd rust-app && npm ci)
node contract/local-rust.mjs --fixtures --checks --contract
# Full API, token isolation and deadline proof with an owned loopback mock:
node rust-app/tests/api-mock.mjs
```

This command owns and stops its local server on8789 (inspector9238). It uses
ignored temporary configs, dummy D1/KV bindings and the **fake example keys**,
never production credentials. Existing isolated `rust-app/.wrangler/state`
must already contain the slice002 local user schema. It does not initialize or
reset databases. A new empty isolated database can be initialized from
`frontend/database/basic.sql` using Wrangler **--local** only: that SQL drops
its local user table, so never reapply it to retained state or another app.

The `--checks` files run serially to avoid shared KV snapshot races:
HTTP3, original auth13, server-validation2 and session-rotation3 checks. The unchanged contract
uses Windows Node/Chrome and the frontend's installed Playwright. Expected
result: **35 scoped pass,1 out-of-scope welcome leaf failure,6 skips**; Node reports2
failures including the failed parent and exits1. The helper exits0 only when
those exact gaps, all scoped passes and `ONRENDER_REQUESTS_OBSERVED=0` are proven.
It rejects Wrangler's stale-build fallback instead of testing old artifacts.

`--visual` retains the six auth captures/checks from slice005 (desktop/mobile),
writing new captures/comparisons under ignored `rust-app/.evidence/007-auth-visual/`.
Original committed rust-005 screenshots stay unchanged.
It checks tab keyboard/focus behavior, input error associations, raw-password
validation and disabled/blocked-JavaScript safety. A deny-only proxy blocks
external requests, including redirects; fonts are served locally. Evidence
is under ignored `contract/.evidence/007-*` and `rust-app/.evidence/007-auth-visual.json`.
Use `node contract/local-rust.mjs --fixtures` for a persistent local fixture
server; Ctrl+C stops it. Without `--fixtures`, dev has no debug routes.

## Auth and fixtures

Public login/register are Topcoat JSON-array procedures:
`POST /api/login` and `/api/register`, body `[username,password]`. They return
an empty JSON string on success or the existing validation/credential message.
Client and server check raw email and six UTF16 password units **before trim**;
raw values cross the request seam so server validation applies the same schema.
The SSR submit is disabled until enhancement initializes, and the native form
uses POST, never GET, to prevent passwords appearing in URLs when JS fails.

Registration uses UUIDv4, role2, integer Unix seconds and bcrypt cost10.
Auth retains the existing D1 fields, signed `__session` cookie, KV SessionData,
and HS256 JWT with stable public_id/30-minute expiry. Login preserves welcome
and flash state, generates a new UUID session ID on every successful login,
persists the replacement, deletes the old KV key, then issues the new cookie.
Failed logins leave the old data/cookie untouched; retired-cookie replay is rejected in the sequential and delayed-completion tests. KV operations are not a transaction: failures
propagate without issuing the replacement cookie, and an unpublished record can
remain until TTL expiry. This is not proof of global production KV consistency.
`/api/auth/logout` deletes KV and expires the cookie; `/logout`
remains an alias. Welcome editing/saving is deferred.

## Request-scoped backend seam

`src/backend.rs` loads `API_BASE_URL` and `CLINICAL_TABLES_BASE_URL` from env.
Every backend call receives the current request's optional token explicitly;
ClinicalTables calls never receive that bearer. No token is stored in global,
static or thread-local state. Redirects are manual to prevent credential forwarding.
A real 20-second abortable deadline covers both headers and the full response body.
Typed errors expose kind, known HTTP status and optional backend string `detail`;
malformed JSON and transport/timeouts remain distinct. Sanitized diagnostics log
only kind/status, never tokens, request bodies, URLs or health queries.

`/api/refs`, `/api/clinicals` and `/api/suggestion` preserve the frontend's status,
validation, mapping and intentional diet/suggestion fallback envelopes. The newer
slice006 brief explicitly requires ClinicalTables failures to return route-specific
500s instead of the old service's swallowed-null empty response. Reference data is
embedded directly from unchanged `frontend/lib/refs/allergies.json` at build time.
Workers' native form parser handles URL-encoded and multipart input after the
required authentication check; no new dependency or multipart parser is added.

The runner forces both upstream URLs to loopback (normally unreachable port9).
`tests/api-mock.mjs` owns an ephemeral127.0.0.1 mock, starts the ordinary helper,
and verifies exact paths/methods/bodies/query parameters. Two JWT identities are
independently checked before48 interleaved backend requests (24 each). Seventeen
API checks cover the installed Zod corpus, form/File semantics, success/error
mapping, redirect canary, typed errors and actual20-second header/body stalls.
Expired mock connections must be aborted. Mock evidence is
`contract/.evidence/007-api-mock.json`; `--api-tests` is only valid with owned local
mock URLs. Default Wrangler vars may name public ClinicalTables, but **tests always
override both services to loopback**. Fake `.dev.vars.example` uses port9 too.

`/_spike/*`, test `POST /register` and legacy `/me` are compiled only with
Cargo feature `debug-fixtures`, **off by default**. Fixtures additionally need
`SPIKE_DEBUG=1`; no spoofable Host-header security check remains.
`scripts/worker-build-fixtures.sh` uses the adapter's supported WORKER_BUILD_BIN
override, validates the real worker-build0.8.7 and adds the actual Cargo feature
only for `--dev`. It refuses standalone release builds. No adapter patch or
fake cfg/RUSTFLAGS is used.

## Default release and static gates

Stop any dev server before building release. From the repo root in WSL:

```sh
node contract/local-rust.mjs --release --release-proof
cd rust-app
cargo fmt --check
cargo clippy --target wasm32-unknown-unknown -- -D warnings
cargo clippy --target wasm32-unknown-unknown --features debug-fixtures -- -D warnings
```

Release proof clears build overrides, runs standalone
`npx --no-install topcoat-cloudflare build`, verifies optimized release metadata
and Wasm hash, checks debug strings absent, and serves those exact bytes with
**no build hook**. Even with `SPIKE_DEBUG=1`, all nine fixture method/routes
must404 while public login/validation remain live. Logs/results use the separate
`007-rust-release-*` prefix. This proves a local release artifact, not deployment
or production performance. No login, deploy, --remote or push is part of this task.

## Earlier spike evidence

Slices001–003 established adapter compatibility and cross-language auth.
Historical counter/browser scripts and002 screenshots remain as earlier evidence;
the counter page is no longer served. Original auth tests still require fixtures.
Local elapsed bcrypt timing is not deployed billable CPU and is not a Rust speed
claim. Exact framework pins remain unchanged; advisories are not silently upgraded.

Fonts and redistribution notices: [assets/fonts/README.md](assets/fonts/README.md).
See the cockpit receipts for validation results and known unmigrated flows.

## Signed-in shell and dashboard (slice 007)

`GET /dashboard` follows the existing page state machine: an incomplete welcome
redirects before any upstream call; an empty profile redirects only when welcome
was not completed. Real answers clear welcome and derive diet-first, category-
filtered, insertion-order deduplicated chips (maximum eight). HTTP/network/deadline
errors show an explicit account-safe alert, with HTTP status when known.

A 403 `Token has expired` refreshes once from the D1 row using the same public_id,
username, role and 30-minute JWT claims as login. The replacement is persisted
before retry. A terminal refresh failure invalidates the stale session before
returning to login so authenticated redirects cannot loop. A 403 `User not found`
ensures the profile once using POST /profile and retries. The two recoveries have
independent one-shot guards and a total of three profile attempts. No shared
current-user token is introduced.

The shell includes Ask/Profile navigation, username, POST sign-out and keyboard-
operable account/theme choices. `food4u-theme` and root `data-theme` retain the
legacy light/dark/system behavior and persistence. The Ask form supports Enter,
Shift+Enter, validation, real POST /api/suggestion, skeleton/empty/error states and
safe text-rendered food cards with ingredients/nutrient disclosures. Like the
legacy live AskScreen, it does not invent verdict or checked-against metadata.

Run the added HTTP, native Windows Chrome and visual proof with one owned local
backend (separate from the slice 006 API mock):

```sh
node rust-app/tests/dashboard-mock.mjs --fixtures --dashboard-tests --dashboard-browser --dashboard-visual
node rust-app/tests/api-mock.mjs --fixtures --api-tests
node contract/local-rust.mjs --fixtures --checks --contract
```

Evidence uses `contract/.evidence/007-rust-*`, `007-dashboard-mock.json` and
`rust-app/.evidence/007-dashboard-{browser,visual}.json`. Actual screenshots and
baseline-left/Rust-right comparisons live in `internal/sprint/screenshots/rust-007/`.
Baseline05 is failed desktop / pending mobile login, while Rust proves success;
baseline09 is a deleted component gallery, while Rust captures separate actual
cards/loading/empty states. These are explicit state differences, not pixel parity
claims. All upstreams remain loopback; deny-only Chrome proxy canaries must pass.

Dashboard updates are distinct from creating/publishing a session. After awaited
profile work, the update seam rereads the same UUID and requires the same live
auth identity before writing. It never issues a cookie. Terminal refresh failure
deletes only that request's UUID, without a late cookie-expiration header that
could erase a newer login. Three delayed-backend tests prove local logout/rotation
retirement remains intact across profile success and expired-token completion.
The KV reread/put is not an atomic compare-and-swap: revocation between the final
reread and put, cross-isolate ordering, and global KV propagation are NOT proven.
Strong distributed revocation requires a separately scoped authoritative design.
