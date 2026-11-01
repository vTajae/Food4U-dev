# Neon Postgres

The backend stores profiles in Neon Postgres through SQLAlchemy async and asyncpg. Accounts and sessions stay on Cloudflare. Why Neon: [ADR 0003](adr/0003-neon-postgres.md).

## Environment

| Name | Purpose |
|---|---|
| `DATABASE_URL` | Pooled connection string for app traffic. Read from the process or `backend/.env` (process wins). Missing or empty fails at startup before any connection is made |
| `DATABASE_URL_UNPOOLED`, `NEON_DIRECT_URL` | Direct (non-pooler) URL for migrations, admin reads and the live-check cleanup |
| `CAT_FILE` | Optional extra CA bundle. TLS always verifies the hostname against system CAs |
| `NEON_PROJECT_ID` | The project the CLI commands below target |

URLs are normalized to `postgresql+asyncpg://`; libpq-only parameters (`sslmode`, `channel_binding`) are stripped. Pooled URLs for the app, direct URLs for everything administrative.

## Pooling

Defaults are kept: a bounded pool (10 + 20 overflow) with `pool_pre_ping`, statement caches on. `backend/scripts/neon_pooler_check.py` pushed 240 concurrent transactions through the pooler with connection reuse and zero errors; it refuses the production host and only touches its own uniquely named table on a test branch.

## Local work: always a short-lived branch

Never run against production. Create a child branch that expires on its own, point the backend at it, and delete it when done. Keep the credentials in the shell, not in files or command output.

```powershell
$name = "food4u-local-" + [guid]::NewGuid().ToString("N").Substring(0, 8)
$expires = [DateTime]::UtcNow.AddHours(1).ToString("yyyy-MM-ddTHH:mm:ssZ")
neon branches create --project-id $env:NEON_PROJECT_ID --name $name --parent production --expires-at $expires --no-secrets
$env:DATABASE_URL = (neon connection-string $name --project-id $env:NEON_PROJECT_ID --pooled).Trim()
# run the backend, then stop it and remove only this branch:
neon branches delete $name --project-id $env:NEON_PROJECT_ID
Remove-Item Env:DATABASE_URL
```

Bash: `export DATABASE_URL="$(neon connection-string "$name" --project-id "$NEON_PROJECT_ID" --pooled)"`, then `unset DATABASE_URL` afterwards.

Startup `create_all` builds the schema on a fresh branch. The SQL under `backend/migrations/` is for databases that already exist and is applied by hand.

## Local end-to-end loop

From `backend/`, run `.venv/Scripts/python -m uvicorn server:app --host 127.0.0.1 --port 8000` with `USER_JWT_SECRET_KEY` equal to the Worker's `JWT_SECRET_KEY` and `USER_JWT_ALGORITHM=HS256`. Before starting the Worker on 3001, set `API_BASE_URL=http://127.0.0.1:8000` in `frontend/.dev.vars`. For the contract suite, `node contract/local-next.mjs` is the safe runner: it isolates the local server from any remote backend before a single browser request.
