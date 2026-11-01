# Slice 018 exploratory audit

## D019-02: intake draft stops saving after choosing a diet

**High severity; slice 019 regression; no new fixme.** The strict answer schema
rejected the real diet `{name, description}` payload. Writes silently left the
last valid cuisine-only draft behind; reloading lost the diet and later answers.
OMC production evidence at repository root:
`.cockpit/20261013-neon/evidence/019-live-debug.log` (`OMC_DEBUG_ENTRIES`) and
`019-omc-draft-diag-2.log`. Saving the in-memory profile was not the failing seam.

The hotfix strips unknown answer fields and keeps bounded optional strings:
name 512, value 128, code 64, description 8192 characters. At least one known,
defined field must remain; the serialized sanitized envelope validates. Version,
identity, question IDs/uniqueness/count and step guards remain intact. If a
state is still invalid or storage fails, the current identity's old key is
removed (best effort if storage itself blocks removal). This avoids reviving
stale or partially omitted health answers; other accounts are untouched.

Closure commit: the commit containing this entry on `fix/draft-diet-description`,
subject `fix: keep onboarding drafts saving after a diet is chosen`; full SHA
and final gate status: `.cockpit/20261013-neon/plans/019b-executor.md`.
Node RED proves the production-shaped round trip and stale-key failures;
real-Chrome RED fails after diet reload at both widths. Active D019-02 checks
reload after diet and again at review, restoring all five answers and the step.
Local evidence: `.cockpit/20261013-neon/evidence/019b-*`. Live revalidation and
deployment remain OMC-owned; this is not a new production-certification claim.

Local built Worker, deterministic fake backend, real system Chrome; desktop
1440×900 and touch/mobile 390×844. **Not a production, real-backend, Neon,
recommendation-safety or real-iPhone certification.** Google Fonts are excluded
at the test boundary, so screenshots use fallback typefaces. No product defects
were fixed in this slice.

Screenshot paths below are relative to `frontend/e2e`. Both viewport directories
contain the named image; the full evidence/archive is under repository-root
`.cockpit/20261013-neon/evidence/018-*`. Run the README's `E2E_AUDIT=1` command to
execute the known-defect regressions instead of their default `test.fixme` state.

## Reproduced defects and current status

Every row blocks **Phase 1** (trustworthy identity, intake and recommendations)
of the owner's Upgrade Plan, Strategic Maturation Roadmap:129, and PRD
`cleanup.txt.txt`:1110–1142. Track references use OMC's
`hidden-humming-bunny.md`. Six IDs remain fixmes after slice 019: D018-02, D018-03, D018-07, D018-09, D018-10 and D018-11. The 018 observations below are retained; closed IDs reference the slice 019 commit below. In 018,
the first eight were fixmes for both projects, and D018-11 was mobile-only
(17 skipped instances then). Now five IDs remain fixmes at both widths, plus D018-11 mobile-only: **11 skipped instances**, zero new fixmes; its desktop counterpart remains active.

