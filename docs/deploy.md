# Deploy and verify

Run from the repository root. Production is the Worker `food4u-frontend` and the Render backend service; both read secrets from their platforms, never from the repository. Stop at any failed step.

Prerequisites: a reviewed merge with the local gates green, Node 22+, system Chrome, the `wrangler` and `neon` CLIs signed in, and the Render CLI for a manual backend deploy. Export `NEON_PROJECT_ID` and `RENDER_SERVICE_ID` for your environment.

## Order

1. **Merge to `main`.** Render auto-deploys the backend from `main` with root directory `backend`. Record the merge SHA.
2. **Confirm the backend** once Render reports the deploy:

   ```sh
   curl -m 90 https://food4u-qxcn.onrender.com/health    # {"status":"ok"}; a cold start can take a minute
   ```

   For a deliberate redeploy or rollback: `render deploys create "$RENDER_SERVICE_ID" --commit <sha> --wait --confirm`.
3. **Gate D1 before the Worker:**

   ```sh
   npm run check:d1
   ```

   Requires exit zero and a `D1_SCHEMA {...}` result with no missing migrations. Review pending SQL, then apply it from `frontend/` with `npx wrangler d1 migrations apply food4u-db --remote`. Never run `database/basic.sql` against production; it drops the user table.
4. **Build and deploy the Worker** from `frontend/`; each command must exit zero before the next:

   ```sh
   npm run build
   npm run deploy -- --dry-run
   npm run deploy
   ```

   Record the Worker version id (`npx wrangler versions list`) for rollback.
5. **Live check**, from the root:

   ```sh
   npm run check:live
   ```

   Registers a `livecheck-<stamp>@food4u.test` account in production, completes onboarding and a fresh login, and prints `LIVE_CHECK {...}`. Resolve the reported username to its `public_id` in D1.
6. **Clean up that account only**, then prove a repeat is a no-op:

   ```sh
   npm run cleanup:live -- --public-id <public-id>
   npm run cleanup:live -- --public-id <public-id>
   ```

   The guard refuses any username outside `^livecheck-\d+.*@food4u\.test$`. It deletes the Neon profile (cascading) before the D1 user and reports counts, never credentials. It needs `NEON_PROJECT_ID` (or `NEON_DIRECT_URL`) and the backend venv's `asyncpg`.

Accept the deployment only after steps 5 and 6 pass.

## Secrets

| Where | Names |
|---|---|
| Worker (`wrangler secret put`) | `USER_SESSION_SECRET`, `USER_COOKIE_SECRET`, `JWT_SECRET_KEY` |
| Render | `DATABASE_URL` (pooled Neon URL), `USER_JWT_SECRET_KEY` (equal to the Worker's `JWT_SECRET_KEY`), `USER_JWT_ALGORITHM=HS256`, optional `FDC_API_KEY` and `SPOONACULAR_API_KEY`, and the five AI variables listed in `backend/README.md` |

Rotate `JWT_SECRET_KEY` and `USER_JWT_SECRET_KEY` together; a mismatch signs everyone out of the backend.

## Rollback

- Worker: `npx wrangler rollback` to the recorded version, from `frontend/`. This does not undo D1, KV or Neon changes.
- Backend: `render deploys create` with the previous SHA.
- Database: migrations are applied by hand and are not reversed automatically; plan data preservation separately before reversing one.

## Free-tier notes

Render Free sleeps after 15 minutes idle; the first request can take about a minute, which the auth pages explain. No keep-warm ping is configured. Neon Free suspends compute at its monthly limit; the backend wakes it on cold start, and the Worker never queries Neon for anonymous traffic.
