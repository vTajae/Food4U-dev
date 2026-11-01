# Data-flow diagnosis: frontend ↔ backend identity

_2026-10-11 · branch `sprint1-nextjs` · method: `diagnosing-bugs` (feedback loop first), then vertical slices with RED→GREEN tests. Companion plan for the cockpit: `data-flow-plan.md`._

## 1. Feedback loops (built before any hypothesis)

| Loop | Command | Signal |
|---|---|---|
| L1 backend auth | `backend/scripts/loop-profile.sh <user_id>`: mints an HS256 JWT with the deployed secret and GETs `/profile` + `/user/profile` | HTTP status + body per endpoint, ~2 s when the backend is warm |
| L2 app e2e | `npm run e2e:login` (frontend/scripts/e2e/login-loop.mjs) | exit 0 only if register → login lands on `/dashboard` or `/welcome`; prints the POSTs seen |
| L3 unit, backend | `backend/.venv/Scripts/python -m pytest backend/tests -q` | 5 tests at the FastAPI dependency seam, no DB (AI imports stubbed) |
| L4 unit, frontend | `cd frontend && npm test` (tsx) | identity rules + token expiry, 4 tests |

## 2. What the loops showed (evidence)

1. **Wrong secret is not the 500.** A token signed with a wrong secret → `403 "Could not validate credentials"`. The 500 seen earlier came from a cold Render instance, not the signature.
2. **The backend has no user accounts, only `profile(id)`.** `get_current_user` decodes `user_id` from the JWT, casts to `int`, and looks the row up in CockroachDB. `user_id=1` → `200` with a real profile created 2024-10-01; `user_id=99999` → `403 "User not found"`.
3. **`GET /profile` creates.** Calling it for `user_id=99999` returned `200 {"id":99999}` and from then on `/user/profile` for 99999 succeeded. (Side effect of the diagnosis: profile rows **2** and **99999** now exist in production; row 1 was only read. You chose to leave them.)
4. **The collision, demonstrated end to end (L2):** a freshly registered *local* user got D1 `user_id=1`, the frontend signed a JWT for `user_id=1`, and the backend served **production profile #1's data** to it. Every environment's D1 starts at 1.
5. **Tokens never expired.** `Auth.generateToken` computed `exp = Date.now()/30 + 1800` → ≈1835 years ahead (L4 RED: "exp is 57931286741s from now").
6. **Failures were indistinguishable.** `ApiService.get()` swallowed errors into `[]`, `getSingle()` into `undefined`; the dashboard treated any failure as "no profile" and sent users to onboarding.
7. **Login depended on the backend being awake** (`loginUser` called `GET /profile`), and a sleeping instance could hang the request indefinitely (L2 RED at 180 s once the call was merely "best effort" but still awaited).
8. **Backend dead/unsafe paths:** `POST /login` calls `service.login_user`, which does not exist; `GET /refresh` uses a cookie the frontend never sets; `get_current_user_id` had a hardcoded `user_id = "68493456457656"`; every bearer token was `print`ed.
9. **Deploy-time coupling:** importing `user_routes` imports the Gemini/LlamaIndex/Qdrant stack via `food4u_dep` → `suggestion_service` → `ai_repo`, and those configs raise at import without API keys. Tests stub it; the plan's slice 7 fixes the locality.

## 3. Ranked hypotheses → outcome
| # | Hypothesis | Prediction | Result |
|---|---|---|---|
| 1 | Identity collides because the JWT carries D1's integer PK | a local user id that exists in prod resolves to the prod profile | **Confirmed (L2)** |
| 2 | The 500 is a shared-secret mismatch | wrong secret → 500 | Refuted (→ 403) |
| 3 | The 500 is a cold start / DB wake-up | repeat after warm-up → 200 | Confirmed (L1) |
| 4 | Login fails when the backend sleeps even though D1 auth succeeded | remove the backend call from login → login green while backend asleep | Confirmed (L2) |

## 4. Decision (yours): stable public id
Keep accounts in D1; add a `public_id` (UUID at registration, `legacy-<id>` backfill for existing rows on **both** sides so no data transfer is needed) and key the backend's `profile.public_id` on it. The backend accepts an integer claim as `legacy-<n>` during rollout.

## 5. What landed (4 commits, verified)
- `508f2c4` backend: `profile.public_id`, auth by public id, `POST /profile`, no token logging, dead dep removed, migration SQL, **5 tests**.
- `fff54bb` frontend: expiry fix, `npm test` via tsx, **expiry test**.
- `4ba390c` frontend: `user.public_id` + D1 migration, token carries it, login is D1-only, `ApiError`, 20 s fetch timeout, `ensureProfile`, **3 identity tests**.
- `63d655f` frontend: dashboard handles expired / missing-profile / unavailable explicitly; `BackendUnavailable` state.

Checks on HEAD: backend pytest 5/5; frontend `npm test` 4/4; `tsc` 1 error (pre-existing `lib/clinicTables.ts`); lint 5 errors (all pre-existing `any`/unused); `npm run build` ✓; L2 → `/dashboard` in 30 s (new users then go to `/welcome`; the dashboard's backend path cannot be e2e-verified until the backend is deployed, because the live backend still casts the UUID claim to `int` → 500).

## 6. Still open (owner-gated or needs the deploy) → `data-flow-plan.md`
Migrations on CockroachDB and remote D1; backend deploy; Worker deploy; e2e against the deployed pair; removal of the deprecated `GET /profile` and the dead auth routes; AI-import locality.

## 7. Close of the run (2026-10-11) and the owner runbook
OMX executed slices 4, 6 and 7 (`d00d0f9`, `e1e5f80`, `e8aac05`). Claude took over for the last code slice, the slice 5 prep (`15c8472`): every hit on the deprecated `GET /profile` now logs one WARNING with the public id and user agent, never the token. Checks on HEAD: backend pytest **11 passed** with no AI packages installed; frontend `npm test` 4/4. **No code slices are left.** The remaining steps touch production, so the owner runs them, in this order:

1. **CockroachDB migration** (before the backend deploy, because the new code reads `profile.public_id`): run `backend/migrations/0001_profile_public_id.sql`. Check: `SELECT count(*) FROM profile WHERE public_id IS NULL` returns 0.
2. **Render deploy** of `backend/` from this branch. Set `USER_JWT_SECRET_KEY` to the same value as the Worker's `JWT_SECRET_KEY`, with `USER_JWT_ALGORITHM=HS256`. Check: a UUID-claim token gets 403 "User not found" (not 500) from `GET /user/profile`, `POST /profile` returns 200, and a `legacy-1` token still reads profile 1 (`backend/scripts/loop-profile.sh`).
3. **Remote D1 migration** (before the Worker deploy, because registration now inserts `public_id`): `wrangler d1 execute food4u-db --remote --file=./database/migrations/0001_user_public_id.sql`. Do **not** run `d1:remote-initialize`, which recreates the tables.
4. **Worker deploy** (`npm run deploy`, after the secrets and binding ids), then `node scripts/e2e/login-loop.mjs <worker url>`. Check: a new user lands on `/welcome`.
5. **Remove `GET /profile`** once the Render logs show no `deprecated GET /profile used` lines for a week.

Profile rows 2 and 99999 remain in production from the diagnosis probes. You chose to leave them.
