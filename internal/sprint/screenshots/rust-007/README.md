# Slice 007 actual Rust visual proof

Reproduce in WSL with the retained isolated D1/KV state:

```
node rust-app/tests/dashboard-mock.mjs --fixtures --dashboard-tests --dashboard-browser --dashboard-visual
```

Windows Chrome155 uses installed Playwright, an external-deny proxy and verified
redirect canaries. All app upstreams are the owned loopback mock. Capture sizes:
desktop1440x900 DPR1; mobile390x844 DPR2. Fourteen actual captures and fourteen
baseline-left/Rust-right comparisons are committed. No production backend/NLM,
synthetic preview route, generated image or replacement auth response is used.

## Root visual review

All fourteen comparisons were personally opened. Dark login geometry/colors and
most Ask/chip/card/skeleton typography are close to the source. Initial review
identified textarea baseline spacing and missing validation icon; those were
corrected and the proof recaptured. No horizontal document overflow was observed.

Visible differences are intentional or disclosed, not hidden as pixel parity:

-05: baseline desktop is failed login and mobile is pending login. Rust proves
 actual successful D1 login and mock-profile dashboard, so these states differ.
-07/08: baseline's deleted dev-preview used Q/qa@food4u.test. The real fixture uses
 T and a longer random local username, yielding a wider/truncated account menu.
 Rust marks Ask active; the preview did not. Keyboard focus has a visible outline.
-09: the deleted preview displayed cards, skeletons and empty state simultaneously.
 Rust captures actual cards, loading and no-match states separately, including the
 live Ask controls. Heights and composition therefore differ substantially.
-09: preview-only safety verdict/reason/check strip are absent from live legacy
 AskScreen props. Rust also invents none. Food text is reconstructed local fixture
 data, not a medical recommendation; hidden salmon details are local sample data.
 Data caps/nutrient figures fall back to system monospace (no local Mono font).
 Small icon-stroke, focus and font-rendering differences remain; not pixel-exact.

The mobile full-page captures include the fixed tab bar at the original viewport
position, matching the baseline capture technique; scrollable content is not
removed. Screenshots prove local presentation, not production health/provider
availability, medical safety validation, VoiceOver/TalkBack, or global KV behavior.
