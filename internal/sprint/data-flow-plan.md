# Objective: one stable identity across D1 and the FastAPI backend

_Plan artifact for the cockpit (OMC plans → OMX executes). Written 2026-10-11 after a loop-driven diagnosis; evidence and the already-landed slices are in `data-flow-report.md`._

## Objective (one sentence)
A Food4U user is identified everywhere by a stable `public_id`; login never depends on the backend; every backend failure is surfaced as a specific state; and the deployed system passes the register → login → onboarding → dashboard loop against the real backend.

## Ground truth already landed (branch `sprint1-nextjs`, local commits, not pushed)
| Commit | Slice | Proof |
|---|---|---|
| `backend: key profiles on a stable public id…` | `profile.public_id`, auth by public id, legacy int → `legacy-<n>`, `POST /profile`, no token logging, migration SQL | `backend/.venv/Scripts/python -m pytest backend/tests` → 5 passed |
| `frontend: fix JWT expiry…` | `exp` in seconds (was year 3860) | `npm test` → token-expiry test |
| `frontend: stable public id in D1…` | `user.public_id`, token carries it, login is D1-only, `ApiError`, 20 s fetch timeout, `ensureProfile` | `npm test` → 4 passed; tsc 1 pre-existing; lint 5 pre-existing |
| `frontend: dashboard handles each backend answer…` | explicit 403/expired/unavailable handling | Playwright `login-loop.mjs` → `/dashboard` in ~30 s |
| `d00d0f9` test: welcome round trip (OMX, slice 4) | POST /profile → /welcome → /user/profile at the no-DB seam | pytest 6 passed |
| `e1e5f80` backend: remove dead login/refresh (OMX, slice 6) | dead routes + 4 token helpers gone; route-surface test | pytest 7 passed |
| `e8aac05` backend: isolate AI imports (OMX, slice 7) | user_routes loads no AI package; conftest stubs removed | pytest 8 passed; fresh-process import check |
| `15c8472` backend: deprecation log on GET /profile (slice 5 prep) | one WARNING per hit, no token; POST silent | pytest 11 passed |

## Remaining slices, in order (each has a stop condition)

_Slices 4, 6 and 7 are done and slice 5 is prepared (deprecation log; removal waits for a week of zero hits after the frontend deploy). Slices 1–3 are owner-gated: see `data-flow-report.md` §7._
1. **Apply the two migrations** — owner-gated (production data): `backend/migrations/0001_profile_public_id.sql` on CockroachDB, then `frontend/database/migrations/0001_user_public_id.sql` on the remote D1 (`npm run d1:remote-initialize` is destructive; use the migration file). Stop: `SELECT count(*) FROM profile WHERE public_id IS NULL` = 0 and the D1 equivalent = 0.
2. **Deploy the backend** (Render) from this branch. Stop: `curl` with a UUID-claim token → `GET /user/profile` returns 403 "User not found" (not 500), `POST /profile` returns 200 with that `public_id`, and a `legacy-1` token still returns profile 1.
3. **Deploy the frontend Worker** (`npm run deploy`, after secrets + binding ids). Stop: the Playwright loop against the deployed URL lands on `/welcome` for a new user, and a user who completed onboarding sees `/dashboard` with chips.
4. **Backend `/welcome` and `/user/medical` idempotency check** — they write by internal `user.id`; confirm the new DB-default ids (int64 from `unique_rowid()`) survive JSON serialisation to the frontend (`UserModel.id` is only truthiness-checked today). Stop: a test in `backend/tests` that posts a welcome submission for a freshly created profile and reads it back.
5. **Remove the deprecated `GET /profile`** one release after the frontend deploy. Stop: no 2xx hits on it in Render logs for a week.
6. **Delete dead backend auth paths**: `POST /login` (calls a non-existent `service.login_user`), `GET /refresh` (cookie refresh the frontend never uses), `UserService.generate_jwt_token/create_a_token/create_and_save_tokens`. Stop: `pytest` green and the OpenAPI listing no longer shows them.
7. **Backend import locality**: `user_routes` imports the suggestion/AI stack (Gemini, LlamaIndex, Qdrant) at import time via `food4u_dep`; the tests stub it. Move `get_*_service` factories next to their routers or make AI imports lazy. Stop: `tests/conftest.py` no longer needs the `_STUBS` list.

## Acceptance checks for the run
- `backend/.venv/Scripts/python -m pytest backend/tests -q` → all pass.
- `cd frontend && npm test && npx tsc && npm run lint && npm run build` → tests pass; tsc/lint show only the pre-existing `lib/clinicTables.ts` / `any` findings.
- `node frontend/scripts/e2e/login-loop.mjs <url>` → exit 0 against local dev and against the deployed Worker.
- No new rows created in production by tests (the earlier diagnosis created profile ids 2 and 99999; the user chose to leave them).

## Out of scope
UI work, the shadcn/Next migration (done), suggestion/AI quality, Render plan/cold starts.
