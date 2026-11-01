import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createServer, type Server } from "node:http";
import { registerHooks } from "node:module";
import type { AddressInfo } from "node:net";
import { after, before, beforeEach, test } from "node:test";
import { fileURLToPath } from "node:url";
import { startFakeNeon } from "../e2e/fake-neon.mjs";

// Real lib/session.ts against the real driver and a PGlite-backed Neon endpoint.
// Only the framework seams are replaced: the cookie jar and the Worker env.
const jar = new Map<string, { value: string; options?: Record<string, unknown> }>();
const env: Record<string, unknown> = {
  USER_SESSION_SECRET: "synthetic-session-secret-020-0123456789",
  SESSION_DATABASE_URL: "postgresql://food4u_web:synthetic@fake-neon.test/neondb",
};
Object.assign(globalThis, { sessionTestJar: jar, sessionTestEnv: env });
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "next/headers") return {
      url: "data:text/javascript,export async function cookies() { const jar = globalThis.sessionTestJar; return {"
        + " get: name => jar.has(name) ? { name, value: jar.get(name).value } : undefined,"
        + " set: (name, value, options) => { jar.set(name, { value, options }); },"
        + " delete: name => { jar.delete(name); } }; }",
      shortCircuit: true,
    };
    if (specifier === "cloudflare:workers") return {
      url: "data:text/javascript,export const env = globalThis.sessionTestEnv;",
      shortCircuit: true,
    };
    return nextResolve(specifier, context);
  },
});
const { commitSession, destroySession, getSession, startSession } = await import("../lib/session.ts");
hooks.deregister();

const migrations = ["0001_web_session.sql", "0002_web_session_grants.sql"]
  .map((file) => fileURLToPath(new URL(`../database/neon/${file}`, import.meta.url)));
const sha256 = (text: string) => createHash("sha256").update(text).digest("hex");
const auth = { username: "ada@food4u.test", id: 7, publicId: "11111111-1111-4111-8111-111111111111", role: "2", createdAt: 1, updatedAt: 2 };
let fake: Awaited<ReturnType<typeof startFakeNeon>>;
let server: Server;
let endpoint: string;
let sqlRequests = 0;

before(async () => {
  fake = await startFakeNeon(migrations);
  server = createServer((req, res) => { sqlRequests++; void fake.handle(req, res); });
  await new Promise<void>((ok) => server.listen(0, "127.0.0.1", ok));
  endpoint = `http://127.0.0.1:${(server.address() as AddressInfo).port}/sql`;
  env.NEON_FETCH_ENDPOINT = endpoint;
});
after(async () => {
  await new Promise((ok) => server.close(ok));
  await fake.close();
});
beforeEach(() => {
  jar.clear();
  env.NEON_FETCH_ENDPOINT = endpoint;
});

const cookieId = () => jar.get("__session")!.value.split(".")[0];
async function rows(idHash: string) {
  return (await fake.db.query<{ user_public_id: string | null }>(
    "SELECT user_public_id FROM web_session.session WHERE id_hash = $1", [idHash])).rows;
}

test("requests without a session cookie never touch the database", async () => {
  const before = sqlRequests;
  assert.deepEqual(await getSession(), { id: null, data: {} });
  assert.equal(sqlRequests, before);
});

test("tampered, truncated or malformed cookies are ignored without a database read", async () => {
  await commitSession({ id: null, data: { auth } });
  const valid = jar.get("__session")!.value;
  const [id, signature] = valid.split(".");
  const before = sqlRequests;
  for (const value of [
    `${id}.${signature.slice(0, -2)}${signature.at(-2) === "A" ? "B" : "A"}${signature.at(-1)}`,
    `${id}.${signature.slice(0, 10)}`,
    `${id}.!!!not-base64!!!`,
    `${crypto.randomUUID()}.${signature}`,
    id,
  ]) {
    jar.set("__session", { value });
    assert.deepEqual(await getSession(), { id: null, data: {} }, value);
  }
  assert.equal(sqlRequests, before);
  jar.set("__session", { value: valid });
  assert.deepEqual((await getSession()).data, { auth });
});

test("a new session is stored under the hash of its id and gets a hardened cookie", async () => {
  const session: { id: string | null; data: object } = { id: null, data: { auth, token: "jwt" } };
  await commitSession(session);
  const id = cookieId();
  assert.equal(session.id, id);
  assert.deepEqual(await rows(sha256(id)), [{ user_public_id: auth.publicId }]);
  assert.deepEqual((await fake.db.query("SELECT 1 FROM web_session.session WHERE id_hash = $1", [id])).rows, [], "raw id never stored");
  assert.deepEqual(jar.get("__session")!.options, { httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: 2592000 });
  assert.deepEqual(await getSession(), { id, data: { auth, token: "jwt" } });
});

test("signing in rotates the session: the pre-login cookie no longer reads anything", async () => {
  await commitSession({ id: null, data: { welcome: { isComplete: false } } });
  const preLogin = jar.get("__session")!.value;
  const preLoginId = cookieId();
  const started = await startSession({ welcome: { isComplete: false }, auth, token: "jwt" });
  assert.notEqual(started.id, preLoginId);
  assert.notEqual(jar.get("__session")!.value, preLogin);
  assert.deepEqual(await rows(sha256(preLoginId)), []);
  assert.deepEqual((await getSession()).data, { welcome: { isComplete: false }, auth, token: "jwt" });
  jar.set("__session", { value: preLogin });
  assert.equal((await getSession()).data.auth, undefined, "a fixated pre-login cookie never becomes signed in");
});

test("signing in purges expired sessions", async () => {
  for (let n = 0; n < 3; n++) {
    await fake.db.query(
      "INSERT INTO web_session.session (id_hash, data, expires_at) VALUES ($1, '{}', now() - interval '1 day')",
      [sha256(`expired-${n}-${Date.now()}`)]);
  }
  await startSession({ auth });
  const { rows: left } = await fake.db.query<{ n: number }>(
    "SELECT count(*)::int AS n FROM web_session.session WHERE expires_at <= now()");
  assert.deepEqual(left, [{ n: 0 }]);
});

test("a database outage surfaces as an error, never as signed out", async () => {
  await commitSession({ id: null, data: { auth } });
  env.NEON_FETCH_ENDPOINT = "http://127.0.0.1:9/sql";
  await assert.rejects(getSession());
});

test("signing out removes the record and clears the cookie", async () => {
  await commitSession({ id: null, data: { auth } });
  const id = cookieId();
  await destroySession();
  assert.equal(jar.has("__session"), false);
  assert.deepEqual(await rows(sha256(id)), []);
});

test("signing out still clears the cookie when the database is unreachable", async () => {
  await commitSession({ id: null, data: { auth } });
  env.NEON_FETCH_ENDPOINT = "http://127.0.0.1:9/sql";
  await destroySession();
  assert.equal(jar.has("__session"), false);
});
