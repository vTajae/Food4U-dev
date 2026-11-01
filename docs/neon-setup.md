# Neon Postgres setup (2026-10-13)

Neon replaces CockroachDB for FastAPI profile storage. SQLAlchemy + asyncpg and
Cloudflare D1/KV identity remain. This is local integration proof, not a deployment.
Only one child branch was created on the existing free-tier project.

## What changed
- Root `npm run build` now invokes the existing frontend build.
- Backend URLs normalize to `postgresql+asyncpg`; libpq-only `sslmode` and
  `channel_binding` are stripped. TLS uses system CAs, hostname verification/SNI,
  and optional additional `CAT_FILE` trust. Verified TLS is enforced; this does
  **not** claim SCRAM channel-binding enforcement.
- Backend reads `DATABASE_URL` from the process or `backend/.env` (process values
  win). It never reads repo-root `.env.local`. Missing/empty URLs fail at startup
  before creating an engine or connecting; importing the module needs no URL.
- Frontend `ApiService` reads Worker `API_BASE_URL`; deployed `wrangler.jsonc`
  configuration and static-token behavior are unchanged. Contract safety tooling
  now recognizes the env-binding declaration.
- `.neon`, `.env.local`, `.dev.vars`, `.venv` and `.venv311` stay untracked.

Environment names: `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `NEON_BRANCH`,
`CAT_FILE` (optional), `USER_JWT_SECRET_KEY`, `USER_JWT_ALGORITHM`, frontend
`JWT_SECRET_KEY`, `API_BASE_URL`. Full-server imports also require `REQUEST_TIMEOUT`,
`GOOGLE_GEMINI_API_KEY`, `GOOGLE_DRIVE_FOLDER_ID`, `QDRANT_API_KEY`, `QDRANT_URL`,
`GOOGLE_SERVICE_ACCOUNT_JSON_BASE64`; profile-only proof supplied inert process
values for unused AI configuration without invoking those services.

Use **pooled** URLs for app traffic, **direct** for migrations/admin/read-back.
Existing startup `create_all` builds the fresh schema; do not run the old
Cockroach-specific migration on Neon.

## Pooler proof
Keep default statement caches and the bounded app pool (10 + 20 overflow), with
`pool_pre_ping`. No UUID names, disabled caches or `NullPool`: current Neon supports
protocol prepared statements, and live defaults passed.
`backend/scripts/neon_pooler_check.py` ran 48 tasks × 5 rounds = 240 real transactions,
repeated identical parameterized statements, same-transaction-id/read-after-write/
post-commit checks; peak 30 checkouts, connection reuse, zero errors, 12.047 seconds
(asyncpg 0.29.0 / SQLAlchemy 2.0.32). Supply branch `DATABASE_URL` and matching
`NEON_TEST_POOLER_HOST` in process env. The script refuses the linked production
host and only creates/drops its own uniquely named branch test table.

Exploratory numeric names also passed 24 clients/192 queries. A deliberately
constant name was rejected; that is same-connection name reuse, **not** evidence
of cross-client pooler collisions or a reason to disable caches.
Sources: [Neon pooling](https://neon.com/docs/connect/connection-pooling),
[SQLAlchemy asyncpg](https://docs.sqlalchemy.org/en/20/dialects/postgresql.html#asyncpg).

## Local run and E2E

Local runs require an explicitly selected, free short-lived child branch. CLI
8.4.2 `branches create --help` and `connection-string --help` verified these flags.
From the repo root in PowerShell (credentials remain in this shell, not files):

```powershell
$name = "food4u-local-" + [guid]::NewGuid().ToString("N").Substring(0, 8)
$expires = [DateTime]::UtcNow.AddHours(1).ToString("yyyy-MM-ddTHH:mm:ssZ")
neon branches create --project-id patient-cherry-72346680 --name $name --parent production --expires-at $expires --no-secrets
$env:DATABASE_URL = (neon connection-string $name --project-id patient-cherry-72346680 --pooled).Trim()
# Run the backend with the existing JWT/AI configuration for this shell.
# Stop the backend first, then remove only this disposable child branch:
neon branches delete $name --project-id patient-cherry-72346680
Remove-Item Env:DATABASE_URL
```

For Bash, assign the pooled URL with
`export DATABASE_URL="$(neon connection-string "$name" --project-id patient-cherry-72346680 --pooled)"`
after the same child creation; `unset DATABASE_URL` after stopping/deleting it.
Do not print credentials, copy the production URL, or use the root `.env.local`
as backend configuration. npm backend launch scripts require this process URL.

Preserve `.venv` (Python 3.14; no-DB tests). Windows full-server proof used a separate
`.venv311`, created with `py -V:Astral/CPython3.11.15 -m venv backend/.venv311`.
Full `requirements.txt` install failed: pinned `nvidia-nccl-cu12` has no Windows
release. Only existing pinned server-import dependencies were installed instead;
exact command/freeze are in the cockpit receipt. `pip check` passed. No stubs or
AI import refactor. Render's Python version is currently unpinned.

Set the backend process to a test branch's pooled URL; match its JWT secret to
frontend's secret and use HS256. From `backend/`, run `.venv311/Scripts/python -m
uvicorn server:app --host 127.0.0.1 --port 8000`. **Before Vite starts on 3001**,
override `.dev.vars` `API_BASE_URL` to that loopback backend. Back up and restore
original bytes after stopping. Never test against the production backend.
Frozen contract: `node contract/local-next.mjs` is the safe local runner.

The owner-local `.cockpit/20261013-neon/plans/001-run-local.mjs` validates the exact
child host, supplies process-only credentials, overrides/restores `.dev.vars`,
and proves server fetch isolation before browser traffic. The committed
`frontend/scripts/e2e/neon-profile.mjs` requires this runner's ownership proof.
Real Chrome: register A → fresh login B → missing profile/ensure → welcome →
save Italian + live NLM allergy J30.9 → Ask dashboard. Fresh login C still rendered
Ask using Neon data. Direct read-only SQL confirmed profile, cuisine attribute,
and joined medical-history/code rows. Browser/server ONRENDER requests: **0**.
Screenshots inspected; all three env/link files retained original SHA256s.
Gates: root build green; original backend **16 passed**; frontend **5 passed**;
frozen contract **37/0/6**.

## Existing findings (not repaired)
- `frontend/app/(app)/dashboard/page.tsx:82` redirects on registration's welcome
  flag before ensure. Same-session save observed `/welcome` POST 403 and
  "Couldn't save your profile. Please try again."
- `preferences_service.py:30,34`: diet/price dispatch is commented out.
- Dashboard line 23 excludes cuisine attributes from chips. Conditions/allergies
  persist only in medical history (`medical_service.py:10-19`,
  `medical_repo.py:32-46`), which chips never read. No onboarding answer shows a chip.
- Live logs warn of non-checked-in SQLAlchemy connections; investigate dependency
  lifecycle separately. Successful flow is not rollout-readiness proof.
- Root lint/typecheck fail in unchanged `clinicTables.ts`, `userRepository.ts`,
  `clinicalService.ts`. Optional `.venv311` pytest flags a `google` namespace
  preloaded by a distribution `.pth` before app import; mandated `.venv` tests pass.

## Production and owner gates
For the current, owner-operated paired deployment, verification, and rollback
procedure, use [`render-neon-cutover.md`](../internal/runbooks/render-neon-cutover.md). The findings
and gates below record the historical slice-001 state, not current deployment
acceptance; slices 002–004 repaired the onboarding/session findings locally.

Production backend started once for schema-only `create_all`, with **zero HTTP
requests**. Read-only checks listed 13 tables: `allergen`, `diet_type`, `icd_codes`,
`intolerance`, `meal`, `meal_component`, `meal_diet_type`, `meal_type`,
`patient_medical_history`, `profile`, `profile_attribute`, `profile_diet`, `rate_limits`.
Production profile, attribute and rate-limit row counts are zero.

Owner gates: switch Render to Neon pooled, match JWT settings, pin Python (e.g.
3.11), migrate real Cockroach data if any, address findings, and delete `food4u-e2e`
after OMC validation (7-day TTL). Free tiers only until scaling. No push/deploy,
remote Wrangler call, plan upgrade or billable resource creation.
