# Architecture

Food4U is two services. The Cloudflare Worker owns accounts and sessions and renders the UI; the FastAPI backend owns the health profile and food data. They talk over HTTPS with a JWT the Worker issues at login.

## Services

| | Frontend | Backend |
|---|---|---|
| Runtime | Cloudflare Worker, Next.js 16 on vinext | Render web service, FastAPI + Uvicorn |
| Stores | D1 `user` table (accounts); KV sessions, moving to Neon | Neon Postgres via SQLAlchemy async + asyncpg |
| Secrets | `USER_SESSION_SECRET`, `USER_COOKIE_SECRET`, `JWT_SECRET_KEY` | `DATABASE_URL`, `USER_JWT_SECRET_KEY`, `USER_JWT_ALGORITHM`, API keys |
| Config | `frontend/wrangler.jsonc` (bindings, `API_BASE_URL`) | `backend/app/config/` |

## Identity

1. Registration writes a D1 row with a `public_id` (UUID minted by the Worker) and a bcrypt password hash.
2. Login checks D1 only; the backend is never on the login path. The session is a signed `__session` cookie: HttpOnly, Secure, SameSite=Lax, 30 days.
3. At login the Worker issues a JWT whose `user_id` claim is the `public_id`, signed with `JWT_SECRET_KEY`, stores it with the session and renews it when it expires. Each backend call reads the token from the current request's session, never from shared state, so one isolate cannot leak a token across users.
4. The backend verifies the bearer with `USER_JWT_SECRET_KEY` and keys `profile.public_id` on the claim. Integer claims from tokens minted before public ids map to `legacy-<n>`.

Why a public id: [ADR 0002](adr/0002-stable-public-id.md).

## Request paths

| Browser action | Worker | Backend |
|---|---|---|
| Register, log in, log out | server actions under `app/(auth)/login`, `app/api/auth/logout` | none |
| Condition or allergy lookup during onboarding | `app/api/clinicals` → NLM Clinical Tables | none |
| Reference lists (diets, conditions) | `app/api/refs` | `GET /refs` |
| Save onboarding answers | `app/(app)/welcome/actions.ts` | `POST /profile` (create or return), `POST /welcome`, `POST /user/medical` |
| Dashboard | `app/(app)/dashboard` | `GET /user/profile` |
| Ask for a meal idea | `app/api/suggestion` | `POST /api/suggestion`; 503 until the AI path is configured |
| Wake a sleeping backend | `app/api/wake` | `GET /health` |

`/fdc/*` (USDA FoodData Central) and `/spoon/*` (Spoonacular) are backend-only, bearer-protected proxies with no frontend caller today.

## Backend shape

`routers → services → repositories`, Pydantic schemas at the HTTP boundary, SQLAlchemy models in `app/api/models`. Startup runs `create_all` and seeds diet types. A per-user, database-backed rate limiter answers 429 with `Retry-After`. The AI stack (Gemini, LlamaIndex, Qdrant) is imported lazily and only when all five of its environment variables are set; otherwise `/api/suggestion` returns 503 and nothing AI-related is loaded.

Tables: `profile`, `profile_attribute`, `profile_diet`, `profile_goal`, `profile_progress`, `diet_type`, `patient_medical_history`, `icd_codes`, `allergen`, `intolerance`, `meal`, `meal_component`, `meal_type`, `meal_diet_type`, `rate_limits`, `tokens`.

## Failure behavior

- Backend asleep (Render free tier): the auth pages call `/api/wake` and explain the cold start.
- Backend unreachable: the dashboard shows a specific unavailable state with a retry link; onboarding keeps the draft and says the save failed.
- Expired or invalid token: the backend's 403 is shown as a specific state, never a crash or a silent empty page.

## Testing seams

| Suite | Where | What it proves |
|---|---|---|
| Unit | `frontend/tests`, `scripts/tests`, `backend/tests` | Session and token logic, post-deploy scripts, backend routes without a database |
| e2e | `frontend/e2e` | Real Chrome at desktop and mobile against a freshly built Worker and a deterministic fake backend, with console, network and axe gates |
| Contract | `contract/` | Black-box HTTP and UI acceptance against an isolated local server |
| Post-deploy | `npm run check:d1`, `check:live`, `cleanup:live` | Production D1 migrations applied; a throwaway account completes the real journey and is deleted afterwards |
