# Sprint 1, backlog items 1–2: report

_2026-10-10 · repo `G:\WebDev\Food4U\Food4U` · branch `sprint1-ui-foundation` (off `main` @ `22e710e`) · not pushed, no PR_

## What changed

The plan was copied to `docs/sprint/phase0-sprint1-plan.md` (byte-identical). The work is in 7 commits on the branch:

| Commit | Change |
|---|---|
| `8f921f8` | **Item 1.** Commit `frontend/DESIGN.md` ("Pantry Label" design system, Google DESIGN.md format). |
| `571492f` | Replace `focus:ring-opacity-50` with `/50` opacity modifiers in `app/tailwind.css`. The official upgrade tool crashes on `ring-opacity-*`. The output looks the same in Tailwind 3.4. |
| `af1a0b4` | **Item 2, upgrade.** Unedited output of `npx @tailwindcss/upgrade` (v4.3.3): `tailwindcss ^4.3.3`, empty `tailwind.config.ts` deleted, CSS moved to `@import 'tailwindcss'` / `@utility` plus a v3 border-color compatibility layer. It also made mechanical class renames in 8 components so they render as before (`outline-none`→`outline-hidden`, `bg-gradient-to-*`→`bg-linear-to-*`, `shadow-sm`→`shadow-xs`, `shadow`→`shadow-sm`, `rounded`→`rounded-sm`), and removed `autoprefixer`. |
| `4327bb3` | Switch to the **`@tailwindcss/vite`** plugin (first in `vite.config.ts`). `@tailwindcss/postcss` and `postcss.config.js` removed. Remix 2 + Cloudflare plugins are untouched. |
| `fce62d9` | Load the fonts: `links` export in `app/root.tsx` (preconnects plus one Google Fonts stylesheet for Atkinson Hyperlegible Next 400/700, Atkinson Hyperlegible Mono 400/600, Young Serif). Nothing uses them yet. |
| `1185f46` | **Item 2, tokens.** `@theme static` in `app/tailwind.css` with all DESIGN.md colors, the 3 font families, the 11 type levels (size + line-height + tracking + weight) and the layout widths. The dark theme swaps the same `--color-*` variables under `prefers-color-scheme: dark` (unless `data-theme="light"`) and under `data-theme="dark"`, and a matching `dark:` variant is defined. DESIGN.md implementation notes updated (the DESIGN.md linter still reports 0 errors and 0 warnings). |
| `a147c3d` | `@source not` for `DESIGN.md` and `README.md`. Tailwind 4 was compiling example class names from the docs into the app CSS. |

**One deliberate deviation in how tokens are registered.** DESIGN.md's spacing steps (`xs`…`3xl`) and radii (`sm/md/lg`) share names with Tailwind defaults that existing components still use. A first attempt that registered `--spacing-lg` turned `max-w-lg` (the login card) into 16px. So:
- Spacing steps map onto Tailwind's default 4px scale, which already matches DESIGN.md exactly (xs=1, sm=2, md=3, lg=4, xl=6, 2xl=8, 3xl=12). They are also exposed as plain `--space-*` variables.
- Radii are plain variables `--rounded-sm/md/lg/full`, used as `rounded-(--rounded-md)`. Move them into `@theme` as `--radius-*` when the legacy classes are retired (items 3/5).

**No component restyled.** I diffed the compiled CSS before and after the token commits. Every pre-existing rule and variable is unchanged, and only the new token variables are added. Root CSS went from 22.2 kB (gzip 4.4) on Tailwind 3.4 to 32.0 kB (gzip 6.4) on Tailwind 4. The increase comes from Tailwind 4's property and theme layers plus the `static` tokens.

## Check results (`frontend/`)

Baseline = `main` before any change (after `npm ci`). Final = branch HEAD.

| Check | Baseline | Final | New failures |
|---|---|---|---|
| `npm run typecheck` | ✗ 2 errors | ✗ the same 2 errors | **none** |
| `npm run lint` | ✗ 9 errors | ✗ 8 errors (same set) | **none** |
| `npm run build` | ✗ crash | ✗ same crash | **none** |
| build without the CF dev-proxy plugin (verification only, see below) | ✓ | ✓ | — |

**Pre-existing failures** (not touched, out of scope):
- typecheck: `api/repo/userRepository.ts(3,21)` cannot find `../../app/context`; `app/utils/clinicTables.ts(1,46)` `AutocompleteResult` undefined.
- lint: 8 errors in `api/repo/userRepository.ts`, `api/services/clinicalService.ts`, `app/routes/_auth.$.tsx`, `app/routes/_auth.api.clinicals.tsx` and `app/utils/clinicTables.ts` (unresolved import, `no-explicit-any`, unused vars). The 9th baseline error (`functions/[[path]].ts` cannot resolve `../build/server`) only appears when `build/` does not exist, so it depends on build order and is not a fix.
- **build:** `remix vite:build` crashes with `Received structured exception #0xe06d7363` / `Error: write EOF`. Cause, traced with a spawn hook: Remix's build starts a Vite server, so `cloudflareDevProxyVitePlugin` calls wrangler `getPlatformProxy()`, which starts miniflare's `workerd.exe` (from `wrangler@3.78.12`, workerd 1.20240925). That binary crashes on this machine even for `workerd.exe --version`. This is an environment problem with the 2024 wrangler/workerd on this Windows build, not a code change.

**How the build was verified anyway:** a temporary, uncommitted config (`vite.verify.config.ts`, deleted afterwards) imported the real `vite.config.ts` and dropped only the dev-proxy plugin. With it, the client and SSR builds succeed on both baseline and final. The server bundle contains the Google Fonts link, and the CSS contains the tokens and both dark-theme blocks. A standalone Tailwind compile confirmed the token utilities (`bg-primary`, `text-display-lg`, `font-data` with tabular figures, `rounded-(--rounded-md)`, `max-w-reading-max`, `dark:bg-surface`) generate as intended, and that `max-w-lg` still resolves to `--container-lg`.

## Blocked / needs a decision

1. **Local build/dev on this Windows machine.** `npm run build`, `npm run dev` and `wrangler pages dev` all start `workerd` and crash here, so nothing was run or seen in a browser. Cloudflare Pages builds on Linux and should be unaffected, but that is untested. Suggested follow-up (not done, outside items 1–2): upgrade `wrangler` to a current release (newer workerd) and re-test, or build in WSL.
2. **Visual check not done.** Because of (1), there are no screenshots. The CSS diff shows existing utilities are unchanged, which is the evidence that nothing was restyled.
3. **npm `allow-scripts` warnings.** npm 11 blocked install scripts for `esbuild` and `workerd`. The esbuild binaries were verified working; the workerd crash also happens when the binary is run directly, so the blocked script is not the cause.
4. **Git setup.** The repo still hits "dubious ownership"; I passed `safe.directory` per command and did not change global config. No git identity is configured, so commits use the repo's latest author (`Tajae Knox <61326464+vTajae@users.noreply.github.com>`) via `-c` with a Claude co-author trailer. Amend the author before pushing if that's wrong.
5. **Left as-is on purpose:** the `postcss` devDependency (no longer used directly), the v3 border-color compatibility layer, the legacy `.input-field` / `.btn-primary` / `*-hide-after-*` styles, and Tailwind's default `font-sans`. All of these belong to items 3–5.
