import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { neon } from "@neondatabase/serverless";
import { createNeonSessionStore } from "../lib/session-store.ts";

// Real Neon, opt-in: NEON_SESSION_TEST_URL is the OWNER connection string of a
// THROWAWAY branch (never production). The role is set up exactly as production's
// is (docs/deploy.md): created with SQL, migrations applied by the owner, and the
// store then runs as food4u_web itself. Connection strings are never printed.
const ownerUrl = process.env.NEON_SESSION_TEST_URL;

test("real Neon branch: the store works as food4u_web, which can touch nothing else", {
  skip: ownerUrl ? false : "set NEON_SESSION_TEST_URL to a throwaway branch to run",
}, async () => {
  const owner = neon(ownerUrl!);
  const password = randomBytes(24).toString("base64url");
  const [{ exists }] = await owner.query("SELECT EXISTS (SELECT FROM pg_roles WHERE rolname = 'food4u_web') AS exists") as { exists: boolean }[];
  await owner.query(`${exists ? "ALTER" : "CREATE"} ROLE food4u_web WITH LOGIN PASSWORD '${password}'`);
  for (const file of ["0001_web_session.sql", "0002_web_session_grants.sql"]) {
    const text = await readFile(new URL(`../database/neon/${file}`, import.meta.url), "utf8");
    // One statement per HTTP query; these migrations contain no quoted semicolons.
    for (const statement of text.replace(/--.*$/gm, "").split(";").map((s) => s.trim()).filter(Boolean)) {
      await owner.query(statement);
    }
  }
  const roleUrl = new URL(ownerUrl!);
  roleUrl.username = "food4u_web";
  roleUrl.password = password;

  const store = createNeonSessionStore(roleUrl.href);
  const id = (n: number) => `${n}`.padStart(64, "0");
  const data = { auth: { username: "integration@food4u.test", id: 1, publicId: "integration", role: "2", createdAt: 1, updatedAt: 2 } };
  await store.write(id(1), data, { userPublicId: "integration", maxAgeSeconds: 3600 });
  assert.deepEqual(await store.read(id(1)), data);
  await store.rotate(id(1), id(2), data, { userPublicId: "integration", maxAgeSeconds: 3600 });
  assert.equal(await store.read(id(1)), null);
  assert.deepEqual(await store.read(id(2)), data);
  await store.write(id(3), data, { userPublicId: null, maxAgeSeconds: -1 });
  assert.equal(await store.read(id(3)), null);
  assert.ok(await store.purgeExpired(100) >= 1);
  await store.remove(id(2));
  assert.equal(await store.read(id(2)), null);

  const asRole = neon(roleUrl.href);
  await assert.rejects(asRole.query("SELECT 1 FROM public.profile LIMIT 1"), /permission denied/);
  await assert.rejects(asRole.query("CREATE TABLE web_session.extra (id int)"), /permission denied/);
});
