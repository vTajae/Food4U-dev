-- D1 migration for existing databases (basic.sql already includes the column).
-- Apply from frontend/: npx wrangler d1 migrations apply food4u-db --remote
-- Pair with backend/migrations/0001_profile_public_id.sql: both backfill the same
-- 'legacy-<id>' value for the same integer, so existing users keep their profile.
ALTER TABLE user ADD COLUMN public_id TEXT;
UPDATE user SET public_id = 'legacy-' || user_id WHERE public_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS user_public_id_key ON user (public_id);
