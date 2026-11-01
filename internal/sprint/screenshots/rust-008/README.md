# Slice 008 welcome visual comparison

The four `compare-*` files put the frozen Next.js baseline on the left and an
actual Rust `/welcome` capture on the right. Desktop: 1440x900/DPR1. Mobile:
390x844/DPR2. Captures are full-page; the mobile review extends below the viewport.

## Proven fixture

Real local D1 login, real `/welcome` navigation, keyboard-driven step changes and
selection through the actual Rust `/api/refs`. A strict loopback ClinicalTables-
shaped response supplies Lactose intolerance (`E73.9`) and Peanut allergy (empty
code). The clinical request carries no bearer. No Next.js preview route, synthetic
UI, real backend or NLM is involved. Steps 1–3 and price are skipped, matching the
baseline; step 4 shows the two selected answers, followed by the actual review.

## Inspection

All four side-by-side comparisons were opened and inspected. The reading width,
step/review spacing, card geometry, badge wrapping, headings, buttons and mobile
fixed controls closely match. All four captures have no horizontal overflow.

Visible differences are intentional or existing: the genuine fixture has a T
avatar instead of baseline Q; Profile is correctly marked active in desktop and
mobile navigation; data/step text uses the existing monospace fallback rather
than the unavailable baseline font. There are minor icon and text rasterization
variations. These are close visual matches, not pixel-identical claims.

`capture-report.json` records browser, viewports, dimensions and safety checks.
Regenerate with the root-owned WSL runner:

`node rust-app/tests/welcome-mock.mjs --fixtures --welcome-visual`
