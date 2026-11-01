# Food4U documentation

- [`deploy.md`](deploy.md) — deploy order and post-deploy checks.
- [`neon-setup.md`](neon-setup.md) — Neon Postgres setup and local proof.
- [`API/`](API/) — notes on the external APIs (USDA FoodData Central, NLM Clinical Tables).
- [`../frontend/DESIGN.md`](../frontend/DESIGN.md) — the design system ("Pantry Label"): tokens, type, components, rules.

Design notes, sprint reports, screenshot evidence and owner runbooks live in the private `internal/` folder of the development repository and are not published.

## Running things

- Frontend: `frontend/README.md`. Tests: `cd frontend && npm test`.
- Backend: `backend/README.md`. Tests: `cd backend && .venv/Scripts/python -m pytest tests -q`.
- Root: `npm test` (post-deploy scripts), `node contract/local-next.mjs` (web contract against a local server).
