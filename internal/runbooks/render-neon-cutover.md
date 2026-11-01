# Render -> Neon cutover (owner-operated, 2026-10-13)

For subsequent releases, use the shorter [ordered deployment and post-deploy
checks runbook](deploy.md). It includes the required D1 migration gate before
Worker deployment and guarded cleanup of the automated live-check account.
The historical slice-005 evidence labels below remain historical, not current
production certification.

**This is a runbook, not a deployment receipt.** Production access, pushes,
deploys, and cleanup below are **owner-only, not executed** by slice 005.
The executor used only a disposable Neon child and a loopback backend; that
child was deleted. Never use the old CockroachDB with the new seed/backend.

Success: the existing Render backend uses the existing Neon project
`patient-cherry-72346680` (qiasme), branch `production`; `/refs?queryKey=diets`
returns the 11 standard diets; the existing Next.js Worker saves onboarding and
retains diet/allergy chips after a fresh login. Backend first, frontend second.
No data migration, new bindings, new services, or paid-plan changes are included.

**Production startup / recovery note (slice 009):** Production has no AI
configuration. With the startup fix, suggestion endpoints return HTTP 503 with
`AI suggestions are not configured` until AI is configured; non-AI routes remain
available. A failed Render deploy leaves the previous deploy live. Rebuilding
the old commit `fdf33ad` no longer succeeds: for this incident use Render's
**Rollback** of the previous successful deploy, not a rebuild of that commit.
Reconcile the saved service configuration as described in section 7 before any
owner-operated rollback. No deployment or rollback was performed by slice 009.

## 1. Before changing anything — owner-only, not executed

Choose a maintenance window and prevent user writes throughout the cutover.
Do not proceed if you cannot keep the old/new database and backend versions
paired. In the existing Render service, record privately:

- Current deployed backend **commit hash** and deploy ID, selected branch,
  auto-deploy setting, root directory, build command, and start command.
- Exact current `DATABASE_URL`, `CAT_FILE` (if present), and `PYTHON_VERSION`
  (if present), including whether each optional variable was absent.
- Any certificate file/secret-file path needed by the old `CAT_FILE`; retain it
  for rollback. Keep other secrets/configuration unchanged, especially backend
  `USER_JWT_SECRET_KEY` / `USER_JWT_ALGORITHM` and their frontend JWT counterpart.
- Current frontend source commit and **Worker version ID**. In `frontend/`,
  `node node_modules/wrangler/bin/wrangler.js deployments list --config wrangler.jsonc`
  lists recent deployments (owner-only; only `--help` was run locally). Record
  the version serving 100% of traffic, not just the newest upload.

Store rollback values in a private password manager/operator record, never git,
screenshots, shared logs, chat, or a shell transcript. Do not delete CockroachDB.
There is no checked-in Render manifest, Procfile, or Python runtime pin: the
dashboard settings are the source of truth and must be inspected by the owner.

### Old-data decision gate — owner-only, not executed

In the **old CockroachDB's owner SQL console**, run only these read-only checks
before switching (the executor did not connect to it):

```sql
BEGIN TRANSACTION READ ONLY;
SELECT 'profile' AS relation, count(*) AS rows FROM profile
UNION ALL SELECT 'profile_attribute', count(*) FROM profile_attribute
UNION ALL SELECT 'profile_diet', count(*) FROM profile_diet
UNION ALL SELECT 'patient_medical_history', count(*) FROM patient_medical_history;
ROLLBACK;
```

If any real users exist, **STOP and request a separate migration slice**. Counts
alone cannot prove rows are disposable: review their provenance privately. If
any count is nonzero/unexplained, a table is missing, or access fails, stop rather
than treating that as zero. This runbook neither copies nor discards old data.
Also confirm in Neon production's owner SQL console that no unexpected profiles
have appeared since the earlier schema-only initialization; use the same counts.

## 2. Obtain the pooled Neon URL — owner-only, not executed

Use an already-authenticated Neon CLI in a **private, non-transcribed terminal**.
The requested command syntax is:

```text
neon connection-string production --project-id patient-cherry-72346680 --pooled
```

It emits a password-bearing URL. Do not run it in a shared pane/log. In private
PowerShell, capture stdout instead of displaying it:

```powershell
$NeonPooledUrl = neon connection-string production --project-id patient-cherry-72346680 --pooled
if ($LASTEXITCODE -ne 0 -or -not $NeonPooledUrl) { throw 'Neon URL retrieval failed' }
```