| ID | Journey / viewport | Severity | Observed → expected | Screenshot in `.artifacts/tour/{desktop,mobile}/` | Suspected source |
|---|---|---|---|---|---|
| D018-02 | Intake price / both | medium | Review displays bare `12.50` → explicit currency such as `$12.50`. Seeded OMC observation reproduced. A5. | `018-currency-D018-02.png` | `components/form/questionBase.tsx:99–104`; `components/onboarding/stepper.tsx:104` |
| D018-03 | Account menu / both | high | Open menu produces axe **serious `aria-hidden-focus`** on focusable shell/header content → background content must not remain keyboard-focusable while hidden to accessibility APIs. New audit finding, related A6. | `018-account-menu.png` | `components/shell/account-menu.tsx:15–61`; `components/ui/dropdown-menu.tsx:13–30` (Radix modal/focus integration; root cause not patched) |
| D018-04 **closed, slice 019 commit below** | Dashboard Ask / both | high | Deterministic backend 503 becomes successful empty results: “No matches for that” → honest unavailable/waking state with retry. B1. | `018-suggestion-outage-D018-04.png` | `api/services/suggestionService.ts:18–23`; `app/api/suggestion/route.ts:37–38`; `components/ask/ask-screen.tsx:100–103` |
| D018-05 **closed, slice 019 commit below** | Sign out → second account intake / both | **blocker** | Account B sees account A's Italian intake selection → drafts must be scoped to identity and cleared on sign out. The same unscoped draft structure also holds health answers; the proof uses synthetic cuisine data only. A1. | `018-second-account-leak-D018-05.png` | `components/form/context.tsx:52–61`; `app/api/auth/logout/route.ts:5–7` |
| D018-06 **closed, slice 019 commit below** | Intake with corrupt saved browser state / both | high | Malformed `formState` causes a renderer exception and loses the usable intake screen → discard invalid draft/recover and show branded actionable fallback if needed. A1/A2. | `018-corrupt-storage-D018-06.png` | `components/form/context.tsx:52–56`; missing `app/error.tsx` / `app/global-error.tsx` |
| D018-07 | Profile navigation / both | high | Saved profile's Profile link opens an empty `/welcome` wizard → load saved editable profile at `/profile`. A3. | `018-profile-empty-wizard-D018-07.png` | `components/shell/nav-links.tsx:11`; `components/ask/ask-screen.tsx:90–92`; `app/(app)/welcome/page.tsx:9–20` |
| D018-09 | Intake price validation / both | medium | `not money` reaches review as a price answer → numeric currency input, range 1–100 and at most two decimals; invalid values remain at the step with useful validation. A5. | `018-invalid-price-D018-09.png` | `components/form/questionBase.tsx:52–60,72–80`; `api/schemas/welcome.ts:32–41` |
| D018-10 | Signup continuation / both | medium | Successful signup leaves the visitor at the login form → authenticated intake/dashboard continuation. A4. | `018-signup-second-login-D018-10.png` | `app/(auth)/login/actions.ts:36–44`; `components/login/auth-tabs.tsx:33–35` |
| D018-11 | Dashboard loading / mobile | high | While asking, every suggestion chip is disabled and the horizontally overflowing Suggestions list fails axe **serious `scrollable-region-focusable`** → the scrollable region must remain keyboard accessible (or no longer expose unusable overflow). New A6/B4 audit finding. Desktop has no horizontal overflow and remains an active passing check. | `018-suggestion-loading-D018-11.png` (mobile); desktop active counterpart captured too | `components/ask/ask-screen.tsx:63–76` |

Fixmes preserve the intended assertions. They do not blanket-disable axe rules,
console errors or failed requests. The positive auth flow still covers the
current two-stage registration contract; A4 must update that helper alongside
the signup product change. The account-menu screenshot in the positive tour
is capture-only; its known-failing accessibility assertion is D018-03.

## Seed D018-01: review progress observation

OMC previously saw approximately 75% fill. The code computes `aria-valuenow=100`
at review (`components/onboarding/stepper.tsx:35–38,77–82`). The initial fast
desktop screenshot also caught an intermediate animation width. Settled
screenshots disable finite animations and the suite asserts the accessible
100% value. See `018-review.png` in both tour viewport directories. Treat this
as a **transient/seed observation, not a confirmed persistent defect or fixme**;
do not patch the correct progress calculation based on the early capture alone.

## Cross-check against the owner plan and OMC A/B audit

Owner sources: `G:/WebDev/Food4U/docs/{Idea.txt, cleanup.txt.txt,
New Text Document.txt, roadmap.md.txt, Food4U Webapp Upgrade Plan.md}`;
visual contract: `frontend/DESIGN.md`:408–429,466–500. The Upgrade Plan
Strategic Maturation Roadmap:129–132 maps Phase 1 to A1–A7/B1–B4,
Phase 2 to B5 and Phase 3/4 to meal planning/groceries/provider handoff.

