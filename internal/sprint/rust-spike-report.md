# Rust / Topcoat compatibility spike

_2026-10-13 · branch `rust-topcoat-spike` · local-only compatibility evidence, not an application rewrite or deployment._

## 1. What the slices proved

| Slice / commit | Result | Evidence |
|---|---|---|
| 001 / `7993474` | Pinned Topcoat builds and serves SSR, assets and reactive signals in local workerd | HTTP 3/3; real Chrome click, keyboard and reload checks; fmt and Clippy clean; independently rerun by OMC |
| 002 / `f45210d` | Login preserves the existing bcrypt, cookie, KV-session and JWT formats | Auth 13/13; real browser login/logout and credential errors; backend-installed PyJWT accepts a fresh Rust JWT; independently rerun by OMC |
| 003 / `ecf3de9` (benchmark code) | Optimized release Wasm and bcrypt-ts measured sequentially in local workerd | 30 samples each, excluded warmups, fresh-instance samples and loaded-Wasm hash equality; driver exits 0 |

Receipts for slices 001–003 are local, gitignored cockpit artifacts, not repository links; the implementation commit hashes are retained above. Browser evidence: [counter](screenshots/rust-spike/001-counter.png), [login](screenshots/rust-spike/002-login.png). Raw `.evidence/` files are likewise local handoff artifacts, not portable test fixtures.

Framework/toolchain pins remain Topcoat **0.9.0**, topcoat-cloudflare **0.2.0**, worker/worker-build **0.8.7**, Rust **1.98.1**, Wrangler **4.142.0**, compatibility date **2026-09-27**. The existing `frontend/`, `backend/` and `database/` remain intact; the spike uses isolated local D1/KV, dummy binding IDs and fake secrets. No production migration, deploy or push is part of this evidence.

## 2. Capability matrix

| Capability | Status | Proven boundary |
|---|---|---|
| SSR | Proven locally | Server-rendered heading and pages over HTTP |
| Assets | Proven locally | Bundled CSS and Topcoat runtime JS return 200 with expected content types |
| Signals | Proven locally | Real Chrome click/keyboard increment; reload resets counter |
| Procedures | Proven locally | Actual login form calls Topcoat's server-side login procedure |
| Cookies | Proven locally | `__session` signing, exact attributes, tamper rejection and logout clearing |
| D1 | Proven locally | Existing schema/row fields, stable public ID and integer-second timestamps in isolated local D1 |
| KV | Proven locally | Session write/read, 30-day TTL, logout deletion and replay rejection |
| bcrypt compatibility | Proven locally | bcrypt-ts cost-10 hashes verify in Rust, and Rust hashes verify in bcrypt-ts |
| Session compatibility | Proven locally | Rust cookie/KV output matches the TS algorithm and SessionData shape; TS-written sessions work in Rust `/me` |
| JWT compatibility | Proven locally | HS256, public-ID claim and ~30-minute expiry accepted by backend-installed PyJWT; not a deployed backend/profile request |
| Form validation | **Not yet proven** | Credential-error rendering is not proof of general form-validation behavior |

## 3. Password verification cost

**Local workerd, indicative, not billed CPU.** Node rows are separate reference measurements, not same-runtime comparisons. Timing covers bcrypt verification, not an entire login's D1/KV/HTTP work.

| Implementation / runtime | Samples after excluded warmup | Median ms | p95 ms | Min ms | Max ms | Fresh-instance first call ms |
|---|---:|---:|---:|---:|---:|---:|
| Rust unoptimized dev Wasm / local workerd (002) | 20 | 130 | 133 | 127 | 134 | Not measured |
| Rust optimized release Wasm / local workerd (003) | 30 | 43 | 45 | 42 | 48 | 45 |
| bcrypt-ts 5.0.3 / local workerd (003) | 30 | 53 | 72 | 50 | 80 | 83 |
| bcrypt-ts / Node 24.15.0 (002 reference) | 20 | 45.1426 | 47.2615 | 44.0193 | 47.6752 | Not measured |

Slice 002 used one excluded warmup per runtime; its raw data is `rust-app/.evidence/002-bcrypt-timing.json`. Its rows above retain the historical receipt's measurements. Its dev-Wasm/Node comparison cannot decide a production runtime or password scheme.

Slice 003 used the same cost-10 fixture on the same WSL machine: Rust first, then JavaScript, never concurrent. Each runtime excluded one warmup (Rust 47 ms; JS 67 ms), then collected 30 samples; p95 is the nearest-rank 29th sorted sample. Each then restarted Wrangler for one first-call sample without a prior HTTP readiness request. “Fresh-instance” is not an uncached-machine or deployed-edge cold-start measurement. No debugger was attached during timing.

