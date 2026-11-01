---
status: accepted
date: 2026-10-13
---

# Neon Postgres for the backend

The backend used CockroachDB with Cockroach-specific migrations. We moved profile storage to Neon Postgres: plain Postgres with asyncpg works with SQLAlchemy's defaults, the free tier is enough for now, and branches with a TTL give every local or test run its own disposable database, which removed the temptation to point local work at production. Pooled URLs serve app traffic; direct URLs serve migrations and the live-check cleanup.

## Consequences

- Login sessions are also moving from Workers KV to Neon (pull request in review), because KV's free tier allows about a thousand writes a day and every login is a write.
- Neon Free suspends compute at its monthly limit; anonymous traffic must never touch it, and the backend's health check does not open a database session.
- The old Cockroach migration is not run on Neon; a fresh database is built by startup `create_all`.
