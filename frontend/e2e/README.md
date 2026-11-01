# Real-Chrome end-to-end gate

## Slice 019 status

**Current Addendum 2 gate:** 73 passed, 11 existing fixmes, zero failures or
retries, one full invocation. Five tolerated RSC annotations: one application
event and four deliberate controls. All 38 guard self-tests pass at both widths;
control (f) had genuine RED at both widths before the settlement correction.
No product source changes or contract rerun; owner hashes remain unchanged.

Trust fixes and active D018-04/05/06 regressions are implemented. OMC Addenda 1–2
supersede the earlier BLOCKED receipt: instrumented evidence identifies
the GC-sensitive vinext stream cancellation as framework issue D019-01. Only
the exact self-tested rule below is tolerated; no blanket cancellation ignore,
new fixme, dependency upgrade or retry masking is added. Six other defect IDs
remain fixmes (11 viewport instances). The current gate/commit receipt is
`.cockpit/20261013-neon/plans/019-executor.md` at the repository root.

Historical Addendum 1 executor gate: **71 passed, 11 existing fixmes, zero failures or retries**,
one authorized full invocation. Four tolerated annotations: **two application
events and two deliberate controls**. Frontend tests 129/129, root tests 9/9
and build pass; the original single passing contract was not rerun. D018-04,
D018-05 and D018-06 close in the slice 019 commit named in internal/e2e/DEFECTS.md.
OMC's subsequent independent run found the old every-gate rule re-flagged
settled aborts after sign-out, plus a private-page hydration race. Addendum 2
settles each abort once at its first subsequent check and waits for networkidle
before the identity-switch test interacts; its first-committed-DOM assertions
are unchanged. The renewed Addendum 2 result is in the current receipt.

The isolated build also injects private-only error-boundary and identity-switch
pages. They are absent from product sources and normal builds, with separate
source hashes. The identity switch records the first committed DOM before
passive effects, so a transient stale-child-state leak cannot pass.

Expected native HTTP console statuses are opt-in per test and paired with an
observed exact response URL/status. The intentional private error test permits
only its exact fault marker, then one same-script React component-stack
companion; unrelated errors remain fatal. Error reset and session-aware 404
links are exercised at both widths. See the full receipt/blocker in
`.cockpit/20261013-neon/plans/019-executor.md`.

## Historical slice 018 acceptance

**Addendum 2 verified:** `<-loopback>` comes **first** in every proxy bypass
list, before explicit hosts. The renewed legacy contract passes unchanged;
both viewport regressions load the allowed source (200), reject redirected
navigation (403) and fetch, and prove zero destination requests. Default e2e:
29 passed, 17 documented fixmes, no failures or retries. Full handoff/evidence:
`.cockpit/20261013-neon/plans/018-executor.md` at the repository root.

From the repository root or `frontend`, run `npm run e2e`. Node >=22, installed
dependencies, system Google Chrome and Playwright's **FFmpeg** are prerequisites:
`cd frontend; npm ci; npx playwright install ffmpeg`. No bundled browser, paid
service, deployment, production database or real AI provider is needed.

Every default run builds a fresh, byte-identical snapshot of current product
sources in an owned OS temporary directory. Only its public Wrangler bindings
are replaced with synthetic local values. The ordinary `frontend/dist` and
`.wrangler/deploy/config.json` are not changed. The built JS is not patched.
Wrangler runs that Worker with a fresh local D1, KV, synthetic accounts and a
deterministic fake backend. Dependencies are linked, not copied. Source hashes
are checked against both snapshot and checkout after building.

## Commands

```powershell
npm run e2e
npm run e2e -- --project mobile
# From frontend:
npx playwright show-report
npx playwright show-trace test-results/<failed-test>/trace.zip

# Deliberate RED: five original + nine RSC negatives fail; clean controls pass.
$env:E2E_GUARD_RED='1'; npm run e2e -- guard-self --project desktop
Remove-Item Env:E2E_GUARD_RED

# Reproduce all listed fixmes (expected to fail until product fixes land).
$env:E2E_AUDIT='1'; npm run e2e -- --grep D018-
Remove-Item Env:E2E_AUDIT

# Explicitly opt-in only: read-only real production smoke. NOT run by default.
$env:E2E_PROD='1'; npm run e2e -- --project prod-smoke
Remove-Item Env:E2E_PROD
```

Both default projects use installed Chrome: desktop 1440×900 and touch/mobile
390×844. Retries are disabled. Failed tests retain trace, screenshot and video;
successful screenshots form a tour. The HTML/JSON reports, tour, source/build
receipt, runtime log, egress/owner-hash receipt and cleanup receipt are ignored
under `playwright-report`, `test-results` and `e2e/.artifacts`.
`e2e/.artifacts/019-rsc-aborts.json` counts all `tolerated-rsc-abort` annotations,
separating deliberate guard controls from application events, with per-event
URL/timestamps, project, test, status and retry number. JSON/HTML test reports
also retain the annotations. Counts are observations, not a retry allowance.

