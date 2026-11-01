# Food4U frontend

Next.js 16 (App Router) on [vinext](https://vinext.dev), deployed as a Cloudflare Worker with D1 and KV bindings.

## Develop

```bash
npm ci
cp .dev.vars.example .dev.vars   # dev-only placeholder secrets (ignored)
npm run d1:local-initialize      # local D1 user table; drops and recreates it
npm run typegen                  # worker-configuration.d.ts from wrangler.jsonc
npm run dev                      # http://localhost:3001
```

`wrangler.jsonc` holds the bindings and the non-secret `API_BASE_URL`. Secrets come from `.dev.vars` locally and `wrangler secret put` in production. Login works without a backend; onboarding and the dashboard call the FastAPI backend at `API_BASE_URL` and succeed only when `JWT_SECRET_KEY` equals that backend's `USER_JWT_SECRET_KEY`.

## Layout

```
app/            routes: (auth) login and register, (app) welcome and dashboard, privacy, api/*
components/     ui/ (shadcn), onboarding/, ask/, results/, shell/
lib/            session, auth, reference data
api/            backend client, schemas, D1 repositories
database/       basic.sql (local bootstrap) and migrations/ (applied to production by hand)
e2e/            Playwright suite; see e2e/README.md
tests/          node:test unit tests
scripts/e2e/    screenshot and login loops against a running server
```

`DESIGN.md` is the design system every screen follows.

## Check

```bash
npm run lint
npm run typecheck
npm test
npm run e2e        # real Chrome at desktop and mobile, fake backend; needs system Chrome
```

## Build and deploy

```bash
npm run build
npm run deploy     # vinext-cloudflare deploy; needs wrangler login or CLOUDFLARE_API_TOKEN
```

The D1 migration gate and the live check in the repository root `scripts/` wrap a production deploy; see `../docs/deploy.md`.
