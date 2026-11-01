# UI takeaways from the two X posts, mapped to Food4U screens

_2026-10-10. Sources: `x-post-analysis.md` (Post A, @iamtanzil_ "25 vibe coding resources", 138k views; Post B, @himanshubuildss "If you're a designer, bookmark this", 80k views; both fetched with the `x-search` MCP on nobu, including threads, replies, video thumbnails and the 33 resolved links). This file is the actionable distillation. Each takeaway names the exact Food4U screen or component it changes, so the Next.js port can apply it directly._

The honest summary of both posts: they are link lists, mostly promoting a paid template library each (Jiro, Scrolltide). What is usable is not any single template but the **method** the better links share, plus a handful of specific patterns from the section galleries. Below, each takeaway has: source → rule → where it lands in Food4U.

## T1. Design system first, then generate against it
- **Source:** Refero Styles `DESIGN.md` files (A#4, B#5), DESIGN.md (A#7), replies on both posts complaining that prompt libraries alone produce "slop".
- **Rule:** every screen is built from `frontend/DESIGN.md` tokens, never from ad-hoc Tailwind colors. If a screen needs something the system lacks, extend DESIGN.md first.
- **Changes:** all four screens. Concretely: delete `.btn-primary`, `.input-field`, `bg-linear-to-*` gradients, every `gray-*`/`blue-*`/`green-*`/`red-*`/`cyan-*` class in `app/`. The login page that the user saw was still the old dark card because item 3 restyled only the controls, not the page.

## T2. One brand mark, one voice, on every screen
- **Source:** Navbar Gallery (B#2), Minimal Gallery (A#2): the memorable sites repeat one wordmark and one accent across every section.
- **Rule:** a single `<Brand>` component: Young Serif wordmark "Food4U" with a small aubergine mark (a pantry-label tag glyph), no emoji. It appears in the auth layout header, the app top bar and the mobile tab bar.
- **Changes:** new `components/brand.tsx`; used by `app/(auth)/layout.tsx` and `app/(app)/layout.tsx`. Removes the `Food❤️4U` heading on the dashboard.

## T3. Auth page is a two-pane "promise + form", not a floating card
- **Source:** Supahero hero sections (B#6) and Refero's health/fintech styles: strong left-side statement, calm form on the right; on phones the statement collapses to a short eyebrow above the form.
- **Rule:** desktop: left pane on rice background with the brand, a one-line promise in `display-lg` ("Know what you can eat tonight."), and a three-item list of what Food4U checks against (the Check-strip idea, used as marketing copy). Right pane: white plate, Tabs (Login/Register), form. Mobile: brand + one-line promise, then the form; no second pane.
- **Changes:** `app/(auth)/layout.tsx` + `app/(auth)/login/page.tsx`. Replaces the Remix `_auth.login.tsx` wrapper.

## T4. Buttons have exactly one hierarchy
- **Source:** CTA.gallery (B#4): the convincing CTAs have one filled button per region and quiet secondaries.
- **Rule:** per region at most one `Button` default (aubergine), alternatives are `secondary`, low-stakes are `tertiary`. No red/green/blue buttons anywhere; semantic colors are reserved for verdicts.
- **Changes:** dashboard `ActionButton` (3 red buttons → 3 suggestion **chips**, `chip-suggestion`), result-card buttons (already secondary), welcome stepper (Back tertiary, Continue primary), login/register (one primary each).

## T5. App shell: top bar on desktop, tab bar on mobile, account menu with sign-out
- **Source:** Navbar Gallery (B#2) app-style navbars; the gap found in the audit (no nav, no sign-out at all).
- **Rule:** DESIGN.md › App shell. Top bar 64px: brand, destinations (Ask, Profile), account menu (DropdownMenu) with **Sign out**. Mobile: bottom tab bar 64px with safe-area inset. Destinations not built yet (Meal plan, Groceries) are not shown.
- **Changes:** new `app/(app)/layout.tsx`, `components/shell/top-bar.tsx`, `components/shell/tab-bar.tsx`, `components/shell/account-menu.tsx`; new `POST /api/auth/logout` (destroys the KV session). Disclaimer footer (T9) lives here too.

## T6. Onboarding is a real stepper with progress, one question per screen
- **Source:** Component Gallery (A#5) stepper patterns; Kinetics/MicroKit (A#10/#18) "motion as feedback" for step transitions.
- **Rule:** `data-caps` "STEP 2 OF 5", a 4px progress track with aubergine fill (animated width, 200ms, none under reduced motion), question in `body-lg`, answer control, chips for chosen answers, Back/Continue pinned to the bottom on mobile. Review step lists answers as constraint chips grouped by question.
- **Changes:** `app/(app)/welcome/page.tsx` + `components/onboarding/stepper.tsx` wrapping the existing `FormProvider`/`QuestionComponent` logic (localStorage persistence and the `/welcome` submission kept).

## T7. The dashboard is an "ask" surface: question box, suggestion chips, your-profile chips, then results
- **Source:** VibePrompt dashboard prompts (A#8) and the Minimal Gallery references all put one primary input in the reading column with everything else quiet; the posts' "hero is a thesis" idea.
- **Rule:** DESIGN.md › Ask screen. `display-lg` "What should I eat?", the `ask-box` (textarea, grows to 4 lines, Enter submits, inline arrow button), suggestion chips row (horizontal scroll on mobile), "Your profile" constraint chips linking to the profile, then results in one column (two at ≥1024px). Everything in the 640px reading column except the results grid (1120px).
- **Changes:** `app/(app)/dashboard/page.tsx`, new `components/ask/ask-box.tsx`, `components/ask/suggestion-chips.tsx`. Replaces the cyan→blue gradient page, the "Welcome" splash, `SearchBar` and `ActionButton`.

## T8. Recommendation cards show *why*; verdict and Check strip appear only with real data
- **Source:** Component Gallery card patterns; DESIGN.md's signature element; the user's explicit instruction that placeholders must hide when data is missing.
- **Rule:** `card-recommendation`: verdict badge (only if `verdict` present) → meal name (display face) → one-line reason (only if present) → facts row → disclosures (Ingredients, Nutrients) → Check strip (only if `checkedAgainst` non-empty). The USDA `SearchResultFood` shape has none of these three fields today, so cards render without badge/strip, never with fake values. The component accepts optional `verdict`, `reason`, `checkedAgainst` props so Phase 1 can turn them on without a redesign.
- **Changes:** `components/results/recommendation-card.tsx` (replaces `display.tsx`'s `RenderResultItem`), `components/results/verdict-badge.tsx`, `components/results/check-strip.tsx`.

## T9. Empty, loading and error states are designed, not defaulted
- **Source:** Kitbitz illustrations (A#23) for empty states; skeletons over spinners (A#21 critique); toasts for transient messages.
- **Rule:** loading = 3 skeleton cards + polite status text; empty = "No suggestions yet. Ask a question or tap a suggestion above." with one small single-color line illustration (inline SVG, `ink-muted`, no asset library); errors = Sonner toast with a "Try again". Disclaimer footer on every authenticated screen: "Food4U suggests food, not treatment…" + Privacy / How we use your health data / Support links.
- **Changes:** `components/results/results-skeleton.tsx`, `components/results/empty-state.tsx`, `components/shell/disclaimer-footer.tsx`.

## T10. Dark mode is a token swap, so it must be on everywhere
- **Source:** Refero DESIGN.md convention of paired light/dark tokens; the audience (checking the app in bed, during a flare).
- **Rule:** `data-theme` is no longer pinned to light. The root follows `prefers-color-scheme`; a `ThemeToggle` in the account menu sets `data-theme` and persists it in localStorage (guarded, per-viewer convenience). All screens use only token classes, so the swap is complete.
- **Changes:** `app/layout.tsx` (remove `data-theme="light"`, add a no-flash inline script that applies the stored choice before paint), `components/shell/theme-toggle.tsx`.

## T11. Motion only as feedback, never as decoration
- **Source:** Kinetics (A#10), MicroKit (A#18), and the replies mocking parallax-heavy templates (B).
- **Rule:** 150–200ms ease-out color/opacity transitions on controls, the stepper fill, dialog/popover enter/exit (already via tw-animate), toast slide. Nothing on scroll, no hover scale, no page-load choreography. `prefers-reduced-motion` removes all of it. The `.welcome-screen`/`.dashboard-content` fade keyframes are deleted.
- **Changes:** `tailwind.css` cleanup; stepper; nothing else added.

## What was deliberately not taken from the posts
Liquid glass, gradient buttons, CSS text effects, 3D icons, Aceternity/Magic UI blocks, Scrolltide/Jiro templates, Anime.js, parallax. Reasons are in `x-post-analysis.md` §4 and §5.4: readability, contrast, bundle weight, and a clinical product's need for trust over spectacle.

## Screen-by-screen checklist (used as the acceptance list for the port)
| Screen | Must show | Must not show |
|---|---|---|
| `/login` | two-pane auth (T3), brand (T2), Tabs, one primary button (T4), inline errors with icon, dark mode (T10) | dark gradient card, blue buttons, centered floating card on desktop |
| `/welcome` | stepper with progress + step label (T6), question in reading column, chips, Back/Continue hierarchy, review as chips | grey `bg-gray-50` page, blue/green buttons |
| `/dashboard` | app shell (T5), ask box + suggestion chips + profile chips (T7), skeletons/empty state (T9), recommendation cards with hidden placeholders (T8), disclaimer footer | gradient background, "Welcome" splash, red action buttons, hidden results on mobile (`*-hide-after-*`) |
| all | account menu with Sign out (T5), theme toggle (T10), 16px+ text, 44px targets, visible focus | emoji wordmark, any legacy `.btn-primary`/`.input-field` |
