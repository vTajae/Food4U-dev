-- Login sessions for the web app (Neon). The backend never reads this schema.
-- Apply as the database owner; see docs/deploy.md "Sessions in Neon". Idempotent.
CREATE SCHEMA IF NOT EXISTS web_session;

CREATE TABLE IF NOT EXISTS web_session.session (
  -- Hex SHA-256 of the opaque cookie id. The raw id is never stored.
  id_hash        text PRIMARY KEY CHECK (id_hash ~ '^[0-9a-f]{64}$'),
  -- The account's public id, for "sign out everywhere" and account deletion.
  user_public_id text,
  data           jsonb NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  expires_at     timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS session_expires_at_idx ON web_session.session (expires_at);
CREATE INDEX IF NOT EXISTS session_user_public_id_idx ON web_session.session (user_public_id)
  WHERE user_public_id IS NOT NULL;
