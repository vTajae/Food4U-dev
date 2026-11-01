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

## Next

1. First promotion to `vTajae/Food4U`; configure the repo (squash only, ruleset on `main` without status checks, private vulnerability reporting); open issues for D018-* defects, deprecated `GET /profile`, stale CORS origin in `backend/server.py`, and the privacy page's "filter and explain suggestions" wording (pinned by `contract/pages-api.mjs`).
2. Point Render at `Food4U` `main`; deploy the Worker from a clean checkout; run `check:d1`, `check:live`, `cleanup:live`; then delete `sprint1-nextjs`.
3. Rebase and land PR #26 through the new process; its production rollout changes the Neon database and needs owner confirmation first.

## Owner-gated

- `render login`, then rotate `USER_JWT_SECRET_KEY` (Render) together with `JWT_SECRET_KEY`, `USER_SESSION_SECRET` and `USER_COOKIE_SECRET` (Worker).
- Revoke the two Lucid invite links in `history/notes/06-diagram-links.md`.
- Remove the Netlify `thefoodproject` check from both GitHub repos.
- Screenshots in `sprint/screenshots/` show the old landing copy; regenerate before publishing any.
- `support@food4u.app` (privacy page, app shell footer, pinned by `contract/pages-api.mjs`): the domain is not registered, so mail bounces and anyone could register it. Decide on an address you control, or register the domain.

## Security follow-ups from the PR #26 review (not public issues until fixed)

- `frontend/lib/session-store.ts` upsert: a request that read a session before logout can write it back with 30 fresh days, so a stolen cookie can undo a sign-out (KV behaved the same). Fix: `UPDATE … WHERE id_hash=$1 AND expires_at > now()` for existing ids, 0 rows = signed out; `INSERT` only for new ids.
- Session `data` (backend JWT, email, `auth.id`) is stored in plain text; the owner role could rewrite `auth.id`. Mitigated by the `food4u_web` least-privilege role at rollout; stronger fix is AES-GCM with a key derived from the raw cookie id.
- Expiry slides forward on every write and `created_at` is never checked, so a cookie in constant use never expires. Fix: bound `read` by `created_at`.
- Logout store failure leaves the row valid and the user uninformed; sign-up without a cookie writes a Neon row (anonymous traffic can wake the database, contrary to ADR 0003's wording).
- Fixed in the merge: malformed `SESSION_DATABASE_URL` no longer echoes the connection string; `NEON_FETCH_ENDPOINT` must be loopback; sign-in session failures are logged by error name.

## Open defects

See `e2e/DEFECTS.md`: D018-02, D018-03, D018-07, D018-09, D018-10, D018-11.
