import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { startFakeNeon } from "../e2e/fake-neon.mjs";
import {
  createKvSessionStore,
  createNeonSessionStore,
  sessionStoreFor,
  type SessionStore,
} from "../lib/session-store.ts";

// The Neon adapter runs through the real @neondatabase/serverless driver against
// a local Neon HTTP endpoint backed by PGlite, with the real migrations applied.
const migrations = ["0001_web_session.sql", "0002_web_session_grants.sql"]
  .map((file) => fileURLToPath(new URL(`../database/neon/${file}`, import.meta.url)));
const url = "postgresql://food4u_web:synthetic@fake-neon.test/neondb";
const hash = (n: number) => n.toString(16).padStart(64, "0");
const session = (n: number) => ({
  auth: { username: `user-${n}@food4u.test`, id: n, publicId: `public-${n}`, role: "2", createdAt: 1, updatedAt: 2 },
  welcome: { isComplete: n % 2 === 0 },
  token: `jwt-${n}-ü`,
});
const live = (n: number) => ({ userPublicId: `public-${n}`, maxAgeSeconds: 3600 });
const expired = { userPublicId: null, maxAgeSeconds: -1 };

let fake: Awaited<ReturnType<typeof startFakeNeon>>;
let server: Server;
let endpoint: string;
before(async () => {
  fake = await startFakeNeon(migrations);
  server = createServer((req, res) => void fake.handle(req, res));
  await new Promise<void>((ok) => server.listen(0, "127.0.0.1", ok));
  endpoint = `http://127.0.0.1:${(server.address() as AddressInfo).port}/sql`;
});
after(async () => {
  await new Promise((ok) => server.close(ok));
  await fake.close();
});

function memoryKv() {
  const values = new Map<string, { value: string; expires: number }>();
  return {
    async get(key: string) {
      const entry = values.get(key);
      return entry && entry.expires > Date.now() ? JSON.parse(entry.value) : null;
    },
    async put(key: string, value: string, { expirationTtl }: { expirationTtl: number }) {
      values.set(key, { value, expires: Date.now() + expirationTtl * 1000 });
    },
    async delete(key: string) {
      values.delete(key);
    },
  } as unknown as KVNamespace;
}

// The same behavior is required of every adapter.
for (const [name, make] of [
  ["Neon", () => createNeonSessionStore(url, endpoint)],
  ["KV", (() => { const kv = memoryKv(); return () => createKvSessionStore(kv); })()],
] as [string, () => SessionStore][]) {
  describe(`${name} session store`, () => {
    test("an unknown id reads as no session", async () => {
      assert.equal(await make().read(hash(9001)), null);
    });

    test("session data round-trips, and a later write replaces it", async () => {
      const store = make();
      await store.write(hash(1), session(1), live(1));
      assert.deepEqual(await store.read(hash(1)), session(1));
      await store.write(hash(1), session(2), live(1));
      assert.deepEqual(await store.read(hash(1)), session(2));
    });

    test("an expired session reads as no session", async () => {
      const store = make();
      await store.write(hash(2), session(2), expired);
      assert.equal(await store.read(hash(2)), null);
    });

    test("rotate removes the previous session and stores the new one", async () => {
      const store = make();
      await store.write(hash(3), { welcome: { isComplete: false } }, { userPublicId: null, maxAgeSeconds: 3600 });
      await store.rotate(hash(3), hash(4), session(4), live(4));
      assert.equal(await store.read(hash(3)), null);
      assert.deepEqual(await store.read(hash(4)), session(4));
    });

    test("rotate without a previous session only stores the new one", async () => {
      const store = make();
      await store.rotate(null, hash(5), session(5), live(5));
      assert.deepEqual(await store.read(hash(5)), session(5));
    });

    test("remove deletes the session", async () => {
      const store = make();
      await store.write(hash(6), session(6), live(6));
      await store.remove(hash(6));
      assert.equal(await store.read(hash(6)), null);
    });
  });
}

