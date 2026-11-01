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

## Next

1. `ci/quality-gates`: GitHub Actions (frontend lint, tsc, tests, build; backend pytest; root tests), PR template, dependabot, `.gitattributes`.
2. `chore/promote-tool`: `internal/promote.mjs` with allowlist and marker scan, plus its test.
3. First promotion to `vTajae/Food4U`; configure the repo (squash only, ruleset on `main`, private vulnerability reporting); open issues for D018-* defects, deprecated `GET /profile`, stale CORS origin in `backend/server.py`, and the privacy page's "filter and explain suggestions" wording (pinned by `contract/pages-api.mjs`).
4. Point Render at `Food4U` `main`; deploy the Worker from a clean checkout; run `check:d1`, `check:live`, `cleanup:live`; then delete `sprint1-nextjs`.
5. Rebase and land PR #26 through the new process; its production rollout changes the Neon database and needs owner confirmation first.

## Owner-gated

- `render login`, then rotate `USER_JWT_SECRET_KEY` (Render) together with `JWT_SECRET_KEY`, `USER_SESSION_SECRET` and `USER_COOKIE_SECRET` (Worker).
- Revoke the two Lucid invite links in `history/notes/06-diagram-links.md`.
- Remove the Netlify `thefoodproject` check from both GitHub repos.
- Screenshots in `sprint/screenshots/` show the old landing copy; regenerate before publishing any.

## Open defects

See `e2e/DEFECTS.md`: D018-02, D018-03, D018-07, D018-09, D018-10, D018-11.