| Track | Coverage or explicit boundary |
|---|---|
| A1 shared-device draft / parse | D018-05 and D018-06 reproduce the UI failures. Logout status/CAS/session-security properties are not certified by these UI checks. |
| A2 branded error pages | Corrupt-draft failure captured by D018-06. Privacy and branded 404 are toured; no invented crash-recovery acceptance. |
| A3 real profile and account management | D018-07; password change/deletion are absent from the inspected app route surface, not simulated by this harness. |
| A4 auth friction/security | D018-10, plus current register/duplicate/login/logout/validation coverage. Source inspection retains distinct “User does not exist” and “Incorrect password” messages (`api/services/userService.ts:67–74`), trimmed passwords/no lowercase email (`app/(auth)/login/actions.ts:11–12`), and no show-password control (`components/login/auth-form.tsx:116–130`). These are **plan/source gaps**, not newly reproduced security claims or additional fixmes. |
| A5 currency/validation | D018-02/D018-09. Empty-after-edit and decimal/range edges are future A5 acceptance, not claimed tested here. |
| A6 production polish | D018-03 and mobile loading D018-11 are new. Remote font link remains at `app/layout.tsx:30–34` and is explicitly stubbed offline. No explicit Skip or question-heading focus management is present (`components/onboarding/stepper.tsx:85,124–140`); headless Chrome cannot prove actual iPhone keyboard/safe-area behavior. Existing typecheck error remains in `lib/clinicTables.ts:1`. Caching, state mutation and dependency cleanup are source-level follow-ups, not product changes in 018. |
| A7 optional goals/shopping/weekly budget | The five-step tour confirms the current intake surface; optional new blocks/chat intake are missing planned capability (Phase 1), not fabricated UI or backend coverage. |
| B1 honest service failures | D018-04 reproduces the 503-to-empty-results defect; waking dashboard/save copy is separately covered. No claim about current production API keys. |
| B2 rules engine / B3 recipes | Outside the fake-backend seam. Allergy vetoes, USDA/Spoonacular behavior, provider keys, backend authentication and caching remain unverified by this slice. No real external clinical/AI/recipe requests run. |
| B4 three cards and meaningful filtering | Default fake suggestions are unavailable. This suite does not invent meals, safety verdicts/reasons, card acceptance or evidence that typed questions filter real recipes. DESIGN:473 expressly prohibits fabricated verdicts. |
| B5 personalized feedback | Phase 2; not exercised or invented. Meal plan, grocery list and provider/cart approval are later Phase 3/4 and outside 018. |

## Historical safety-gate blockers (resolved by Addendum 2; not product fixmes)

The original single authorized `node contract/local-next.mjs` invocation failed its
**redirect-denial canary**: Chrome 155.0.8059.80 with Playwright/core 1.64.1
reached the redirected local destination **2 times**, where zero is required.
Evidence: `.cockpit/20261013-neon/evidence/018-contract.log` and
`.cockpit/20261013-neon/evidence/018-contract-next-contract.log`. Owner restoration matched and Render
requests were 0, but neither fact satisfies redirect isolation. This was not a
transient ECONNRESET/“Network connection lost” failure; those strings in the
embedded unit-test output are deliberate fixtures, not the canary failure.

At that stop, no retry, assertion weakening, contract edit, push, deployment or
commit was performed. OMC subsequently scoped the proxy repair and renewed gate
authority below. A green default e2e run with the listed fixmes is not a
substitute for the mandatory contract gate.

An intermittent same-origin `/welcome?_rsc=...` `net::ERR_ABORTED` was also
observed during login-to-intake (including the waking-save tour). The trace
contains HTTP 200 headers, but successful supersession/body completion has not
been established. It remains **fatal**, not a blanket cancellation exception or
a manufactured product fixme. The executor handoff identifies the final strict
run's actual result separately from the earlier discovery runs. This historical
blocker is superseded by slice 019 Addendum 1 and D019-01 below.

### Addendum 1 update

The authorized literal `<-loopback>` append was applied to proxy bypass lists.
The single renewed full contract attempt now fails **earlier**: the explicitly
allowed `localhost` canary source returns 403 instead of 200. No nontransient
retry or commit was made. The canary assertions are unchanged.