Paste its value directly into Render's secret field; do not echo it, put it in
history, or write it into repo files. Clear the variable/clipboard afterwards.
Check privately that the selected branch is **production** in the named project
and the hostname contains `-pooler`. Do not use `--psql`, `neon checkout`, or
`neon env pull`; those are unnecessary here. Direct URLs are for admin/SQL work,
not Render application traffic. CLI 8.4.2 `connection-string --help` and
[Neon's command reference](https://neon.com/docs/cli/connection-string) verify
`[branch]`, `--project-id`, and `--pooled` (**verified locally**, help only for
production; actual URL retrieval was only for the disposable child).

## 3. Switch Render configuration and backend in one deploy — owner-only, not executed

First set **Settings -> Auto-Deploy -> Off**, and verify no other deploy is in
progress. The owner must push the
reviewed `neon-setup` changes themselves and choose/record the exact backend
commit containing slices 002–005. No push was performed by the executor.
Never deploy this seeded backend to the old CockroachDB URL: its `diet_type`
may lack the unique constraint needed by `ON CONFLICT (diet_name)`.

Under **Environment -> Environment Variables**, stage all these changes and
choose **Save only**, not **Save and deploy**:

| Setting | New value/action |
|---|---|
| `DATABASE_URL` | Captured Neon **pooled** URL, production branch |
| `PYTHON_VERSION` | **`3.11.15`**, not the floating `3.11` |
| `CAT_FILE` | Remove it from the effective environment; Neon TLS uses system CAs |

Check linked environment groups too: removing a service override can expose an
inherited `CAT_FILE`. Do not edit a shared group blindly (it can affect other
services); stop if you cannot remove the effective value safely. Preserve all
other variables and the old certificate secret file for rollback.
Then choose **Deploys -> Manual Deploy -> Deploy a specific commit**, paste the
chosen SHA, and select **Deploy Commit**, with the staged environment.
Do not trigger a deploy between editing the variables and choosing
the new commit. If the dashboard cannot stage these changes, stop and establish
a safe maintenance procedure rather than deploying a mismatched pair. The
staged-env/specific-commit sequence is an operational synthesis of Render's
documented controls, not a cross-service atomicity guarantee:
[environment Save only](https://render.com/docs/configure-environment-variables),
[specific-commit deployment](https://render.com/docs/deploys).

Keep the existing root/build/start settings if correct. For a native Python
service rooted at `backend/`, the expected commands are `pip install -r
requirements.txt` and `uvicorn server:app --host 0.0.0.0 --port $PORT` (Render's
shell expands `$PORT`). Confirm this against the existing service before use;
do not blindly replace a differently rooted command.

**Python pin evidence — verified locally:** CPython 3.11.15 was already installed
in `backend/.venv311`; `python --version`, `pip check`, full FastAPI startup and
the real `/refs` request passed with the existing pinned server dependencies.
The **entire** `backend/requirements.txt` also resolved successfully (184
packages) for Linux x86_64/Python 3.11.15 with:

```text
uv pip compile backend/requirements.txt --python-version 3.11.15 --python-platform x86_64-manylinux_2_28
```

This is dependency-resolution evidence, **not** a full Linux/Render install or
AI-runtime test. The full Windows install is unsuitable (`nvidia-nccl-cu12`,
`triton`, `uvloop` include Linux-specific dependencies). The owner must require a
successful full Render requirements install/build before accepting the deploy.
3.11.15 is the exact locally exercised patch, not a claim to be the latest.
[Render requires a fully qualified environment pin](https://render.com/docs/python-version).

## 4. Verify the backend before frontend deployment

### Live checks — owner-only, not executed

Use the URL shown in the existing Render service, expected to remain
`https://food4u-qxcn.onrender.com`. In PowerShell use `curl.exe` (not the legacy
PowerShell alias); in a POSIX shell use `curl`:

```text
curl.exe --fail --silent --show-error --max-time 90 "https://food4u-qxcn.onrender.com/refs?queryKey=diets"
```

No auth header is required. Expect HTTP 200 and an array of exactly 11 rows
whose `diet_name` set is:

```text
Gluten Free, Ketogenic, Vegetarian, Lacto-Vegetarian, Ovo-Vegetarian,
Vegan, Pescetarian, Paleo, Primal, Low FODMAP, Whole30
```

Inspect Render logs for **`Application startup complete`** and **no
`non-checked-in connection`** lines during startup/requests. Free Render services
sleep after inactivity; the first request can take about one minute. If it times
out, inspect startup logs before retrying; a timeout is not a passing check.
[Render Free idle behavior](https://render.com/docs/free#spinning-down-on-idle).

In Neon's console, explicitly select the production branch and correct database,
then run read-only SQL:

```sql
BEGIN READ ONLY;
SELECT count(*) AS public_tables FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
SELECT count(*) AS diet_count FROM public.diet_type;
SELECT diet_name FROM public.diet_type ORDER BY diet_name;
ROLLBACK;
```

Require **13 or more** public tables and **11** diets with the names above. Stop
on any mismatch, startup error, or connection leak. Do not proceed to frontend.
`create_all` does not migrate an incompatible existing schema; no legacy
Cockroach migration script belongs in this cutover.

### Disposable rehearsal — verified locally

The same `curl.exe` flags/request against `http://127.0.0.1:8005/refs?queryKey=diets`
returned exactly those 11 names using the real backend, no auth, no route mocks.
Fresh child-branch read-only SQL showed **13 tables, 11 diets, 0 profiles**.
Logs showed startup complete and zero non-checked-in lines through graceful
shutdown. Exact child endpoints were checked before app import; only that child
was connected to and deleted. This does **not** certify production's current data.

## 5. Deploy the Next.js Worker second — owner-only, not executed

After step 4 passes, deploy the **Next.js app in `frontend/`**, not the Rust spike
or the legacy Pages app. Confirm Workers **Free** and the existing Worker
`food4u-frontend`. Its existing `cloudflare_KV` / `cloudflare_db` bindings and
secrets stay in place. No new bindings or remote D1 initialization are needed,
but **D1 migrations must be checked and any missing migrations applied before
the Worker deploy**. Run root `npm run check:d1` and follow the
[migration/reconciliation steps](deploy.md#ordered-deployment), including the
manually applied `0001_user_public_id.sql` history trap. In
`frontend/wrangler.jsonc`, `API_BASE_URL` stays
`https://food4u-qxcn.onrender.com`; do not put a Neon URL in the Worker.

The real `frontend/package.json` deploy script is
`vinext-cloudflare deploy --config dist/server/wrangler.json`. From `frontend/`:

```text
npm run build
npm run deploy -- --dry-run
node node_modules/wrangler/bin/wrangler.js deploy --config dist/server/wrangler.json --dry-run
```

These are **verified locally**: build, vinext setup validation (no build/upload),
and Wrangler's generated-artifact compilation (no upload). The installed help
for both tools confirms `--config` / `--dry-run`; see
[Wrangler deploy](https://developers.cloudflare.com/workers/wrangler/commands/workers/).
Generated `dist/server/.dev.vars` can contain local secrets: never publish build
artifacts or share them. Only source config vars are the production non-secret
bindings; preserve the deployed secrets.

**Owner-only, not executed:** when the source commit, backend, account, bindings,
and dry runs are accepted, run `npm run deploy` from `frontend/`. This builds and
deploys a live Worker version. Record its source commit and version ID; keep
auto-deploy off until the end-to-end check passes.

## 6. Live onboarding acceptance and test-profile cleanup — owner-only, not executed

On the actual live Next.js site (confirm its URL in the Worker dashboard):

1. Register a uniquely named throwaway account. Use no real medical information.
2. Log in, complete `/welcome` with **Vegetarian + one allergy** selected from
   the returned suggestions; note the allergy label/code privately.
3. Save once in that session. The dashboard must show Vegetarian and the allergy
   chip, with no save failure/unavailable state.
4. Log out and log in again. Both chips must still be present. Inspect Render
   logs again for startup/request errors and non-checked-in lines.

Failure means stop/rollback, not acceptance. This is a future live check; local
unit/contract/rehearsal evidence does not replace it.

### Find and deliberately delete only the test profile

There is **no profile-delete API route** in `backend/app/api/routers/user_routes.py`.
Get the stable public ID privately in the existing D1 dashboard (the backend's
`/user/profile` response does not expose it):

```sql
SELECT user_id, public_id, username FROM user
WHERE username = '<exact-throwaway-username>';
```

Do not confuse D1 `user_id` with Neon's internal profile ID. In the Neon
production SQL console, first run this **read-only** lookup with that public ID:

```sql
BEGIN READ ONLY;
SELECT id, public_id, created_at FROM public.profile
WHERE public_id = '<exact-throwaway-public-id>';
ROLLBACK;
```

Require exactly one row, independently matched to the test identity. Then, only
if the owner deliberately authorizes test-profile deletion, substitute both
verified values and execute this **single-profile-row DELETE** in a transaction:

```sql
BEGIN;
DELETE FROM public.profile
WHERE id = <verified-neon-profile-id>
  AND public_id = '<exact-throwaway-public-id>'
RETURNING id, public_id;
```

Inspect the returned row: if it is exactly the intended test profile, issue
`COMMIT;` separately; otherwise issue `ROLLBACK;`. Never bulk-delete profiles.
The checked-in schema defines ON DELETE CASCADE from profile to attributes,
diets and medical history, so those dependent **test** rows also disappear.
Schema/route inspection is **verified locally**; these production SQL statements
were **not executed**. Shared diet/ICD reference rows are not deleted.
This does not delete the D1 login, KV session, or rate-limit rows. Log out and
do not reuse the test login (it can recreate a profile); full identity erasure
is a separate owner task, not a claim made by this cleanup.

## 7. Rollback the paired backend + database, then frontend — owner-only, not executed

Stop new writes and keep automatic deployments disabled. Stage the recorded old
`DATABASE_URL`, old `CAT_FILE` value/presence, and old `PYTHON_VERSION`
value/presence using **Save only**. Ensure the old certificate file
still exists. Then deploy the **previously recorded backend commit** with those
values in the same deploy. Do not merely change the URL under the new backend,
and do not deploy the old backend against the new database. Recheck the old
service using its own pre-cutover health behavior and logs. Use the specific-commit
flow above, not just **Restart service** (which retains the running configuration).
Render's artifact **Rollback** is a different mechanism and does not overwrite
the saved service configuration; do not substitute it without reconciling those
values. [Render rollback settings](https://render.com/docs/rollbacks).

For the Worker, from `frontend/`, use the recorded pre-cutover **version ID**:

```text
node node_modules/wrangler/bin/wrangler.js rollback <recorded-worker-version-id> --config wrangler.jsonc
```

Only `rollback --help` was **verified locally**. This command has no dry-run and
immediately creates a live deployment; review its interactive confirmation.
[Cloudflare rollback behavior](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/).
Alternatively the owner can build/deploy the recorded previous frontend commit
from a separate checkout with the same production bindings/secrets; do not reset
a dirty working tree. Rollback does not roll back D1/KV/database contents.

**Any profiles/onboarding edits written to Neon since cutover stay in Neon and
do not move back to CockroachDB.** Retain both databases and request a separate
reconciliation/migration slice if those writes matter. Record the failure window
and affected public IDs privately. Do not destroy Neon or silently discard data.

## 8. Cost and verification boundary

**Owner-only, not executed:** confirm the existing Render **Free**, Neon **Free**,
and Workers **Free** plans before deploying. This runbook creates no billable
resource and requires no new service/project/database/namespace, paid upgrade,
paid compute, or additional binding. Existing free-tier limits still apply;
do not enable paid plans or approve charges to bypass a limit. Free does not
mean unlimited: Render has bandwidth/build allowances, Neon has compute/storage
allowances, and Workers has request/CPU limits. If an account is already paid or
has chargeable overages, stop and review billing rather than promising zero cost.
[Render Free limits](https://render.com/docs/free),
[Neon plans](https://neon.com/docs/introduction/plans),
[Workers limits](https://developers.cloudflare.com/workers/platform/limits/).

| Runbook area | Evidence/status in slice 005 |
|---|---|
| Private env backups, old-data decision, chosen/pushed commits | **owner-only, not executed** |
| Neon production URL retrieval | **owner-only, not executed**; CLI flags/docs verified |
| Python 3.11.15 | **verified locally**: Linux dependency resolution + pinned server runtime; full Render install **owner-only, not executed** |
| Render paired deploy and live logs/SQL | **owner-only, not executed** |
| curl smoke and SQL | **verified locally** on fresh deleted child only: 11 diets / 13 tables / 0 profiles |
| Frontend build + both deploy dry-runs | **verified locally**, no upload |
| Live onboarding, cleanup, rollback, billing/account checks | **owner-only, not executed**; route/schema/rollback help inspected |

Local executor command logs, RED/GREEN, immutable-file hashes, serial gates and
exact branch-deletion proof: `.cockpit/20261013-neon/plans/005-executor.md` and
its local evidence directory. These local cockpit artifacts are not committed.