describe("Neon session store specifics", () => {
  test("rows are keyed by the id hash and linked to the account's public id", async () => {
    await createNeonSessionStore(url, endpoint).write(hash(7), session(7), live(7));
    const { rows } = await fake.db.query<{ user_public_id: string }>(
      "SELECT user_public_id FROM web_session.session WHERE id_hash = $1", [hash(7)]);
    assert.deepEqual(rows, [{ user_public_id: "public-7" }]);
  });

  test("a failed rotation keeps the previous session (one transaction)", async () => {
    const store = createNeonSessionStore(url, endpoint);
    await store.write(hash(8), session(8), live(8));
    // The id_hash CHECK constraint rejects the new row, so the delete must roll back.
    await assert.rejects(store.rotate(hash(8), "not-a-sha256-hex-digest", session(9), live(9)));
    assert.deepEqual(await store.read(hash(8)), session(8));
  });

  test("purgeExpired deletes at most `limit` expired sessions and keeps live ones", async () => {
    const store = createNeonSessionStore(url, endpoint);
    await store.purgeExpired(10_000);
    for (const n of [100, 101, 102]) await store.write(hash(n), session(n), expired);
    await store.write(hash(103), session(103), live(103));
    assert.equal(await store.purgeExpired(2), 2);
    assert.equal(await store.purgeExpired(10), 1);
    assert.equal(await store.purgeExpired(10), 0);
    assert.deepEqual(await store.read(hash(103)), session(103));
  });

  test("the Worker role can manage sessions but cannot read other tables", async () => {
    await fake.db.exec("CREATE TABLE IF NOT EXISTS public.profile (id int); INSERT INTO public.profile VALUES (1);");
    try {
      await fake.db.exec("SET ROLE food4u_web");
      await fake.db.query("INSERT INTO web_session.session (id_hash, data, expires_at) VALUES ($1, '{}', now())", [hash(200)]);
      await fake.db.query("UPDATE web_session.session SET data = '{\"a\":1}' WHERE id_hash = $1", [hash(200)]);
      await fake.db.query("DELETE FROM web_session.session WHERE id_hash = $1", [hash(200)]);
      await assert.rejects(fake.db.query("SELECT id FROM public.profile"), /permission denied/);
      await assert.rejects(fake.db.exec("CREATE TABLE web_session.extra (id int)"), /permission denied/);
    } finally {
      await fake.db.exec("RESET ROLE");
    }
  });

  test("an unreachable database is an error, never an empty session", async () => {
    const closed = createServer();
    await new Promise<void>((ok) => closed.listen(0, "127.0.0.1", ok));
    const port = (closed.address() as AddressInfo).port;
    await new Promise((ok) => closed.close(ok));
    await assert.rejects(createNeonSessionStore(url, `http://127.0.0.1:${port}/sql`).read(hash(1)));
  });
});

describe("KV session store specifics", () => {
  test("purgeExpired is a no-op because KV expires entries itself", async () => {
    assert.equal(await createKvSessionStore(memoryKv()).purgeExpired(100), 0);
  });
});

describe("store selection", () => {
  const kv = memoryKv();
  test("without a database URL, sessions stay in KV (local dev, legacy contract suite)", async () => {
    const store = sessionStoreFor({ cloudflare_KV: kv });
    await store.write(hash(400), session(400), live(400));
    assert.deepEqual(await kv.get(`session:${hash(400)}`, "json"), session(400));
    assert.equal(sessionStoreFor({ cloudflare_KV: kv }), store, "reused for the same configuration");
  });

  test("a database URL selects Neon; SESSION_STORE=kv switches back", async () => {
    const neon = sessionStoreFor({ cloudflare_KV: kv, SESSION_DATABASE_URL: url, NEON_FETCH_ENDPOINT: endpoint });
    await neon.write(hash(300), session(300), live(300));
    assert.deepEqual(await neon.read(hash(300)), session(300));
    const back = sessionStoreFor({ cloudflare_KV: kv, SESSION_STORE: "kv", SESSION_DATABASE_URL: url });
    assert.equal(await back.read(hash(300)), null, "KV is a separate store");
  });

  test("misconfiguration fails fast without revealing connection details", () => {
    assert.throws(() => sessionStoreFor({ cloudflare_KV: kv, SESSION_STORE: "neon" }), (error: Error) =>
      /SESSION_DATABASE_URL is not set/.test(error.message));
    assert.throws(() => sessionStoreFor({ cloudflare_KV: kv, SESSION_STORE: "redis", SESSION_DATABASE_URL: url }), (error: Error) =>
      !error.message.includes("synthetic") && /must be "neon" or "kv"/.test(error.message));
    // A mis-pasted secret must never reach the logs through the driver's own error.
    assert.throws(() => createNeonSessionStore("postgresql://user:hunter2-secret@broken host/db"), (error: Error) =>
      !error.message.includes("hunter2") && /SESSION_DATABASE_URL is not a valid URL/.test(error.message));
    assert.throws(() => createNeonSessionStore(url, "https://evil.example/sql"), (error: Error) =>
      /loopback/.test(error.message));
  });
});
