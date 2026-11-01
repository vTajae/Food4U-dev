# End-to-end gate

Real Google Chrome, driven by Playwright, against a freshly built copy of this Worker on local Wrangler with a fresh D1, KV, synthetic accounts and a deterministic fake backend. Desktop (1440×900) and touch mobile (390×844). No deployment, production database or AI provider is involved.

## Run

Prerequisites: Node 22+, `npm ci`, system Google Chrome, and `npx playwright install ffmpeg` once for video capture.

```powershell
npm run e2e                          # both projects
npm run e2e -- --project mobile
npx playwright show-report
npx playwright show-trace test-results/<failed-test>/trace.zip

# Reproduce the known defects; expected to fail until the product fixes land
$env:E2E_AUDIT='1'; npm run e2e -- --grep D018-; Remove-Item Env:E2E_AUDIT

# Prove the guards still bite: deliberate failures must fail, controls must pass
$env:E2E_GUARD_RED='1'; npm run e2e -- guard-self --project desktop; Remove-Item Env:E2E_GUARD_RED

# Opt-in, read-only smoke against production; never run by default
$env:E2E_PROD='1'; npm run e2e -- --project prod-smoke; Remove-Item Env:E2E_PROD
```

Reports, traces, screenshots and run receipts land under `playwright-report/`, `test-results/` and `e2e/.artifacts/`, all ignored.

## What a run guarantees

- The snapshot under test is byte-identical to the checkout; only the Wrangler bindings are replaced with local values. Owner files (`.dev.vars`, `.env.local`, `.neon`) are hashed before and after and never read.
- The Worker may reach only the fake backend, and redirects are errors. Chrome goes through a deny-only proxy. Teardown asserts zero requests to the real backend.
- Every named state is checked for console errors, page errors, failed same-origin requests, serious or critical axe violations (WCAG 2.0/2.1 A and AA), and raw ICD codes leaking into visible text.
- Retries are off. A failure keeps its trace, screenshot and video.

Passing automation is not a WCAG or medical-safety certification.

## Known defects

Known defects are `test.fixme` annotations carrying an id (`D018-02`, `D018-03`, `D018-07`, `D018-09`, `D018-10`, `D018-11`), each tracked as a GitHub issue. A fixme is never a weakened gate: the test still describes the intended behavior and starts failing loudly once the product is fixed, which is the cue to remove the annotation.

## The one tolerated network event

Next.js cancels an in-flight RSC stream when the user navigates before it finishes, which Chrome reports as `net::ERR_ABORTED`. The gate tolerates exactly that case: a `GET` with `rsc: 1`, not a prefetch, whose exact URL already returned `200 text/x-component`, and whose pathname the page commits to before the next gate check. Each tolerated event is annotated `tolerated-rsc-abort` in the report; everything else stays fatal. The guard self-tests cover the negatives.
