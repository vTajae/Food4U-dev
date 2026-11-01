# Food4U

Meal ideas for people with dietary restrictions and medical conditions.

Food4U saves a person's conditions (ICD-10-CM), allergies and intolerances, diet and budget once, then uses that profile when they ask what to eat. The long-term goal is a recommendation engine where every suggestion passes a deterministic safety layer before it is shown. That layer is designed but not built yet; see [Status](#status).

Live app: https://food4u-frontend.qias-webdev.workers.dev

## Status

| Area | State |
|---|---|
| Accounts, sessions, login | Working. D1 accounts, signed session cookie, a JWT issued at login and attached to backend calls |
| Onboarding | Working. Five steps: cuisines, diet, medical condition (NLM Clinical Tables lookup), allergies and foods to avoid, spend per meal. Drafts are kept per account |
| Profile persistence | Working. Neon Postgres through the FastAPI backend, keyed on a stable public id |
| Ask screen | UI done. The backend's AI suggestion path is not configured in production and answers 503, which the UI reports plainly |
| Safety layer | Design only ([docs/safety-design.md](docs/safety-design.md)). No suggestion is checked against the profile yet |
| Meal plans, grocery lists, integrations | Not started ([docs/roadmap.md](docs/roadmap.md)) |

Food4U suggests food, not treatment. Nothing it shows is medical advice.

## Architecture

Two services over authenticated HTTP:

```
Browser ──► Cloudflare Worker (Next.js 16 on vinext) ──JWT──► Render (FastAPI)
            • D1: accounts   • KV: sessions*                  • Neon Postgres: profiles, medical history, diets
            • NLM Clinical Tables lookups                      • USDA FoodData Central, Spoonacular proxies
            • app/api/* routes proxy the backend               • Gemini + LlamaIndex + Qdrant (optional, lazy)
```

\* Moving sessions from KV to Neon is in progress and not deployed.

[docs/architecture.md](docs/architecture.md) covers the identity flow and request paths; [docs/adr/](docs/adr/) records the decisions behind the shape.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router) on vinext, React 19, TypeScript, Tailwind CSS 4, shadcn/ui, React Hook Form + Zod |
| Edge | Cloudflare Workers, D1, KV, Wrangler 4 |
| Backend | Python 3.11, FastAPI, SQLAlchemy 2 (async), asyncpg, Uvicorn, on Render |
| Databases | Neon Postgres (backend), D1 (accounts) |
| Food and clinical data | USDA FoodData Central, Spoonacular, NLM Clinical Tables (ICD-10-CM) |
| Tests | node:test, Playwright in real Chrome with a fake backend, pytest, a black-box web contract suite |

## Repository layout

```
frontend/   Next.js app: app/ routes, components/, lib/ (session, auth), api/ (backend client), database/ (D1), e2e/, tests/
backend/    FastAPI app: app/api (routers → services → repositories), app/config, migrations/, tests/
contract/   Black-box acceptance tests for the web layer, run against an isolated local server only
scripts/    Post-deploy checks (D1 schema, live browser check, cleanup) and their tests
docs/       Architecture, deploy, roadmap, safety design, ADRs
```

## Running locally

Prerequisites: Node 22+, Python 3.11, a Neon project (free tier is enough), Google Chrome for the e2e suite.

Frontend:

```bash
cd frontend
npm ci
cp .dev.vars.example .dev.vars      # dev-only placeholder secrets
npm run d1:local-initialize         # local D1 user table
npm run typegen                     # worker-configuration.d.ts from wrangler.jsonc
npm run dev                         # http://localhost:3001
```

Backend, against a short-lived Neon branch and never production (see [docs/neon-setup.md](docs/neon-setup.md)):

```bash
cd backend
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
export DATABASE_URL="$(neon connection-string "$BRANCH" --project-id "$NEON_PROJECT_ID" --pooled)"
export USER_JWT_SECRET_KEY=dev-only-jwt-secret USER_JWT_ALGORITHM=HS256
uvicorn server:app --reload                             # http://127.0.0.1:8000, OpenAPI at /docs
```

`JWT_SECRET_KEY` in the Worker and `USER_JWT_SECRET_KEY` in the backend must match. Set `API_BASE_URL=http://127.0.0.1:8000` in `frontend/.dev.vars` for a full local loop.

## Tests

```bash
npm test                                   # root: post-deploy script tests
cd frontend && npm run lint && npm run typecheck && npm test
cd frontend && npm run e2e                 # real Chrome, both widths, fake backend; builds a fresh Worker
node contract/local-next.mjs               # web contract against an isolated local server
cd backend && .venv/bin/python -m pytest tests -q        # Windows: .venv\Scripts\python; no database needed
```

## Contributing and security

See [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md).

## Background

Food4U began as a 2024 hackathon project around one observation: people with dietary restrictions spend hours a week working out what they can safely eat, and most tools hand them generic lists. It is being rebuilt, in public, into a tool that does that work for them and shows its reasoning.

## License

[MIT](./LICENSE)
