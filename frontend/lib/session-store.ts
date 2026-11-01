// Where login sessions live. Neon is the default whenever SESSION_DATABASE_URL is
// set (production), because Workers KV's free tier allows only ~1,000 writes a day.
// KV stays available as a one-setting switch back (SESSION_STORE=kv) for when the
// app moves off the Cloudflare free tier. Keys are SHA-256 hashes of the cookie id.
import { neon, neonConfig } from "@neondatabase/serverless";
import type { SessionData } from "~/lib/session";

export type SessionWrite = { userPublicId: string | null; maxAgeSeconds: number };

export interface SessionStore {
  read(idHash: string): Promise<SessionData | null>;
  write(idHash: string, data: SessionData, options: SessionWrite): Promise<void>;
  /** Replaces one session with another in one step (login, signup). */
  rotate(previousIdHash: string | null, idHash: string, data: SessionData, options: SessionWrite): Promise<void>;
  remove(idHash: string): Promise<void>;
  /** Deletes up to `limit` expired sessions; returns how many were deleted. */
  purgeExpired(limit: number): Promise<number>;
}

export type SessionEnv = {
  cloudflare_KV: KVNamespace;
  SESSION_STORE?: string;
  SESSION_DATABASE_URL?: string;
  /** Tests and local tooling only: send Neon queries to a local endpoint. */
  NEON_FETCH_ENDPOINT?: string;
};

// Long enough for a Neon compute to wake from scale-to-zero.
const QUERY_TIMEOUT_MS = 8_000;

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"]);

function parsedOrThrow(value: string, name: string): URL {
  try {
    return new URL(value);
  } catch {
    // The driver's own error would echo the connection string, password included.
    throw new Error(`${name} is not a valid URL`);
  }
}

export function createNeonSessionStore(url: string, fetchEndpoint?: string): SessionStore {
  const parsed = parsedOrThrow(url, "SESSION_DATABASE_URL");
  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
    throw new Error("SESSION_DATABASE_URL must be a postgres:// URL");
  }
  if (fetchEndpoint) {
    // Only a local fake endpoint may receive the connection-string header.
    if (!LOOPBACK_HOSTS.has(parsedOrThrow(fetchEndpoint, "NEON_FETCH_ENDPOINT").hostname)) {
      throw new Error("NEON_FETCH_ENDPOINT must point at a loopback host");
    }
    neonConfig.fetchEndpoint = fetchEndpoint;
  }
  const sql = neon(url);
  // A fresh signal per request; a transaction takes it once for the whole batch.
  const timeout = () => ({ fetchOptions: { signal: AbortSignal.timeout(QUERY_TIMEOUT_MS) } });
  const upsert = (idHash: string, data: SessionData, { userPublicId, maxAgeSeconds }: SessionWrite, options?: ReturnType<typeof timeout>) => sql.query(
    `INSERT INTO web_session.session (id_hash, user_public_id, data, expires_at)
     VALUES ($1, $2, $3::jsonb, now() + $4::int * interval '1 second')
     ON CONFLICT (id_hash) DO UPDATE SET user_public_id = EXCLUDED.user_public_id,
       data = EXCLUDED.data, expires_at = EXCLUDED.expires_at, updated_at = now()`,
    [idHash, userPublicId, JSON.stringify(data), maxAgeSeconds], options,
  );
  const remove = (idHash: string, options?: ReturnType<typeof timeout>) =>
    sql.query("DELETE FROM web_session.session WHERE id_hash = $1", [idHash], options);

  return {
    async read(idHash) {
      const rows = await sql.query(
        "SELECT data FROM web_session.session WHERE id_hash = $1 AND expires_at > now()",
        [idHash], timeout(),
      ) as { data: SessionData }[];
      return rows[0]?.data ?? null;
    },
    async write(idHash, data, options) {
      await upsert(idHash, data, options, timeout());
    },
    async rotate(previousIdHash, idHash, data, options) {
      const queries = previousIdHash ? [remove(previousIdHash), upsert(idHash, data, options)] : [upsert(idHash, data, options)];
      await sql.transaction(queries, timeout());
    },
    async remove(idHash) {
      await remove(idHash, timeout());
    },
    async purgeExpired(limit) {
      const rows = await sql.query(
        `DELETE FROM web_session.session WHERE id_hash IN (
           SELECT id_hash FROM web_session.session WHERE expires_at <= now() LIMIT $1)
         RETURNING id_hash`,
        [limit], timeout(),
      );
      return rows.length;
    },
  };
}

export function createKvSessionStore(kv: KVNamespace): SessionStore {
  const key = (idHash: string) => `session:${idHash}`;
  const write = (idHash: string, data: SessionData, { maxAgeSeconds }: SessionWrite) =>
    kv.put(key(idHash), JSON.stringify(data), { expirationTtl: maxAgeSeconds });
  return {
    read: idHash => kv.get<SessionData>(key(idHash), "json"),
    write,
    async rotate(previousIdHash, idHash, data, options) {
      await write(idHash, data, options);
      if (previousIdHash) await kv.delete(key(previousIdHash));
    },
    remove: idHash => kv.delete(key(idHash)),
    purgeExpired: async () => 0, // KV expires entries by itself.
  };
}

let current: { config: string; store: SessionStore } | undefined;

/** The configured store. Error messages never include connection details. */
export function sessionStoreFor(env: SessionEnv): SessionStore {
  const choice = env.SESSION_STORE ?? (env.SESSION_DATABASE_URL ? "neon" : "kv");
  if (choice !== "neon" && choice !== "kv") throw new Error('SESSION_STORE must be "neon" or "kv"');
  if (choice === "neon" && !env.SESSION_DATABASE_URL) {
    throw new Error("SESSION_STORE is neon but SESSION_DATABASE_URL is not set");
  }
  const config = choice === "kv" ? "kv" : `neon|${env.SESSION_DATABASE_URL}|${env.NEON_FETCH_ENDPOINT ?? ""}`;
  if (current?.config !== config) {
    current = {
      config,
      store: choice === "kv"
        ? createKvSessionStore(env.cloudflare_KV)
        : createNeonSessionStore(env.SESSION_DATABASE_URL!, env.NEON_FETCH_ENDPOINT),
    };
  }
  return current.store;
}