A separate owned-loopback-only ordering probe proves that putting the marker
**before** explicit hosts (`<-loopback>,localhost`) allows the source (200),
blocks redirected navigation/fetch, and yields destination requests 0. Merely
appending it gives source 403 and is not successful isolation proof. See
`.cockpit/20261013-neon/evidence/018-a1-bypass-order.json` and the appended
Addendum 1 handoff. The new actual-proxy string regression has genuine
missing-marker RED evidence. That attempt stopped BLOCKED pending corrected
ordering scope and renewed full-gate authority; its earlier green e2e results
were not claimed as post-addendum validation.

### Addendum 2 — resolved

OMC authorized marker-first ordering in every browser/context bypass list,
including legacy launchers sharing the upgraded core. Before the correction,
the strengthened string and behavioural self-tests both failed: the marker was
last, and the allowed source returned 403. After correction, the unchanged
legacy contract passed on its **one authorized invocation, no retry**:
allowed source 200, redirected navigation 403, destination requests 0, Render 0.
The two-viewport regression also verifies redirected fetch rejection and zero
destination requests after first proving the destination itself is reachable.

Fresh default suite: **29 passed, 17 listed fixmes, no failures/flaky/retries**.
Frontend tests 92/92, root tests 9/9 and build pass. Owner hashes are unchanged,
private Worker state is removed, and Neon lists only `production` (metadata
only; no production smoke, test data, push or deployment). Evidence:
`.cockpit/20261013-neon/evidence/018-a2-{contract,e2e}.log` and associated JSON
receipts. Product defects above remain unfixed by design. Full frontend lint
still reports five existing errors in `api/repo/userRepository.ts`,
`api/services/clinicalService.ts` and `lib/clinicTables.ts`; typecheck still
reports the existing undefined `AutocompleteResult` in `lib/clinicTables.ts`.
Those product files are unchanged; all new harness files pass targeted lint.

## Slice 019 closure commit

D018-04, D018-05 and D018-06 are closed by the commit containing this document,
on `fix/trust-basics`, with the exact subject
`fix: isolate onboarding drafts per account, add error pages, explain unavailable meal ideas`.
The full SHA is recorded in `.cockpit/20261013-neon/plans/019-executor.md`.
Product closure commit: `8a58fb16658c20fb4190d23ee197ec66d49fd589`.
Addendum 2's test-only follow-up has subject
`test: settle tolerated RSC aborts at the first gate; wait for hydration in identity-switch test`;
its SHA and renewed gate result are recorded in that same receipt.

Historical Addendum 1 executor full E2E: **71 passed, 11 existing fixmes, zero failures or
retries**, one full invocation. All 22 trust/error/identity cases pass at both
widths. Four tolerated RSC annotations: **two application events, two guard
controls**; all other failures stay fatal. Frontend tests 129/129, root tests
9/9 and build pass. The original single passing contract invocation stands;
it was **not rerun**. Owner hashes remain unchanged, only `production` exists
in Neon (metadata only), no push/deploy. D019-01 remains tracked, not fixed.
Full artifacts: `.cockpit/20261013-neon/evidence/019-a1-*`.
OMC's independent validation then found two teardown false positives from
the original rule and one identity-switch hydration timeout (68 passed,
3 failed, 11 fixmes; `019-omc-e2e.log`). Addendum 2 corrects only the observer
settlement policy and test hydration readiness; product sources and identity
privacy assertions are unchanged. See `019-a2-*` evidence and the current receipt.
Renewed Addendum 2 full suite: **73 passed, 11 existing fixmes, zero failures or
retries**, exactly one invocation. Five tolerated events: **one application,
four controls**. All 38 guard tests pass; control (f) failed at both widths
before the correction. Product source hashes match the prior passing build,
owner hashes are unchanged, only `production` exists in Neon (metadata only),
and the original contract invocation was not rerun. No push or deployment.

## Slice 019 implementation — initial acceptance blocker (superseded)

