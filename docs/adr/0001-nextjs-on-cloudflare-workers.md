---
status: accepted
date: 2026-10-10
---

# Next.js 16 on Cloudflare Workers via vinext

The hackathon app was Remix 2 on Cloudflare Pages with no component library and no accessibility work. Sprint 1 needed the App Router model and current shadcn/ui, while keeping D1, KV and the Workers free tier. We chose Next.js 16 running on vinext (a Vite-based Next.js runtime for Workers) and rebuilt every screen against `frontend/DESIGN.md`. A React Router 7 migration was started first and stopped once the direction changed; it is not in this repository.

## Consequences

- The build is Vite-based: `npm run build` produces `dist/server/wrangler.json`, which `npm run deploy` publishes. `next-env.d.ts` is generated and excluded from lint.
- vinext is young. Framework behavior that differs from stock Next.js is pinned by the e2e gate rather than assumed; the one known case (RSC stream cancellation on fast navigation) is documented in `frontend/e2e/README.md`.
