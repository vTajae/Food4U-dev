// Session store settings (lib/session-store.ts). SESSION_DATABASE_URL is a secret,
// so `wrangler types` cannot generate these from wrangler.jsonc; declared by hand.
interface SessionStoreEnv {
  /** "neon" or "kv". Unset: Neon when SESSION_DATABASE_URL is set, otherwise KV. */
  SESSION_STORE?: string;
  /** Secret: connection string for the Worker's least-privilege role, food4u_web. */
  SESSION_DATABASE_URL?: string;
  /** Tests and local tooling only: send Neon queries to a local endpoint. */
  NEON_FETCH_ENDPOINT?: string;
}
declare namespace Cloudflare {
  interface Env extends SessionStoreEnv {}
}
interface Env extends SessionStoreEnv {}
