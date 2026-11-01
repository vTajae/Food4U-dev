# Food4U: Phase 0 and Sprint 1 Plan

_Drafted 2026-10-10. Sources: `docs/Food4U Webapp Upgrade Plan.md` (the blueprint), a read-only survey of `Food4U/` (the 2024 hackathon MVP), and `docs/sprint/x-post-analysis.md` (OMC's review of the @iamtanzil_ resource list via x-search on nobu)._

## 1. Where things stand

The upgrade plan is a design document. No phase of it has started in code. The repo is still the hackathon MVP:

| Area | Today (MVP) | Upgrade plan target | Call |
|---|---|---|---|
| Frontend | Remix 2 on Cloudflare Pages, D1 + KV, Tailwind 3 with an empty theme, no component library, no ARIA | Consultation UI with trade-off tiers and explainability | **Keep the stack, rebuild the UI layer** (Sprint 1) |
| Backend | FastAPI, repo→service→route layers, CockroachDB, Qdrant, LlamaIndex + Gemini | Same shape plus orchestration pipeline | **Keep** |
| Nutrition data | USDA FoodData Central + Spoonacular | Edamam primary, USDA fallback, Postgres cache | **Decide in Phase 0** (see 2.2) |
| Clinical codes | ICD-10-CM via NLM Clinical Tables | Phenotype-level intake (ileal/colonic, strictures, flare) | **Extend** |
| Safety | LLM output reaches the user directly | Deterministic rules engine vetoes unsafe candidates | **Build** (most important gap) |
| Context gate | None | Context Completeness Score drives the interview | **Build** |
| Commerce / wearables / delivery | None | Instacart, Walmart, Vital, DoorDash, Uber Direct | Later phases, out of scope now |

## 2. Phase 0 deliverables (decisions before Phase 1 code)

### 2.1 Safety validation layer design
- Diet protocols as data: CDED phase 1/2, low-residue, low-FODMAP, SCD, Mediterranean, semi-vegetarian, each with `exclude`, `require` (CDED mandatory foods), and `limit` rules.
- Pipeline: LLM candidate → ingredient tokenization/normalization → rules engine (pure, deterministic, unit tested) → nutrition check → veto or pass with reasons.
- Output: every pass and veto carries machine-readable reasons, which feed the Explainability Layer and the UI's safe/caution/avoid flags.
- Data typing: every field is tagged `user_fact`, `external_fact`, or `inference`; an inference never becomes a fact without a confirmation step.

### 2.2 Nutrition provider decision
Spoonacular is already integrated and cheap ($29–$149/mo) but its point quotas deplete fast. Edamam has the better NLP and allergen labeling the safety layer wants, but costs more for persistent caching ($299/mo Scale tier). **Recommendation:** keep USDA as ground truth for single ingredients, prototype the safety layer against USDA + Spoonacular first, and only buy Edamam once the rules engine shows where Spoonacular falls short. Note: the plan's Edamam pricing sentence (line 98) is garbled and should be fixed.

### 2.3 Context Completeness Gate spec
Define the variable checklist per intent (condition phenotype, flare status, strictures, weight goal, budget, household size, cooking ability), a weighted score, the threshold (plan suggests ~91%), and the question generator that targets the highest-weight missing variable.

### 2.4 Housekeeping
- The repo triggers git "dubious ownership" on the G: drive; add a `safe.directory` entry when convenient.
- Root `package.json` scripts assume a POSIX venv (`. env/bin/activate`); fix for Windows dev or document WSL.

## 3. Sprint 1: UI modernization

Goal: one coherent, accessible, calm visual system that the Phase 1 consultation UI can be built on. The main takeaway from the X post review: **write the design system first, then let agents generate against it.** Decorative trends (glass, gradients, heavy animation) are out for a clinical product.

### Decision: Tailwind v4
Upgrade Tailwind 3 → 4 as the first task. The theme is empty today so migration cost is low, and current shadcn/ui targets v4. (The alternative is pinning a v3-compatible shadcn release.)

### Backlog, in order
1. **`frontend/DESIGN.md`**: palette (one calm primary plus semantic safe/caution/avoid), type scale, spacing, radius, component rules. Seed it from 1–2 health or fintech references on Refero Styles / designmd.ai and a short Minimal Gallery mood board.
2. **Tokens**: Tailwind v4 upgrade; DESIGN.md values become CSS-variable theme tokens.
3. **shadcn/ui init** (Remix + Vite), then migrate, starting with components that have no accessibility today:
   - `components/form/modal.tsx` → Dialog
   - login/register toggle in `_auth.login.tsx` → Tabs
   - allergy/condition autocomplete (`refSearchwButton.tsx`, `questionBase.tsx`) → Command + Popover combobox
   - allergen chips → Badge; result cards → Card; nutrients → Table
   - forms → shadcn Form (already react-hook-form + zod)
   - spinner → Skeleton cards; fetcher messages → Sonner toasts
4. **Results**: remove the `*-hide-after-*` utilities that hide every result after the first on mobile; use a responsive grid with all results or an explicit "Show more".
5. **Unify screens**: login, welcome and dashboard share one background, surface and button system. Remove the cyan→blue gradient, the gradient `.btn-primary`, its hover scale, and the forced 300 ms "Welcome" splash.
6. **Motion, used narrowly**: use the already installed `@react-spring/web` (with Kinetics as reference) for press states and step transitions only, behind `prefers-reduced-motion`. No second animation library.
7. **Empty states**: one consistent CC0 illustration style (Kitbitz) for no results, empty plan, and empty list.

### Definition of done
- One visual language across all routes; `DESIGN.md` matches the tokens.
- All interactive components keyboard-operable with correct roles (eslint `jsx-a11y` clean).
- `npm run typecheck`, `lint`, `build` pass; screenshots of each route at mobile and desktop widths.

### Backlog for later phases (from the post)
- mapcn (MapLibre + shadcn) for delivery tracking and local restaurants in Phases 6–7.
- 21st.dev / UIAble blocks to speed up dashboard and settings shells, checked against DESIGN.md.

### Explicitly out
Liquid Glass, CSS text effects, gradient buttons, 3D icons, Aceternity/Magic UI, Uiverse snippets, Anime.js, AppShot, Jiro premium templates. Reasons are in `x-post-analysis.md` section 4.

## 4. Suggested order
Sprint 1 (UI foundation) and the Phase 0 design work can run in parallel because they touch different layers. Phase 1 (safety MVP) then builds its intake and recommendation screens on the new components.
