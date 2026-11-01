# Security

Food4U stores health-related profile data, so reports are handled privately and taken seriously.

## Reporting

Use GitHub's private vulnerability reporting on this repository ("Report a vulnerability" under the Security tab). Do not open a public issue for a security problem. Include the affected route or component, steps to reproduce, and the impact you see. Reports are acknowledged as soon as they are read.

## Scope

- The Cloudflare Worker (`frontend/`) and its D1 and KV data.
- The FastAPI backend (`backend/`) and its Neon database.
- The deploy and post-deploy scripts in `scripts/`.

Cloudflare, Render, Neon, USDA, NLM and Spoonacular run their own programs for their services.

## In place today

- Passwords are bcrypt hashes. Sessions are signed, HttpOnly, Secure, SameSite=Lax cookies.
- The backend accepts only requests carrying a JWT the Worker issues at login and attaches per request from that request's own session; the external food API routes and diet-type creation require it too.
- A per-user rate limit answers 429.
- Secrets live only in the platforms' secret stores; the repository holds `.example` files.