| Release identity / raw evidence | Result |
|---|---|
| Build | `npx topcoat-cloudflare build`, optimized release profile including wasm-opt |
| Serve | Driver copies the Wrangler config without its build hook, retaining the bundled entry and using absolute main/assets paths; no adapter patch. Supported artifact/config contract: [deployment](https://github.com/kdcokenny/topcoat-cloudflare/blob/main/docs/deployment.md), [integration](https://github.com/kdcokenny/topcoat-cloudflare/blob/main/docs/integration.md). |
| Actual loaded Wasm | Inspector bytecode read **after** timing, in both first and restarted instances: **1,426,535 bytes**; SHA-256 equals release output and `build.json` metadata |
| Matching SHA-256 | `babe2228749de7d194e5bc68565ed1b31cdce1ead7a97ee84a4c25d11a183dec` |
| Raw JSON (ignored) | `rust-app/.evidence/003-rust-release.json`, `003-bcrypt-js.json`, `003-summary.json`; all PASS, run `eb7a6f6d-93de-4d78-83a9-6769d02e8b47` |

CPU-budget comparison: Free **10 ms/request**; Paid default **30,000 ms/request**, configurable up to **300,000 ms/request** ([Cloudflare limits](https://developers.cloudflare.com/workers/platform/limits/#cpu-time)). Local timers advance without I/O, unlike deployed Workers timers ([timer behavior](https://developers.cloudflare.com/workers/runtime-apis/performance/)). The release-Wasm and same-runtime JS medians are respectively **4.3×** and **5.3×** the Free budget, and below the Paid default. These local intervals do not certify billed CPU, total login cost or Free-plan viability; the JS probe runs the current library, not the entire deployed login.

## 4. Rerun and verification

Run npm, Cargo and Wrangler from **WSL Ubuntu-24.04**, not Windows; installed dependencies contain Linux binaries. Existing [spike setup instructions](../../rust-app/README.md#slice-002-local-auth-compatibility) cover the fake keys and isolated local database. Do not initialize the existing frontend database or run the legacy ALTER migration over the already-current fresh schema.

With the local dependencies and fake keys already prepared, run in WSL. Keep ports **8789, 8790, 9238 and 9239** free; stop only your owned dev instance before benchmarking.

```sh
cd /mnt/g/WebDev/Food4U/Food4U/rust-app
export PATH="$HOME/.local/bin:$HOME/.cargo/bin:$PATH"
export CARGO_TARGET_DIR="$HOME/.cargo/food4u-rust-targets/slice001"
cargo fmt --check
cargo clippy --target wasm32-unknown-unknown -- -D warnings
npx topcoat-cloudflare build
node --test bench/bcrypt-js/worker.test.mjs
node --test scripts/bench-bcrypt.test.mjs
node scripts/bench-bcrypt.mjs
```

The cancellation regression invalidates old benchmark evidence, so run it **before** the final benchmark. The driver starts/stops four owned Wrangler instances sequentially, runs the JS worker on 8790 with no bindings, writes raw JSON and fails unless both runtimes and the loaded-release identity pass. App framework pins are unchanged.

For the existing compatibility checks, start the dev server **after** benchmarking (its build hook replaces the release output):

```sh
npx wrangler dev --local --ip 127.0.0.1 --port 8789
```

In another WSL shell with the same directory and PATH, run sequentially:

```sh
SPIKE_URL=http://127.0.0.1:8789 npm run test:http
SPIKE_URL=http://127.0.0.1:8789 npm run test:auth
```

| Fresh slice-003 verification | Result |
|---|---|
| fmt / Clippy with warnings denied | Exit 0 / exit 0 |
| Standalone JS worker tests | 2/2 |
| Benchmark cancellation regression | 1/1; owned processes stop and stale results are invalidated |
| Release build / final benchmark driver | Exit 0 / exit 0; both result sets PASS |
| Existing dev HTTP / auth suites | 3/3 and 13/13, both exit 0; original dev config/build hook, then owned server stopped |

Slice-001/002 browser and PyJWT results remain historical evidence in their receipts, not new slice-003 browser/deployed-backend checks.

## 5. Known risks and limits

| Risk / limit | Meaning |
|---|---|
| Five pinned npm audit high-severity package entries | `@topcoat-cloudflare/adapter`, `miniflare`, `sharp`, `undici`, `wrangler`; not five independently confirmed exploitable application flaws. Pins were not changed to suppress the findings. |
| Debug routes must **never ship** | `SPIKE_DEBUG` is the real gate for `/_spike/*` and the registration fixture. The additional Host-based localhost check is spoofable and **not a security boundary**. Remove these fixture/probe routes before any production carry-forward. |
| Inherited user enumeration | “User does not exist.” and “Incorrect password.” preserve the current app's messages and disclose whether an account exists; compatibility is not a security endorsement. |
| Local-only acceptance | No deployed edge, real-account migration, CockroachDB profile flow or production load test was performed. Browser proof used Windows Chrome against WSL workerd. |
| Form validation remains open | Do not treat the successful auth form as proof of a complete form-validation capability. |

## 6. Owner decisions needed

| Password-CPU option | Evidence and work still needed |
|---|---|
| Keep bcrypt cost 10 on Workers Paid | Preserves the proven stored-hash compatibility. Use the release/local-workerd results above as indicative evidence; deployed total-login CPU and billing remain unverified. |
| Change the password scheme, with rehash-on-login | Requires a separate scheme/security decision, legacy-hash verification during transition, and tests for safe rehash/update behavior. No replacement scheme or migration was implemented or benchmarked here. |

**No option is selected or recommended by this spike.** It preserves the current application and data while giving the owner a bounded compatibility/performance record.

## 7. Migration status (slices 005–008)

This section updates the historical 001–003 snapshot above. The Rust web layer is
now exercised locally against isolated D1/KV and owned loopback backend/NLM-shaped
mocks; it is not a deployed migration or proof of the real profile service.

| Slice / local commit | What it proved |
|---|---|
| 005 / `46a80001ab11ae5deb785c19522d7e9100907daf` | Pantry Label authentication UI, source-compatible credential validation, and desktop/mobile browser comparisons. |
| 006 / `772652852cc7fb7ce26de4f72591ab22016ba0ad`, `07b79be3220e5ebc71a8487b743440b5b231b555` | JSON APIs, request-scoped bearer ownership, real 20-second fetch/body aborts, explicit upstream errors, and login session rotation. |
| 007 / `cc5114a3c0db1e652fa506ad61d4c590dce12f3c` | Signed-in shell/Ask, dashboard refresh/ensure/onboarding branching, profile chips, and guarded updates that do not recreate an already-retired session. |
| 008 / `b976a3be1f3831a85f7fefb5387ac7da4d855f17` | Five-step `/welcome`, source-schema validation, explicit review-preserving save failures, local mocked save/dashboard round trip, keyboard reference selection, and desktop/mobile comparisons. |

Accepted deliberate deviations: ClinicalTables failures return HTTP 500 instead
of the legacy 200-empty response; login rotates the session identifier; the backend
token is a per-request argument rather than shared static state. Neither live
Next.js Ask nor Rust invents a safety verdict: the caller passes no
`verdict`/`checkedAgainst` props ([caller](../../frontend/components/ask/ask-screen.tsx),
line 114). Rust's onboarding uses a same-origin JSON enhancement on `POST /welcome`
to avoid fetching the dashboard twice; ordinary submissions still redirect.
The unused source confirmation modal has no onboarding caller, so no new
confirmation flow is inserted. Source-compatible price input has no mandatory
numeric validation and its removable chip can display `undefined`; review uses
the actual value. Corrupt stored drafts are preserved with an explicit warning,
not silently overwritten. Mono typography still uses the documented fallback.

Current Next.js defects remain untouched: the production backend URL is hard-coded
in [baseService.ts](../../frontend/api/services/baseService.ts), line 2;
`ApiService` stores the bearer in a static field (line 26), and
[applyBackendToken](../../frontend/lib/auth.ts), lines 23–25, mutates that shared
field. Login reuses the session returned by `getSession` and commits it
([login action](../../frontend/app/(auth)/login/actions.ts), lines 54–57), while
[commitSession](../../frontend/lib/session.ts), lines 65–67, only generates an ID
when none exists: existing login sessions are not rotated. These are sourced
implementation facts, not claims of a reproduced production exploit.

The older open-validation and runtime-debug-gate notes above are historical:
005–008 now test credential/onboarding validation, and standalone default release
proof excludes all nine debug fixture routes even with `SPIKE_DEBUG=1`.
Completion evidence is the unchanged contract's **36 passing leaf checks,
0 failures, 6 skips** (Node also counts the passing parent: raw 37 passes),
retained API/dashboard suites, new welcome tests/browser, and committed
[welcome comparisons](screenshots/rust-008/). No pins, `frontend/`, `backend/`
or `database/` were changed. No real backend/NLM, deploy, remote account login or
push was used. The existing KV reread/put is not atomic CAS and does not prove
cross-isolate/global revocation ordering.
