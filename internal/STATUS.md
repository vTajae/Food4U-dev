# Status

_Updated 2026-11-01._

## Repositories

- `vTajae/Food4U-dev` (private): development. `main` is the integration line. `sprint1-nextjs` stays only until Render is pointed at the public repo.
- `vTajae/Food4U` (public): production. Receives squashed promotion PRs only; never dev history.

## Done

- 2026-11-01: dev clone remote repointed to `Food4U-dev`, commit identity set to the `vTajae` noreply address, `main` fast-forwarded to `sprint1-nextjs`, PR #26 retargeted to `main`.
- 2026-11-01: private material moved to `internal/`; vendored SDK copies (`backend/refs-readOnly`), the empty Qdrant store, unreferenced schema files and editor settings removed.

## Next

1. `fix/honest-claims`: truthful landing copy; auth on `/fdc/*` and `/spoon/*`.
2. `chore/dead-code`, `docs/public-docs`, `ci/quality-gates`, `chore/promote-tool`.
3. First promotion to `vTajae/Food4U`, then point Render at it, then land PR #26.

## Owner-gated

- `render login`, then rotate `USER_JWT_SECRET_KEY` (Render) together with `JWT_SECRET_KEY`, `USER_SESSION_SECRET` and `USER_COOKIE_SECRET` (Worker).
- Revoke the two Lucid invite links in `history/notes/06-diagram-links.md`.
- Remove the Netlify `thefoodproject` check from both GitHub repos.

## Open defects

See `e2e/DEFECTS.md`: D018-02, D018-03, D018-07, D018-09, D018-10, D018-11.
