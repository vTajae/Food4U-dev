---
version: alpha
name: Food4U Pantry Label
description: Design system for the Food4U web app, a dietary decision tool for people managing dietary restrictions and medical conditions, starting with Crohn's disease. Calm, hyperlegible, and built around one idea – every recommendation shows what it was checked against.
colors:
  primary: "#5B3A6E"
  primary-hover: "#4A2D5B"
  primary-soft: "#EFE8F3"
  on-primary: "#FFFFFF"
  ink: "#23202A"
  ink-muted: "#5E5868"
  background: "#F5F6F2"
  surface: "#FFFFFF"
  line: "#DEDDE3"
  line-strong: "#878191"
  focus: "#5B3A6E"
  fits: "#2D6A3E"
  fits-tint: "#E2F1E5"
  care: "#85570A"
  care-tint: "#FBF0D9"
  avoid: "#A3301F"
  avoid-tint: "#FCE6E1"
  dark-primary: "#C7A6DD"
  dark-primary-hover: "#D6BDE7"
  dark-primary-soft: "#33283D"
  dark-on-primary: "#23202A"
  dark-ink: "#F1EEF4"
  dark-ink-muted: "#B3ADBC"
  dark-background: "#17151B"
  dark-surface: "#211E26"
  dark-line: "#37323E"
  dark-line-strong: "#76707F"
  dark-fits: "#8FD3A0"
  dark-fits-tint: "#1E3325"
  dark-care: "#F0C36A"
  dark-care-tint: "#3A2E14"
  dark-avoid: "#F4A193"
  dark-avoid-tint: "#40211C"
typography:
  display-lg:
    fontFamily: Young Serif
    fontSize: 40px
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: -0.01em
  display-md:
    fontFamily: Young Serif
    fontSize: 28px
    fontWeight: 400
    lineHeight: 1.15
    letterSpacing: -0.005em
  title-md:
    fontFamily: Young Serif
    fontSize: 22px
    fontWeight: 400
    lineHeight: 1.2
  heading-sm:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 18px
    fontWeight: 700
    lineHeight: 1.3
  body-lg:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.55
  body-md:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.55
  body-sm:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  label-md:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 16px
    fontWeight: 700
    lineHeight: 1.2
  label-sm:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 14px
    fontWeight: 700
    lineHeight: 1.2
  data-md:
    fontFamily: Atkinson Hyperlegible Mono
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.4
    fontFeature: '"tnum" 1'
  data-caps:
    fontFamily: Atkinson Hyperlegible Mono
    fontSize: 12px
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: 0.08em
rounded:
  sm: 6px
  md: 10px
  lg: 16px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  2xl: 32px
  3xl: 48px
  gutter-mobile: 16px
  gutter-desktop: 32px
  reading-max: 640px
  page-max: 1120px
  tap-min: 44px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.md}"
    height: 48px
    padding: 20px
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.on-primary}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.md}"
    height: 48px
    padding: 20px
  button-tertiary:
    backgroundColor: "{colors.background}"
    textColor: "{colors.primary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.md}"
    height: 44px
    padding: 12px
  button-destructive:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.avoid}"
    typography: "{typography.label-md}"
    rounded: "{rounded.md}"
    height: 48px
    padding: 20px
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    height: 48px
    padding: 14px
  ask-box:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body-lg}"
    rounded: "{rounded.lg}"
    height: 56px
    padding: 16px
  chip-constraint:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
    height: 36px
    padding: 12px
  chip-suggestion:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
    height: 44px
    padding: 16px
  verdict-fits:
    backgroundColor: "{colors.fits-tint}"
    textColor: "{colors.fits}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
    height: 28px
    padding: 10px
  verdict-care:
    backgroundColor: "{colors.care-tint}"
    textColor: "{colors.care}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
    height: 28px
    padding: 10px
  verdict-avoid:
    backgroundColor: "{colors.avoid-tint}"
    textColor: "{colors.avoid}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
    height: 28px
    padding: 10px
  card-recommendation:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.lg}"
    padding: 20px
  card-title:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.title-md}"
  check-strip:
    backgroundColor: "{colors.background}"
    textColor: "{colors.ink-muted}"
    typography: "{typography.data-caps}"
    padding: 12px
  check-strip-value:
    backgroundColor: "{colors.background}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
  nutrient-table:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.data-md}"
  nav-bar:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.label-md}"
    height: 64px
  nav-item-active:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.md}"
  tab-bar-mobile:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-muted}"
    typography: "{typography.label-sm}"
    height: 64px
  stepper-progress:
    backgroundColor: "{colors.line}"
    textColor: "{colors.ink-muted}"
    typography: "{typography.data-caps}"
    height: 4px
  dialog:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: 24px
  toast:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: 14px
  skeleton:
    backgroundColor: "{colors.line}"
    rounded: "{rounded.sm}"
  disclaimer-footer:
    backgroundColor: "{colors.background}"
    textColor: "{colors.ink-muted}"
    typography: "{typography.body-sm}"
    padding: 24px
  control-border:
    backgroundColor: "{colors.line-strong}"
    size: 1px
  tear-line:
    backgroundColor: "{colors.line-strong}"
    height: 1px
  focus-ring:
    backgroundColor: "{colors.focus}"
    size: 2px
  page-dark:
    backgroundColor: "{colors.dark-background}"
    textColor: "{colors.dark-ink}"
  button-primary-dark:
    backgroundColor: "{colors.dark-primary}"
    textColor: "{colors.dark-on-primary}"
  button-primary-hover-dark:
    backgroundColor: "{colors.dark-primary-hover}"
    textColor: "{colors.dark-on-primary}"
  chip-constraint-dark:
    backgroundColor: "{colors.dark-primary-soft}"
    textColor: "{colors.dark-primary}"
  card-recommendation-dark:
    backgroundColor: "{colors.dark-surface}"
    textColor: "{colors.dark-ink}"
  divider-dark:
    backgroundColor: "{colors.dark-line}"
    height: 1px
  check-strip-dark:
    backgroundColor: "{colors.dark-background}"
    textColor: "{colors.dark-ink-muted}"
  tear-line-dark:
    backgroundColor: "{colors.dark-line-strong}"
    height: 1px
  verdict-fits-dark:
    backgroundColor: "{colors.dark-fits-tint}"
    textColor: "{colors.dark-fits}"
  verdict-care-dark:
    backgroundColor: "{colors.dark-care-tint}"
    textColor: "{colors.dark-care}"
  verdict-avoid-dark:
    backgroundColor: "{colors.dark-avoid-tint}"
    textColor: "{colors.dark-avoid}"
