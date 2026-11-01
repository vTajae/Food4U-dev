# Deploy and verify Food4U

Run from the repository root unless a step says otherwise. This is an operator
runbook, not authorization to deploy: slices 015 and 016 add and exercise checks
but do **not** push or deploy. Keep the existing Render service, Neon production
branch, Worker, bindings, secrets, and free plans. Stop on any failed step.

Prerequisites: reviewed changes and passing local gates, installed root/frontend
dependencies, Node 22+, system Chrome, authenticated Wrangler and Neon CLIs, and
the Render CLI for deployment. Cleanup also needs `backend/.venv` with the
existing `asyncpg` dependency (or `PYTHON` pointing to that Python interpreter).
Record the current backend commit/deploy ID and
Worker version ID privately; preserve configuration for rollback. Do not put
passwords, tokens, or database URLs in command output or evidence.

## Ordered deployment

1. **Merge** the reviewed branch into `sprint1-nextjs` through the normal owner
   workflow. Record the full **merge SHA** available to Render, not the feature
   branch SHA. Render **autoDeploy is ON** for `sprint1-nextjs`, with rootDir
   `./backend` (OMC-verified configuration, 2026-10-17). A merge touching
   `backend/` deploys the backend automatically; do not trigger a duplicate deploy.
2. **Wait for the automatic backend deployment**, then verify the deployed SHA
   and startup logs. Use the following manual command **only for an intentional
   redeploy or reviewed rollback**, substituting the recorded value for `<sha>`:

   ```text
   render deploys create srv-crb5dm2j1k6c73cn8f40 --commit <sha> --wait --confirm
   ```

   `--wait` makes a failed deploy return non-zero; request acceptance alone is
   not deployment success. [Render CLI reference](https://render.com/docs/cli).
   Keep Render's Neon URL **pooled**; see the
   [cutover configuration and backend checks](../internal/runbooks/render-neon-cutover.md).
3. **Gate D1 before deploying the Worker**:

   ```text
   npm run check:d1
   ```

   Require exit zero and a successful `D1_SCHEMA {...}` result. Missing migrations
   must be resolved before continuing. To inspect and apply **genuinely unapplied**
   migrations, run these commands individually from `frontend/`, inspect each
   result, then return to the root and rerun `npm run check:d1`:

   ```text
   node node_modules/wrangler/bin/wrangler.js d1 migrations list food4u-db --remote --config wrangler.jsonc
   node node_modules/wrangler/bin/wrangler.js d1 migrations apply food4u-db --remote --config wrangler.jsonc
   ```

   Review the pending SQL before applying it. The binding's `migrations_dir`
   points to `database/migrations`; Wrangler tracks applied filenames in
   `d1_migrations`. A list command's successful exit does **not** mean the pending
   list is empty. The gate runs native `migrations list`, then queries tracked
   names as JSON and compares them with local migration filenames instead of
   parsing the display table. Do not initialize/reset production with
   `database/basic.sql`.
   [D1 migration configuration](https://developers.cloudflare.com/d1/reference/migrations/),
   [list/apply commands](https://developers.cloudflare.com/d1/wrangler-commands/#d1-migrations-list).

   **Known manual-application trap:** `0001_user_public_id.sql` was originally
   applied with `d1 execute --file`, outside migration tracking. If it appears
   pending while its changes already exist, **do not rerun its `ALTER TABLE`**.
   Stop and reconcile history once: prove `user.public_id` exists, prove
   `user_public_id_key` is a unique index on that column, verify the backfill has
   no missing public IDs, then record exactly that filename in Wrangler's
   migration table using the installed Wrangler schema. Capture before/after
   history and rerun the gate. Never mark an unverified migration as applied.
   History tracking is not a general schema-drift or migration-content audit.
4. **Build and deploy the frontend if changed**, only after D1 passes. From
   `frontend/`, run each command and check its exit status before the next:

   ```text
   npm run build
   npm run deploy -- --dry-run
   node node_modules/wrangler/bin/wrangler.js deploy --config dist/server/wrangler.json --dry-run
   npm run deploy
   ```

   The dry runs are not deployments. Preserve the existing production
   `cloudflare_db` / `cloudflare_KV` bindings and secrets. Record the serving
   Worker version and its source SHA. Never share generated secret-bearing build
   artifacts. Return to the repository root.
5. **Run the real-browser production check**:

   ```text
   npm run check:live
   ```

   Require exit zero and a passing `LIVE_CHECK {...}` result. The only production
   frontend URL is `https://food4u-frontend.qias-webdev.workers.dev`; keep that
   default Worker URL. Production frontend and backend URLs are the defaults;
   use `--frontend` / `--backend` only for a deliberately isolated local check.
   The check creates a
   `livecheck-<stamp>@food4u.test` account, exercises onboarding and fresh-login
   persistence, and keeps its password in memory. Retain the reported username.
   The preserved live-check output can have `public_id: null`; resolve the exact
   reported username to its stable public ID in D1. From `frontend/`:

   ```text
   node node_modules/wrangler/bin/wrangler.js d1 execute food4u-db --remote --config wrangler.jsonc --json --command "SELECT public_id FROM user WHERE username = '<username-from-live-check>';"
   ```

   Require exactly one matching row and retain its public ID, not D1's integer
   `user_id`. Return to the repository root. A failed live check is not deployment
   acceptance; if registration succeeded, recover that exact account's public ID
   before cleanup.
6. **Delete only that throwaway account**, then prove repeat cleanup is a no-op:

   ```text
   npm run cleanup:live -- --public-id <verified-public-id>
   npm run cleanup:live -- --public-id <verified-public-id>
   ```

   The guard requires the D1 username to match
   `^livecheck-\d+.*@food4u\.test$`; it deletes the Neon profile and its cascading
   dependent rows **before** the D1 login. It refuses other existing identities
   and reports counts rather than credentials. Already-absent identities are a
   no-op. On partial failure, retain the same public ID and diagnose/retry; never
   broaden the delete. This is not KV-session or rate-limit-data erasure.

   Cleanup obtains a **direct**, non-pooler URL privately at runtime with
   `neon connection-string production --project-id patient-cherry-72346680`, or
   accepts `NEON_DIRECT_URL` from a private environment. Do not print the command's
   raw output or put its password-bearing value in argv, git, or evidence.
   `--pooled` defaults to false.
   [Neon connection-string reference](https://neon.com/docs/cli/connection-string).

Accept the deployment only after the live check and cleanup succeed. Save the
SHAs, Worker version, sanitized check results, and cleanup counts. Final zero
counts for **all** production profiles/users are an expectation only for an
otherwise empty production database; never delete real users to obtain zero.

## Backend wake check and free-plan limits

For a fast, lightweight wake check instead of a database-backed route:

```text
curl -m 90 https://food4u-qxcn.onrender.com/health
```

Expect HTTP 200 and `{"status":"ok"}`. The endpoint and the exact `/health`
rate-limit middleware bypass open no database session. This is process health,
not database readiness. Cold startup still runs initialization, `create_all`,
and diet seeding: that startup sequence touches Neon once per cold start, as
accepted in slice 016 Addendum 1. Subsequent health requests do not touch Neon.

Render Free sleeps after 15 minutes without inbound traffic; the next request
can take about a minute to start it. The 90-second curl budget allows that cold
start, rather than promising an immediate response.
[Render free-service limits](https://render.com/docs/free#spinning-down-on-idle).

**No cron keep-warm is implemented.** A scheduled health ping is an owner-only
option: keeping this service running consumes the same 750 free instance hours
per workspace/calendar month shared with `iseem-back`. Sleeping services consume
none; exhausting the allowance suspends all free web services until next month.
Review both services' usage before approving any keep-warm schedule.
[Render instance-hour allowance](https://render.com/docs/free#free-instance-hours).

## Failure and rollback

Stop at a failed gate; do not publish a Worker requiring an unapplied migration.
For backend artifact/configuration rollback and the recorded Worker version,
follow [cutover section 7](../internal/runbooks/render-neon-cutover.md#7-rollback-the-paired-backend--database-then-frontend--owner-only-not-executed).
Use the existing incident's Render artifact rollback guidance rather than
assuming an old commit still builds. Worker rollback does **not** undo D1, KV,
or Neon changes. Database restore/reverse migration needs a separately reviewed
data-preservation plan; do not delete migration history or drop the public-ID
column to make older code run.

References checked 2026-10-17. D1 commands were checked against installed
Wrangler 4.149.0; its migration-list output is human-readable (no `--json`) and
it may create the tracking table when absent. Revalidate behavior after CLI
upgrades. This document is not a receipt for a new deployment.
