# Status

_Updated 2026-11-01._

## Repositories

- `vTajae/Food4U-dev` (private): development. `main` is the integration line. `sprint1-nextjs` stays only until Render is pointed at the public repo.
- `vTajae/Food4U` (public): production. Receives squashed promotion PRs only; never dev history.

## Done (2026-11-01)

- Dev clone remote repointed to `Food4U-dev`; commit identity set to the `vTajae` noreply address; `main` fast-forwarded to `sprint1-nextjs`; PR #26 retargeted to `main`.
- #27 private material moved to `internal/`; vendored SDK copies, empty Qdrant store, schema drafts and editor settings removed.
- #28 `/fdc/*` and `/spoon/*` require a verified bearer; landing copy and meta description no longer claim safety checks (e2e assertion added).
- #29 dead code removed; `tsc` 0 and lint 0; `NEON_PROJECT_ID` replaces the hardcoded project id; internal tool names out of code.
- Public docs rewritten: README, architecture, deploy, neon-setup, safety-design, roadmap, four ADRs, CONTRIBUTING, SECURITY, frontend/backend/e2e READMEs.

- #31 PR template, Dependabot, `.gitattributes`. A GitHub Actions workflow was added and then removed: the owner decided (2026-11-01) that gates run locally, not in CI.
- #32 `internal/promote.mjs` with allowlist, marker scan and tests.
- Full local gates on `main`: frontend tests 140, lint 0, tsc 0; backend 99; root 31; e2e 79 passed / 11 known fixmes at both widths; contract suite (see below).

## Docker and the second candidate (2026-11-01, FFY-DOCKER-REVIEW-01)

- #45 `compose.yaml` (postgres:16-alpine, backend, Worker dev server; health checks; volumes `pgdata`, `frontend_node_modules`, `frontend_wrangler`), `backend/Dockerfile`, `frontend/Dockerfile`, `.env.example`, `frontend/.dev.vars.docker.example`, `docs/docker.md`. `database.py` honors `sslmode=disable`; `conftest.py` forces the test JWT secret (the suite failed in containers before).
- #46–#49 promotion tool: refuses private allowlist entries, detects public-only changes against a baseline (marker in public commits or `--baseline`), `--no-push` writes `internal/candidates/<branch>-<sha>.{json,diff}`, `compose.yaml`/`.env.example` allowlisted, `${VAR}` URL passwords treated as placeholders. `promote:allow` was removed in #42 and no longer exists.
- Local evidence (Docker Desktop, context `desktop-linux`, engine 29.9.2): dev stack healthy, 13 tables, 11 seeded diet rows, a `POST /profile` row survives `down`/`up`, `/api/wake` reaches the backend; pytest 101 and `npm test` 140 inside containers. Same checks on the exported candidate (project `food4u-candidate`): healthy, `/health` ok, pytest 101, `/login` 200.
- Candidate: prod clone branch `promote/docker-dev-stack` = `f4cc95e` (local only, not pushed), 14 files +216/−6 over public `ac2da05`, dev `bfd2ae8`, baseline `d351b43`, no public-only changes; manifest and full diff in `candidates/promote-docker-dev-stack-bfd2ae8.{json,diff}`. Candidate gates: tsc 0, lint 0, tests 140, root 31, backend 101, links 0 broken.
- Awaiting owner approval: push that branch to `vTajae/Food4U` and open the PR `feat: local Docker dev stack and hermetic backend tests`; squash-merge after review. The Docker volumes `food4u-candidate_*` and `food4u-dev_*` were left in place (no volume deletion).

## Next

1. Done 2026-11-01: first promotion merged as public PR #10 (`ac2da05`, from dev `d351b43`); repo configured (squash only, `main` ruleset, private vulnerability reporting); public issues #1–#9 open. Fresh-clone check: no `internal/` or `rust-app/`, no marker hits; a 120-character generated schema filename under `backend/app/api/schemas/spoonacular/` needs `git config core.longpaths true` on Windows for deep clone paths.
2. Point Render at `Food4U` `main`; deploy the Worker from a clean checkout; run `check:d1`, `check:live`, `cleanup:live`; then delete `sprint1-nextjs`. Later promotions: `node internal/promote.mjs <branch> "<title>" --body <file>` from a clean dev `main`.
3. PR #26 (sessions in Neon): branch merged with `main`, hardened after an independent security review, and its flaky gate fixed (FFY-SESSION-RACE-02, 2026-11-01). Root cause: `login()` returns at `/dashboard`, which the server redirects to `/welcome` for a fresh account; the redirect's re-fetched `/welcome?_rsc` is aborted by vinext (D019-01) and the gate tolerates that only once the page has committed `/welcome` before the next check. The rotation journey gated straight after `login()`; it now waits for the welcome heading at both gates, like `auth.spec.ts`. Before: 2 of 3 whole-file desktop runs failed (earlier 3 of 4). After: 8 desktop and 2 mobile executions passed, full suite 87 passed / 11 known fixmes / 0 failed, zero "never committed" events. Two runs in the ladder hit `page.goto: net::ERR_ABORTED` stalls (10 min) that cleared on rerun (17/0 and 4/0): environmental, logged in the scratch run logs, not reproduced. PR head is now that commit on `feat/sessions-in-neon`; still NOT merged (review boundary). Its production rollout changes the Neon database and needs owner confirmation.

## Owner-gated

- `render login`, then rotate `USER_JWT_SECRET_KEY` (Render) together with `JWT_SECRET_KEY`, `USER_SESSION_SECRET` and `USER_COOKIE_SECRET` (Worker).
- Revoke the two Lucid invite links in `history/notes/06-diagram-links.md`.
- Remove the Netlify `thefoodproject` check from both GitHub repos.
- Screenshots in `sprint/screenshots/` show the old landing copy; regenerate before publishing any.
- `support@food4u.app` (privacy page, app shell footer, pinned by `contract/pages-api.mjs`): the domain is not registered, so mail bounces and anyone could register it. Decide on an address you control, or register the domain.

## Open defects

See `e2e/DEFECTS.md`: D018-02, D018-03, D018-07, D018-09, D018-10, D018-11.