---

# Food4U Design System: "Pantry Label"

This file is the single source of truth for how the Food4U frontend looks, reads and moves. Coding agents and people both build against it. The front matter tokens are normative. The prose explains why they exist and how to apply them. If a screen needs something this file does not cover, extend this file first, then build.

## Overview

**Subject.** Food4U helps people with dietary restrictions and medical conditions decide what to eat. Its most demanding case is a person managing Crohn's disease, so the system is designed for that case, and everyone else (allergies, diabetes, religious or ethical diets) is served by the same rules. Someone asks in plain words ("something soft for dinner, I'm flaring"). Food4U is designed to answer with meals and recipes checked against that person's conditions, allergies, diet and budget; the check itself is still being built (`docs/safety-design.md`). Later phases add meal plans, grocery lists, carts and delivery. The product's core value is *decision compression*: hours of cross-checking become one answer you can trust.

**Audience and context.** The user is often tired, in pain or anxious, usually on a phone, sometimes late at night, and has been burned by generic advice before. They are not browsing for fun. Each screen has one job: **give a trustworthy answer fast, and show why it can be trusted.**

**Personality.** A knowledgeable, unhurried dietitian friend. Calm, specific, never alarmist, never cute about illness. The interface feels like a well-kept kitchen notebook, not a hospital portal and not a wellness lifestyle brand.

**Concept: "Pantry Label".** In this person's world, the label is what decides whether a food is safe: ingredients panels, nutrition facts, the pharmacy sticker that says how a medicine was dispensed. Food4U takes that object as its one visual idea. Everything else stays quiet so the label can carry the meaning.

**Signature element: the Check strip.** Every recommendation card ends with a strip that reads like a dispensing label. It sits on a dashed "tear line", is set in a monospace caps label, and lists exactly what the suggestion was checked against: `CHECKED AGAINST  Crohn's disease · Low residue · No dairy · Under $12`. It turns the planned safety validation into something the user can see, and renders only when a real verdict exists. It is the one place this system spends its boldness. Do not copy its styling anywhere else.

