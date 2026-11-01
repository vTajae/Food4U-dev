-- Least privilege for the Worker's database role, food4u_web. Safe to re-run.
-- The role is created with SQL (never the Neon console/CLI, whose roles join
-- neon_superuser) and its password never appears in this repository; see
-- docs/deploy.md "Sessions in Neon".
GRANT USAGE ON SCHEMA web_session TO food4u_web;
GRANT SELECT, INSERT, UPDATE, DELETE ON web_session.session TO food4u_web;