## Safety and gate semantics

- Setup/teardown hashes owner `.dev.vars`, `.env.local`, `.neon` as streams only;
  it never parses, copies, loads or modifies them. The temporary source snapshot
  excludes dotfiles and tooling/test/output folders. The ordinary explicit
  `npm run build` and legacy contract gate remain separate existing commands.
- The Worker outbound service permits **only the exact owned fake origin**;
  fetch redirects use `redirect: 'error'`. External and redirect deny canaries
  run before any app traffic. Teardown asserts exact egress and Render count 0.
- Chrome uses a deny-only proxy and context routing. The subtractive
  `<-loopback>` marker must precede explicit host bypasses: removing it leaks
  redirected loopback traffic; appending it blocks even the allowed source.
  String and positive-source/negative-redirect self-tests protect this order.
  The exact Google Fonts
  stylesheet is fulfilled with empty CSS to avoid any remote font call. Tour
  images therefore use system fallback fonts; typography is not certified.
  Self-hosting fonts remains Track A6. No app JS, HTML or first-party response
  is stubbed. Clinical browsing uses the real bundled lists, not live NLM search.
- Each named state and final page is checked for console errors, page errors,
  failed same-origin requests, Render attempts, serious/critical axe violations
  across WCAG 2.0/2.1 A/AA tags, and the brief's ICD regex on visible intake,
  review and dashboard text. Axe violations and incomplete results are attached
  for review; passing automation is not a WCAG or medical-safety certification.
- **Narrowly reasoned console exception:** Chrome's exact native 404 message
  for the exact intentional `/this-page-does-not-exist-018` document URL. That
  journey separately asserts HTTP 404. No other console or accessibility
  messages are allow-listed.
- Same-origin request failures remain fatal **except D019-01**, authorized by
  OMC slice 019 Addenda 1–2. ALL conditions must hold: GET; request `rsc: 1`;
  no `next-router-prefetch` header (even an empty header disqualifies); exact
  `failure().errorText === 'net::ERR_ABORTED'`; an **earlier observed exact-URL**
  response with status 200 and content-type starting with `text/x-component`;
  and the main frame was on, or later committed to, the failed request's
  pathname before the **first gate check after failure** (or teardown if no
  check intervenes). Commits are observed through `framenavigated`, which also
  fires for same-document history updates. A match permanently settles the
  candidate as tolerated; it is never re-evaluated after later navigation.
  No commit by that first check is permanently fatal, as is a target visited
  only before the abort. Closed/blank pages cannot skip settlement of an
  outstanding candidate at teardown (019b correction: a journey may legitimately
  leave the committed page before its next gate check).
  Each tolerated event gets one `tolerated-rsc-abort` annotation containing
  URL, response/failure/first-matching-gate timestamps. Everything else remains
  fatal. Real-Chrome RED-style controls reject missing prior 200, prefetch,
  different pathname, non-RSC, different error, POST, wrong type/status or
  different exact URL. The positive controls commit after failure and prove
  that a settled abort stays tolerated after navigation to a different page,
  with exactly one annotation. See [D019-01](../../internal/e2e/DEFECTS.md#d019-01-framework-rsc-stream-cancellation).
- Known defects are `test.fixme` annotations with IDs in [DEFECTS.md](../../internal/e2e/DEFECTS.md),
  not weakened gates or product fixes. The account-menu capture is audit-only;
  its failing accessibility check is separately retained as D018-03. The outage
  capture is not acceptance of its copy; D018-04 asserts the intended behavior.
- Fake profiles are keyed by synthetic JWT identity. Normal users exercise
  missing-profile ensure, all five steps, save and reload persistence. Seeded
  `dashboard-*`, `waking-*` and `save-waking-*` identities provide deterministic
  states; suggestions return 503 by default. This is not real backend/Neon proof.
- Production config is created **only** with `E2E_PROD=1`; it replaces the local
  project list with `prod-smoke`. Non-GET/HEAD requests are aborted before dispatch.
  It visits only `/`, `/login`, `/privacy`, with fresh unauthenticated contexts.
  App-generated read-only wake GETs may occur. No signup or credentials are used.

Playwright test/core are pinned together at 1.64.1. The initially attempted
1.49.1 conflicted with Next's >=1.51.1 optional peer, and 1.51.1 carried
[GHSA-7mvr-c777-76hp](https://github.com/advisories/GHSA-7mvr-c777-76hp).
Axe's Playwright integration is pinned at 4.10.2. API references:
[global lifecycle](https://playwright.dev/docs/test-global-setup-teardown),
[Chrome channel](https://playwright.dev/docs/browsers),
[accessibility](https://playwright.dev/docs/accessibility-testing).
