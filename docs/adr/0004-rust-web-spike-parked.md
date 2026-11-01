---
status: accepted
date: 2026-11-01
---

# The Rust web spike is parked

In October 2026 a spike rebuilt the auth, API and Ask surfaces as a Rust (Topcoat) Wasm Worker to measure whether a compiled web layer would be worth the migration. It proved wire-compatible login and sessions locally and passed the same contract checks for the surfaces it covered, but no option was selected: the Next.js app in `frontend/` is the product, and the spike's open question (password-hash CPU cost inside the Workers CPU limit) has no answer that would change that today. The spike is kept in the private development repository and is not published here. Revisit only if Workers CPU limits or a measured Next.js cost force the question.