D018-04, D018-05 and D018-06 have implemented fixes and active regressions, but are **not receipt-closed or committed**. The planned single local commit is
`fix: isolate onboarding drafts per account, add error pages, explain unavailable meal ideas`
on `fix/trust-basics`. No commit was made because the mandatory strict E2E gate still fails on the pre-existing `/welcome?_rsc=...` `net::ERR_ABORTED`. Fresh evidence and the blocker handoff are in
`.cockpit/20261013-neon/plans/019-executor.md`.

- **D018-05 / A1:** versioned opaque-identity draft keys and owner envelopes;
  another identity never hydrates the draft, legacy `formState` is discarded,
  and the client sign-out action clears only the current draft. Logout uses 303.
- **D018-06 / A1:** guarded JSON and runtime shape/version validation discard
  corrupt/old state. The provider renders the safe first step on first paint.
- **A2:** branded app/global error recovery, reset plus home escape, and 404
  links selected from the session. The fault route exists only in a private
  test build, never in the production source/build.
- **D018-04 / B1:** unavailable configuration, waking, rate limits and generic
  failures are distinct from actual empty results. Only retryable errors have
  Retry; an expired backend token is refreshed once without cross-request state.

The original observations/screenshots above remain historical RED evidence,
not claims that the fixed behavior is still broken. Six other IDs remain open
and out of scope. Tests use a deterministic local backend and private D1/KV;
this is not production, real Neon, provider or medical-safety certification.
The RSC cancellation remains fatal and is not a new fixme or an allowed error.
Two fresh full-suite runs reproduced it. HTTP 200 headers and a separate
successful prefetch do not prove completion of the aborted live navigation.
OMC must scope the next diagnosis before acceptance/commit. **Historical stop:**
OMC subsequently provided that diagnosis and renewed authority in slice 019
Addendum 1; the exact rule below supersedes the fatal-only RSC policy.

## D019-01: framework RSC stream cancellation

**Low severity; framework; vinext 1.1.0–1.2.1; not user-visible.** No new fixme.
OMC's instrumented desktop register/login captures record no JavaScript abort,
stream cancel or reader cancel. The live `/welcome?_rsc=...` navigation receives
200 component headers, fails with `net::ERR_ABORTED`, and commits `/welcome`
with the correct intake page. Forced GC increases incidence; delaying prefetch
does not fix it. The 018 base has the same signature. Navigation code in vinext
1.2.1 is byte-identical, so no upgrade is claimed or performed.

Evidence at repository root: `.cockpit/20261013-neon/evidence/019-omc-abort-{diag,diag2,gc,delay}.{jsonl,log}`;
instrumentation: `.cockpit/20261013-neon/tools/019-omc-abort-diag.spec.ts`;
authority: `.cockpit/20261013-neon/plans/019-brief.md`, Addenda 1–2 (Addendum 2
supersedes the original rule 4).

Only GET + `rsc: 1` + **absent** `next-router-prefetch`, exact `net::ERR_ABORTED`,
and an earlier **exact-URL** 200 response with content-type starting with
`text/x-component` can be candidates. At the **first check after failure**
(teardown if no check intervenes), the candidate is tolerated only if the main
frame was on, or committed to, its pathname at or after the failure (observed via
`framenavigated`, including same-document history updates); it is annotated once
and never re-evaluated after later navigation. Otherwise it is fatal. 019b
correction: the identity-switch journey commits `/welcome` during login and then
opens a private page before any gate check, which the earlier "pathname at the
first check" rule wrongly failed. Controls (g) "target committed then left before
any check" (RED before the fix) and (h) "target visited only before the abort"
(stays fatal) cover it. Every tolerated event is annotated `tolerated-rsc-abort` with URL and
timestamps, and counted in `e2e/.artifacts/019-rsc-aborts.json` (guard controls
and application events separately). All other errors remain fatal. Real-browser
negative/positive controls and renewed full-suite results are recorded under
`.cockpit/20261013-neon/evidence/019-a{1,2}-*` and the executor receipt. Addendum 2
control (f) proves a settled abort survives a later navigation/check; the
first-check mismatch negative (c) and all other fatal negatives remain active.
