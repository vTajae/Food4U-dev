# Food4U backend

FastAPI service: profiles, medical history and diets in Neon Postgres (SQLAlchemy async + asyncpg); bearer-protected proxies for USDA FoodData Central and Spoonacular; an optional AI suggestion path (Gemini, LlamaIndex, Qdrant) that loads only when configured. Deployed on Render.

- Local: http://127.0.0.1:8000, OpenAPI at `/docs`
- Production: https://food4u-qxcn.onrender.com

## Run locally

Always against a short-lived Neon branch, never production (see `../docs/neon-setup.md`).

```bash
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements-dev.txt     # macOS and Linux: .venv/bin/python
export DATABASE_URL="$(neon connection-string "$name" --project-id "$NEON_PROJECT_ID" --pooled)"
export USER_JWT_SECRET_KEY=dev-only-jwt-secret USER_JWT_ALGORITHM=HS256
.venv/Scripts/python -m uvicorn server:app --reload
```

Environment, from the process or an ignored `.env`: `DATABASE_URL`, `USER_JWT_SECRET_KEY` (equal to the Worker's `JWT_SECRET_KEY`), `USER_JWT_ALGORITHM`, optional `FDC_API_KEY` and `SPOONACULAR_API_KEY`. The AI path needs `GOOGLE_GEMINI_API_KEY`, `QDRANT_URL`, `QDRANT_API_KEY`, `GOOGLE_DRIVE_FOLDER_ID` and `GOOGLE_SERVICE_ACCOUNT_JSON_BASE64`; without all five, `POST /api/suggestion` answers 503 and the AI packages are never imported.

## Identity contract

The Worker owns accounts and passwords. It signs a JWT whose `user_id` claim is the user's `public_id` (a UUID chosen at registration; `legacy-<n>` for accounts that predate it). This service keys `profile.public_id` on that value and never on an integer. `POST /profile` creates or returns the profile; `GET /profile` does the same and is deprecated. `/fdc/*` and `/spoon/*` require the same bearer. See `../docs/adr/0002-stable-public-id.md`.

## Layout

```
server.py            app, CORS, rate-limit middleware, router mounting
app/api/routers      HTTP: user_routes, suggestion_routes, fdc_routes, spoon_routes
app/api/services     business logic
app/api/repo         data access
app/api/models       SQLAlchemy models
app/api/schemas      Pydantic schemas
app/config           database, diet seed, AI configuration
migrations/          plain SQL applied by hand; startup create_all handles a fresh database
tests/               pytest; no database required
```

## Tests

```bash
.venv/Scripts/python -m pytest tests -q
```
