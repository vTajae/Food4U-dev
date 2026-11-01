# Roadmap

Status as of 2026-10-31. "Done" means in the code with tests; "partial" names what is missing.

## Sprint 1: UI foundation (October 2026)

| # | Item | Status |
|---|---|---|
| 1 | Design system (`frontend/DESIGN.md`) | Done |
| 2 | Tailwind 4 with the tokens as CSS variables | Done |
| 3 | shadcn/ui migration with keyboard and accessibility checks | Partial: the nutrient table and a few components are still bespoke |
| 4 | Responsive results grid instead of hiding results on mobile | Done |
| 5 | One surface, button and background system across login, welcome and dashboard | Done |
| 6 | Motion limited to press states and step transitions, behind `prefers-reduced-motion` | Partial: CSS transitions only |
| 7 | Consistent empty states | Partial: one illustration style, not on every screen |

Also landed during Sprint 1: the port from Remix 2 on Cloudflare Pages to Next.js 16 on Workers ([ADR 0001](adr/0001-nextjs-on-cloudflare-workers.md)), the stable public id ([ADR 0002](adr/0002-stable-public-id.md)), Neon Postgres ([ADR 0003](adr/0003-neon-postgres.md)), the real-Chrome e2e gate and the post-deploy checks.

## Phases

| Phase | Goal | Status |
|---|---|---|
| 0 | Safety layer and context gate specified; nutrition data provider decided | Partial: [safety-design.md](safety-design.md) written; provider decision open (USDA FoodData Central and Spoonacular today) |
| 1 | Core recommendation behind the safety layer: intake, profile, safe text suggestions | Partial: identity, intake and persistence work; no rules engine; the AI path is not enabled in production |
| 2 | Feedback loop (accept, reject, rate) and personalization from history | Not started |
| 3 | Meal plans over days or weeks; consolidated grocery lists | Not started |
| 4 | Grocery fulfilment through provider adapters | Not started |
| 5 | Optional wearable and health-data connections | Not started |
| 6–7 | Prepared food and local restaurant menus | Not started |
| 8–9 | Alternative food networks; regionalization | Not started |

## Known defects

Open defects are GitHub issues carrying their `D018-*` ids, which match the `test.fixme` annotations in `frontend/e2e`.

## Not planned

Enabling AI suggestions in production before the safety layer exists.
