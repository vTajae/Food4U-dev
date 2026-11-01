# Food4U backend (FastAPI)

Python/FastAPI service: profiles and dietary data (CockroachDB via SQLAlchemy async), food data (USDA FoodData Central, Spoonacular), and suggestions (Gemini + LlamaIndex + Qdrant). Deployed on Render.

- Local URL: http://127.0.0.1:8000 (OpenAPI docs at `/docs`)
- Deployed URL: https://food4u-qxcn.onrender.com

## Run locally

First create a short-lived child branch and set `$name` as described in `../docs/neon-setup.md`. Never use the production URL; stop the backend and delete the child after testing.
```bash
python -m venv env
source env/bin/activate        # Windows: env\Scripts\activate
pip install -r requirements.txt
export DATABASE_URL="$(neon connection-string "$name" --project-id patient-cherry-72346680 --pooled)"
fastapi dev server.py
```
Environment variables (`.env`, gitignored): `DATABASE_URL`, `USER_JWT_SECRET_KEY`, `USER_JWT_ALGORITHM` (HS256), `JWT_ACCESS_TOKEN_EXPIRE_MINUTES`, Gemini/OpenAI/Qdrant/FDC/Spoonacular keys. `USER_JWT_SECRET_KEY` must equal the frontend Worker's `JWT_SECRET_KEY`.

## Identity contract with the frontend
The frontend (Cloudflare Worker, D1) owns accounts and passwords. It signs a JWT whose `user_id` claim is the user's **public id** (a UUID chosen at registration; `legacy-<n>` for accounts that predate it). This service keys `profile.public_id` on that value and never on an integer. `POST /profile` creates-or-returns the profile; `GET /profile` does the same but is deprecated. See `../internal/sprint/data-flow-report.md` for the reasoning.

## Migrations
Plain SQL, applied by hand (no Alembic yet): `migrations/0001_profile_public_id.sql`. Apply on CockroachDB before deploying code that reads `profile.public_id`.

## Tests
The identity tests run without a database; the AI import chain is stubbed in `tests/conftest.py`.
```bash
python -m venv .venv
.venv/Scripts/python -m pip install fastapi pydantic asyncpg SQLAlchemy PyJWT pytest httpx python-dotenv greenlet
.venv/Scripts/python -m pytest tests -q
```
(`requirements.txt` pins versions for Render's Python; the test venv uses current wheels so it also installs on Python 3.14.)

## Feedback loop against the deployed backend
`scripts/loop-profile.sh <user_id>` mints a token with `$JWT_SECRET_KEY` and calls `/profile` and `/user/profile`. **Note:** `/profile` creates a row if it doesn't exist; use ids you own.