**What this replaced.** The 2024 hackathon UI had three unrelated visual languages: a cyan→blue gradient dashboard with white text, dark `gray-800` login inputs with a scaling green gradient button, and a plain `gray-50` onboarding page. It had no design tokens, no navigation and no ARIA. This system replaced all three.

## Colors

The palette is a cool, quiet base, one food-derived brand color, and three verdict colors kept strictly for meaning.

- **Aubergine (`primary` #5B3A6E):** the brand and the only color for interaction: primary buttons, links, focus rings, active navigation, selected chips. Aubergine is a food, it is calm, and its hue is far from green, amber and red, so an action can never be mistaken for a safety verdict. White text on it is about 9:1.
- **Aubergine hover (`primary-hover` #4A2D5B)** and **Aubergine wash (`primary-soft` #EFE8F3):** pressed and hover states, selected chips, the active nav item.
- **Ink (`ink` #23202A):** all body text and headings. A near-black with a slight plum tint so it sits with the brand color.
- **Ink muted (`ink-muted` #5E5868):** secondary text, captions, Check strip labels, helper text. Passes AA on both `surface` and `background`.
- **Rice (`background` #F5F6F2):** the page. A cool, slightly grey-green off-white, deliberately *not* a warm cream. It reads clean and grain-like without being clinical white.
- **Plate (`surface` #FFFFFF):** cards, inputs, dialogs, nav. Content sits on white "plates" on the rice background.
- **Line (`line` #DEDDE3):** decorative hairlines, such as card edges, dividers and table rules. It is deliberately faint (below 3:1) and must never be the only thing that shows where a control is.
- **Line strong (`line-strong` #878191):** borders on controls (inputs, the ask box, secondary buttons, unselected checkboxes) and the Check strip tear line. It meets the 3:1 non-text contrast minimum on both `surface` (3.8:1) and `background` (3.5:1), as WCAG 1.4.11 requires. The dark theme uses `dark-line-strong` #76707F.

### Verdict colors (semantic, never decorative)

These three pairs answer one question: *can I eat this right now?* They are used **only** for verdicts and verdict-related messages, never for buttons, illustrations or brand accents. Every use pairs the color with an icon and a word, so meaning never depends on color alone (color-vision deficiency, grayscale screens, glare).

| Verdict | Label copy | Text / icon | Tint | Icon (lucide) |
|---|---|---|---|---|
| Fits your plan | "Fits your plan" | Courgette `fits` #2D6A3E | `fits-tint` #E2F1E5 | `circle-check` |
| Eat with care | "Eat with care" | Turmeric `care` #85570A | `care-tint` #FBF0D9 | `circle-alert` |
| Avoid for now | "Avoid for now" | Paprika `avoid` #A3301F | `avoid-tint` #FCE6E1 | `circle-x` |

"Avoid **for now**" is intentional. Tolerance changes over time (for example between a Crohn's flare and remission), and the copy should not suggest a permanent ban.

`avoid` also serves as the error color for form validation and destructive actions. That is the one exception, because both mean "stop and look".

### Dark theme

Many users check Food4U in bed or at night. The `dark-*` tokens mirror the light set one to one. Aubergine becomes a light lilac (`dark-primary` #C7A6DD) with ink-colored text on it, and the verdict colors become lighter tones on deep tints. Follow `prefers-color-scheme` by default and allow a manual override. Dark mode is a token swap only. Never restyle a component for dark mode.

## Typography

Type is chosen for reading under strain first and character second.

- **Atkinson Hyperlegible Next**, the body and UI face. It was designed by the Braille Institute so that easily confused letterforms (I/l/1, O/0, rn/m) stay distinct. Food4U's users read ingredient lists while fatigued, sometimes medicated and often on small screens, so this choice matters for accessibility, not just taste. All running text, labels, buttons, inputs and navigation use it.
- **Young Serif**, the display face, used with restraint. It is a sturdy, soft-cornered serif with the warmth of a mid-century cookbook. It is used for screen titles and **meal and recipe names only**: the dish is the hero of every card, so it gets the cookbook voice. Never use it for UI labels, buttons, numbers or anything longer than two lines. It has a single weight, so hierarchy comes from size.
- **Atkinson Hyperlegible Mono**, the utility face, for data: nutrient tables, quantities, prices, the Check strip label. Use tabular figures so columns of numbers line up.

### Scale and rules
| Token | Use |
|---|---|
| `display-lg` 40px (32px under 640px) | One per screen: the page title ("What should I eat?", "Your meal plan") |
| `display-md` 28px | Meal name on a detail view; intake question titles on desktop |
| `title-md` 22px | Meal or recipe name on a recommendation card |
| `heading-sm` 18px bold | Section headings inside a screen ("Ingredients", "Nutrients") |
| `body-lg` 18px | Intake question text, the ask box, short explanations |
| `body-md` 16px | Default text |
| `body-sm` 14px | Helper text, captions, footer, toasts |
| `label-md` / `label-sm` | Buttons / chips, badges, tab-bar labels |
| `data-md` | Nutrient values, quantities, prices |
| `data-caps` | Check strip label, stepper "STEP 2 OF 5", table column headers |

- Text that users read or type is never smaller than 16px. Inputs are 16px or larger so iOS Safari does not zoom on focus.
- At most two weights per screen (400 and 700). No italics for emphasis. Use weight instead.
- Sentence case everywhere. Only `data-caps` is uppercase.
- Line length for prose is capped at `reading-max` (640px).

Load the fonts with `<link>` tags in `app/layout.tsx` from Google Fonts with `display=swap`, and preconnect to `fonts.gstatic.com`. Fallback stacks: `"Atkinson Hyperlegible Next", system-ui, sans-serif`, `"Young Serif", Georgia, serif` and `"Atkinson Hyperlegible Mono", ui-monospace, monospace`.

## Layout

**Mobile-first, one column, one job per screen.** The phone is the main device. Design at 360px wide first, then let the layout breathe at larger sizes. Do not add more on screen just because there is room.

- **Spacing:** 4px base scale (`xs` 4 → `3xl` 48). Use `lg` 16px inside components, `xl` 24px between a card and its neighbor, `2xl`–`3xl` 32–48px between screen sections. Gutters are 16px on mobile and 32px on desktop.
- **Widths:** content max `page-max` 1120px. Conversational and reading areas (the ask box, intake questions, recipe text) are capped at `reading-max` 640px and centered.
- **Tap targets:** at least `tap-min` 44×44px, including chip remove buttons and icon buttons.

### App shell
Every authenticated route renders inside one shell:

```
Desktop (≥1024px)                          Mobile (<1024px)
┌──────────────────────────────────────┐   ┌──────────────────────┐
│ Food4U   Ask  Meal plan  Groceries  ◉│   │ Food4U             ◉ │  ← nav-bar 64px
├──────────────────────────────────────┤   ├──────────────────────┤
│          ┌──────────────┐            │   │                      │
│          │ screen       │ ≤640 or    │   │ screen               │
│          │ content      │ ≤1120      │   │ content              │
│          └──────────────┘            │   │                      │
├──────────────────────────────────────┤   ├──────────────────────┤
│ disclaimer · privacy · support       │   │ Ask  Plan  Groceries │  ← tab-bar 64px
└──────────────────────────────────────┘   └──────────────────────┘
```
`◉` is the account menu (profile and health details, settings, **Sign out**). Destinations not yet built (Meal plan, Groceries) stay out of the nav until their phase ships. Never show dead links.

### Ask screen (dashboard)
```
What should I eat?                          ← display-lg
┌───────────────────────────────────────┐
│ Talk to me about food…            [→] │   ← ask-box
└───────────────────────────────────────┘
(Suggest a meal) (Find a recipe) (Which diets fit me?)   ← chip-suggestion row, scrolls horizontally on mobile
Your profile: (Crohn's disease) (No dairy) (Under $12)    ← chip-constraint, read-only here, links to profile

┌ Recommendation card ──────────────────┐
│ ● Fits your plan                      │
│ Congee with poached chicken           │   ← title-md
│ Soft, low-fibre rice porridge…        │
│ [Save] [See recipe]  [Not for me]     │
│┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄│   ← tear line
│ CHECKED AGAINST  Crohn's · Low residue│   ← check-strip (signature)
└───────────────────────────────────────┘
```
Results are one column on mobile and two columns at 1024px and up. **Every result is reachable.** Never hide results by breakpoint (the current `lg-hide-after-1` / `md-hide-after-2` utilities must be removed). If the list is long, show the first 6 with a "Show more" button.

### Intake (welcome)
One question per screen, with a progress bar and a `data-caps` "STEP 2 OF 5" label. The sequence is real, so numbering is appropriate here. Question in `body-lg` or `display-md`, answer control below, then **Back** (tertiary) and **Continue** (primary) pinned to the bottom of the viewport on mobile. Answers already given show as removable `chip-constraint`s.

## Elevation & Depth

Depth comes from **tonal layers, not shadows**: white plates (`surface`) on rice (`background`), separated by 1px `line` borders. Cards, inputs and nav are flat.

Shadows are kept for things that float above the page and block it:
- **Overlay** (dialog, popover, dropdown, toast): `0 8px 24px rgba(35, 32, 42, 0.12), 0 2px 6px rgba(35, 32, 42, 0.08)`. Dialogs also dim the page with `rgba(23, 21, 27, 0.4)`.
- Nothing else gets a shadow. In particular there are no hover lift effects on cards or buttons.

The mobile tab bar and the sticky intake footer separate from content with a 1px `line` top border, not a shadow.

## Shapes

Soft, but not bubbly.

- `rounded.md` 10px for buttons, inputs and nav items.
- `rounded.lg` 16px for cards, the ask box and dialogs.
- `rounded.full` for chips and verdict badges. A pill shape always means a tag, never a button.
- `rounded.sm` 6px for skeleton blocks and small inline elements.
- **The Check strip is the exception.** It spans the full card width and inherits only the card's bottom corners. Its top edge is a 1px **dashed** `line-strong` tear line. Dashed lines appear nowhere else in the system.

## Components

Build components on **shadcn/ui** (Radix primitives) so keyboard handling, focus trapping and ARIA come built in. Restyle them with these tokens. Do not bring in a component library's default look.

### Buttons
- **Primary** (`button-primary`): aubergine fill, white `label-md`, 48px tall. **At most one per view region** (one per card, one per form step). Examples: "Continue", "See recipe", "Save profile".
- **Secondary** (`button-secondary`): white fill, 1px `line-strong` border, aubergine text. Alternatives next to a primary, such as "Save".
- **Tertiary** (`button-tertiary`): no fill or border, aubergine text, underline on hover. Low-stakes actions: "Back", "Show more", "Not for me".
- **Destructive** (`button-destructive`): white fill, `avoid` text and border. Only for removing data ("Delete account", "Clear plan"), always behind a confirm dialog.
- States: hover darkens the fill (`primary-hover`) or tints the background (`primary-soft`). Pressed moves the button 1px down. Disabled is 40% opacity with `cursor: not-allowed`. Loading keeps the label, adds an inline spinner, and sets `aria-busy`. **Never** scale, translate up or glow on hover.
- Labels are verbs that say what happens: "Save meal", not "Submit". The resulting toast uses the same verb: "Meal saved".

### Ask box
The main input on the Ask screen: a `body-lg` textarea that grows to 4 lines, with a white plate, `line-strong` border and `rounded.lg` corners, and a primary icon button ("Ask", arrow icon, with an `aria-label`) inside on the right. Placeholder: "Talk to me about food…" (the product's existing voice). Enter submits and Shift+Enter adds a new line. Validation errors appear below in `avoid` with an icon, for example "Type a question to get suggestions."

### Chips
- **Suggestion chips** (`chip-suggestion`): one-tap prompts below the ask box. Copy: "Suggest a meal", "Find a recipe", "Which diets fit me?". White fill, `line` border.
- **Constraint chips** (`chip-constraint`): a user's conditions, allergies, diet and budget. Aubergine wash and text. When editable, they get a trailing × button (44px hit area, `aria-label="Remove dairy"`).

### Verdict badge
A pill with an icon and a label, using the `verdict-*` tokens, placed at the top of every recommendation. It is always visible and never only on hover. When the backend has no verdict, **show no badge**. Never default to "Fits your plan".

> **Data dependency:** the verdict and the Check strip need the Phase 1 deterministic safety-validation layer to return `verdict` (`fits` | `care` | `avoid`), `reason`, and `checkedAgainst: string[]` per recommendation. The current `SearchResultFood` schema has none of these. Until it does, render the card without the badge and the strip, never with placeholder data.

### Recommendation card (`card-recommendation`)
Order: verdict badge → meal name (`title-md`, Young Serif) → one-line reason in `body-md` `ink-muted`, for example "Soft and low in fibre; no dairy." → key facts row (`data-md`: time, cost, portion) → actions → Check strip.
- Ingredients and Nutrients are **disclosures** (Radix Collapsible / Accordion) with `heading-sm` triggers and chevrons. They are closed by default.
- An `avoid` card does not hide the meal. It explains why ("Contains seeds, which you marked as a trigger") and offers "Find a gentler swap" as the primary action.

### Check strip (signature)
The bottom band of a recommendation card (`check-strip`): rice background, a dashed `line-strong` top edge, 12px padding. Layout: a `data-caps` `ink-muted` label "CHECKED AGAINST", followed by the values in `body-sm` `ink`, separated by " · ". It wraps naturally and never truncates. The strip is plain text, not chips, so it reads as a statement rather than controls. On meal-plan and grocery items (Phases 3–4), use a compact one-line version. It appears nowhere else.

### Nutrient table (`nutrient-table`)
Two columns, nutrient and amount, with the amount right-aligned in `data-md` tabular figures and the unit attached ("12.4 g"). `data-caps` headers. 1px `line` row dividers, no zebra stripes. Highlight values relevant to the user's profile (for example fibre on a low-residue plan) in `heading-sm` weight with a short note, not with color.

### Form fields (`input`)
Label above the field (`label-sm`, `ink`). It is always visible, so never use the placeholder as the label. Fields are 48px tall on a white fill with a `line-strong` border. Focus shows a 2px `primary` border plus a 2px `focus` outline at 2px offset. Errors show an `avoid` border plus an icon and a message below that says how to fix it: "Enter an email address like name@example.com." Pickers for searchable lists (conditions via ICD-10, allergies, cuisines) use a shadcn `Command` combobox, with selections shown as constraint chips.

### Navigation
- **Top nav-bar:** white with a 1px bottom `line` border. The "Food4U" wordmark in Young Serif 22px (no emoji). Text links in `label-md`. The active item uses `primary-soft` fill with `primary` text and `aria-current="page"`. The account menu is a `DropdownMenu` that includes **Sign out**.
- **Mobile tab-bar:** 3–4 destinations with icon and `label-sm` label. The active one uses `primary` text, inactive ones `ink-muted`. Respect `env(safe-area-inset-bottom)`.

### Stepper (intake)
A 4px `line` track with a `primary` fill, plus the `data-caps` "STEP 2 OF 5" label. The fill animates its width over 200ms.

### Feedback & states
- **Loading:** skeleton blocks shaped like the coming content (`skeleton`: `line` fill with a gentle opacity pulse; static under reduced motion), plus a polite live-region message: "Finding meals that fit your plan…". No full-screen spinners and no splash screens.
- **Empty:** an invitation to act, for example "No suggestions yet. Ask a question or tap a suggestion above." Optionally add one small CC0 line illustration (Kitbitz style, single-color `ink-muted`). Never more than one per screen.
- **Errors:** say what happened and what to do, in the interface's voice, without apology: "Couldn't reach the food database. Check your connection and try again." Pair the message with a "Try again" button.
- **Toasts** (`toast`): ink background, bottom-center on mobile and bottom-right on desktop. They dismiss after 5s, pause on hover or focus, and are announced via `role="status"`.

### Dialog (`dialog`)
shadcn `Dialog`: white plate, `rounded.lg`, 24px padding, overlay shadow and dim. The title is in `heading-sm`. The primary action is on the right, the secondary or Cancel on the left. On phones, use a bottom `Sheet` instead.

### Disclaimer footer (`disclaimer-footer`)
On every authenticated screen, in `body-sm` `ink-muted`: "Food4U suggests food, not treatment. Check diet changes with your care team, especially during a flare." Followed by links to Privacy, How we use your health data, and Support.

## Do's and Don'ts

**Do**
- Do show *why* on every recommendation: the reason line plus the Check strip.
- Do pair every verdict color with an icon and a word.
- Do keep one primary button per region, and make its label say exactly what happens.
- Do keep all text 16px or larger for reading, and every tap target 44px or larger.
- Do show a visible focus state on every interactive element: a 2px aubergine outline at 2px offset, via `:focus-visible`.
- Do use motion only for feedback: 150–200ms, `ease-out`, opacity and small translations (≤4px) only. Under `prefers-reduced-motion: reduce`, remove the translations and pulses.
- Do write in sentence case, plain verbs, second person: "Your plan", "Save meal", "Avoid for now".
- Do test every screen at 360px, at 200% zoom, with keyboard only, and with VoiceOver or TalkBack.

**Don't**
- Don't use gradients, glassmorphism, glows, 3D icons, parallax or scroll-driven effects anywhere.
- Don't use green, amber or red for anything except verdicts (`avoid` red is also allowed for errors and destructive actions).
- Don't use Young Serif for UI controls, numbers, or text longer than two lines.
- Don't hide results, verdicts or reasons behind breakpoints or hover.
- Don't add splash screens or artificial delays (remove the 300ms "Welcome" screen on the dashboard).
- Don't use emoji as UI. The ❤️ in the current wordmark goes.
- Don't use alarmist or moralizing language about food ("bad", "dangerous", "cheat"). Say what to do instead.
- Don't use pill shapes for buttons, or button shapes for tags.
- Don't add a second animation library. Use CSS transitions, or the already-installed `@react-spring/web` where springs are truly needed.

## Implementation notes

These notes map the tokens onto the stack: Next.js 16 App Router on vinext (Vite 8) deployed to Cloudflare Workers, React 19, and Tailwind 4 through `@tailwindcss/vite`.

1. **Where the tokens live.** `app/globals.css`, in an `@theme static` block, so every token is a CSS variable even before a utility uses it. Colors are `--color-<token>` (`bg-primary`, `text-ink`, `border-line-strong`). Fonts are `--font-display` / `--font-body` / `--font-data` (`font-display`). Type levels are `--text-<level>`, each with its line-height, letter-spacing and weight attached (`text-display-lg`, `text-data-caps`). Layout widths are `--spacing-gutter-mobile` / `-gutter-desktop` / `-reading-max` / `-page-max` / `-tap-min` (`max-w-reading-max`, `min-h-tap-min`).
2. **Dark theme.** The `dark-*` values are not separate utilities. They overwrite the light `--color-*` variables under `@media (prefers-color-scheme: dark)` (unless `<html data-theme="light">`) and under `<html data-theme="dark">`. The `dark:` variant follows the same rule. Components only ever use the light token names.
3. **Spacing steps.** `spacing.xs`…`3xl` (4/8/12/16/24/32/48px) equal Tailwind's default 4px scale, so use the numeric utilities: xs=1, sm=2, md=3, lg=4, xl=6, 2xl=8, 3xl=12 (`p-4` is `spacing.lg`). They are not registered as `--spacing-xs`… because Tailwind would also apply those names to `max-w-sm/lg/2xl` and change existing layouts. Plain `--space-*` variables exist for hand-written CSS.
4. **Radius.** `rounded.sm/md/lg` are registered as `--radius-sm/md/lg` (6/10/16px), so `rounded-md` is the DESIGN.md radius. The older `--rounded-*` variables alias them for components written as `rounded-(--rounded-md)`.
5. **shadcn/ui:** map its variables to these tokens (`--primary` → `--color-primary`, `--background` → `--color-background`, `--card` → `--color-surface`, `--border` → `--color-line`, `--input` → `--color-line-strong`, `--ring` → `--color-focus`, `--destructive` → `--color-avoid`, `--radius` → `--rounded-md`).
6. **Retired (done in the Next.js port):** `.input-field`, `.btn-primary`, the welcome/dashboard fade keyframes, the `*-hide-after-*` utilities, every gradient, and the raw `gray-*` / `blue-*` / `green-*` / `red-*` classes. Only token classes remain in `app/` and `components/`.
7. **Fonts:** loaded from Google Fonts in `app/layout.tsx` (`Atkinson+Hyperlegible+Next:wght@400;700`, `Atkinson+Hyperlegible+Mono:wght@400;600`, `Young+Serif`). `body` uses `font-body` and the rice background; the dark theme follows the OS and the account menu's theme choice.
8. **Validate this file** after edits with `npx @google/design.md lint DESIGN.md`. It checks token references and WCAG contrast for every component's text/background pair.
