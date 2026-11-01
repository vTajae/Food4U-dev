# Docker: local dev and test stack

`compose.yaml` runs Postgres, the FastAPI backend and the Worker dev server on the local Docker engine. It is for development and tests only; production stays on Render, Cloudflare and Neon, and nothing here touches them.

| Service | Image | Port on the host | Data |
|---|---|---|---|
| `db` | `postgres:16-alpine` | `127.0.0.1:5432` | volume `pgdata` |
| `backend` | `backend/Dockerfile` (python:3.11-slim) | `127.0.0.1:8000` | none |
| `frontend` | `frontend/Dockerfile` (node:22) | `127.0.0.1:3001` | volumes `frontend_node_modules`, `frontend_wrangler` (local D1 and KV) |

Credentials never enter an image: the services read `.env` (copied from `.env.example`) and `frontend/.dev.vars.docker` (copied from `frontend/.dev.vars.docker.example`), both ignored by git and both dev-only placeholders. The backend connects to the `db` service with `sslmode=disable`, which `backend/app/config/database.py` honors only when the URL says so; every other URL gets verified TLS.

## Start

```sh
cp .env.example .env
cp frontend/.dev.vars.docker.example frontend/.dev.vars.docker
docker compose up -d --build --wait        # waits for all three health checks
```

Once per fresh `frontend_wrangler` volume, create the local D1 user table (it drops and recreates that table, so never point it at production):

```sh
docker compose exec frontend npm run d1:local-initialize
```

Then open http://127.0.0.1:3001. The backend's OpenAPI page is at http://127.0.0.1:8000/docs. The frontend container bind-mounts `frontend/`, so edits on the host reload in the container; its Linux `node_modules` live in a named volume and never mix with the Windows copy.

## Check

```sh
docker compose ps                                           # all healthy
curl -s http://127.0.0.1:8000/health                        # {"status":"ok"}
docker compose exec db psql -U food4u -d food4u -c '\dt'    # tables created by the backend at startup
```

## Test inside the containers

```sh
docker compose run --rm backend python -m pytest tests -q   # no database needed
docker compose run --rm frontend npm test                   # unit tests
```

The real-Chrome e2e suite and the contract suite need a system Chrome and run on the host, not in a container.

## Stop and reset

```sh
docker compose down            # stops containers; pgdata and the other volumes survive
docker compose down --volumes  # also deletes the database and local D1/KV state; dev data only
```

## Limits

- The frontend container runs `vite dev`; the production Worker is built and deployed by `npm run deploy` from the host (see `deploy.md`).
- The AI suggestion path is not configured here, so `POST /api/suggestion` answers 503, as in production.
- Health checks prove the processes answer; they are not a substitute for the test suites.
