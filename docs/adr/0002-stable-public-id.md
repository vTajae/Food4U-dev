---
status: accepted
date: 2026-10-10
---

# One stable public id across D1 and the backend

The frontend keyed users on D1's integer primary key and sent it to the backend as the JWT `user_id`, where profiles had their own integer ids; the two sequences collided and a user could read another user's profile. We now mint a UUID `public_id` in the Worker at registration, store it in D1, carry it in the JWT, and key `profile.public_id` on it in the backend. Login never depends on the backend, and the backend never trusts an integer identity: pre-existing integer claims map to `legacy-<n>` so old sessions keep working.

## Consequences

- `POST /profile` creates or returns the profile for the bearer's public id; the frontend calls it before onboarding so a missing profile is never a 500.
- The backend token is read from the current request's session, never from module state, so one Worker isolate cannot leak a token across users.
- Both migrations (`backend/migrations/0001_profile_public_id.sql`, `frontend/database/migrations/0001_user_public_id.sql`) must be applied before code that reads `public_id` is deployed.
