# Slice005 auth visual QA

Each `compare-*` PNG contains the existing Next.js baseline on the left and the
actual Rust/Topcoat screenshot on the right, with a32px header. Originals are
`rust-*` PNGs. Baselines remain unchanged in `../nextjs/after/`.

- Desktop1440x900, DPR1; mobile390x844, DPR2 (PNG780px wide).
- Login -> invalid email `not-an-email` / password `123` -> Create account tab.
- Real Windows Chrome155.0.8059.39 against WSL local workerd.
- Six captures, six deterministic browser-composed comparisons; no generated UI.
- Local-only deny proxy; Render requests0, page errors0,67 behavioral checks.
- Both design fonts loaded from same-origin bundled assets, not remote services.

Root and independent reviewer opened all six comparisons. Layout, typography,
colours and wrapping closely match; not pixel-identical. Rust adds a purple
focus-visible outline around the invalid email field; small border/spacing
rasterization differences remain. Mobile error/register captures reproduce the
baseline's reduced promise-panel layout. No clipping or horizontal overflow found.

Reproduce from WSL repo root with the pinned PATH/CARGO_TARGET_DIR:
`node contract/local-rust.mjs --fixtures --visual`.
Full checks: add `--checks --contract`. JSON/browser evidence is ignored under
`rust-app/.evidence/005-visual.json`; contract logs under `contract/.evidence/`.