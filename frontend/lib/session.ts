// Server-side sessions. Cookie "__session" holds "<id>.<hmac>"; the data lives in
// the session store (lib/session-store.ts) under the SHA-256 hash of <id>.
import { env } from "cloudflare:workers";
import { cookies } from "next/headers";
import { cache } from "react";
import type { LoginCookieData } from "~/api/schemas/user";
import { sessionStoreFor } from "~/lib/session-store";

export type SessionData = {
  auth?: LoginCookieData;
  welcome?: { isComplete: boolean };
  /** JWT for the FastAPI backend, minted at login / refresh. */
  token?: string;
  flash?: { error?: string };
};

const COOKIE = "__session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days, as before
const encoder = new TextEncoder();

function toBase64Url(bytes: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64Url(text: string): Uint8Array<ArrayBuffer> | null {
  try {
    const binary = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

function hmacKey() {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(env.USER_SESSION_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

async function sign(id: string) {
  return toBase64Url(await crypto.subtle.sign("HMAC", await hmacKey(), encoder.encode(id)));
}

/** The store key: the raw id never leaves the cookie. */
async function hashId(id: string) {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(id)));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function readCookie(): Promise<string | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const dot = raw.lastIndexOf(".");
  if (dot <= 0) return null;
  const id = raw.slice(0, dot);
  const signature = fromBase64Url(raw.slice(dot + 1));
  // crypto.subtle.verify compares in constant time; never compare signatures with ===.
  if (!signature) return null;
  return (await crypto.subtle.verify("HMAC", await hmacKey(), signature, encoder.encode(id))) ? id : null;
}

async function setCookie(id: string) {
  (await cookies()).set(COOKIE, `${id}.${await sign(id)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: MAX_AGE,
  });
}

const store = () => sessionStoreFor(env);
const writeOptions = (data: SessionData) => ({ userPublicId: data.auth?.publicId ?? null, maxAgeSeconds: MAX_AGE });

/**
 * Reads the current session. Safe in layouts, pages, actions and route handlers.
 * Requests without a valid cookie never touch the store; one render reads it once.
 * Store failures propagate (the error page explains them); they never mean "signed out".
 */
export const getSession = cache(async (): Promise<{ id: string | null; data: SessionData }> => {
  const id = await readCookie();
  if (!id) return { id: null, data: {} };
  const data = await store().read(await hashId(id));
  return { id, data: data ?? {} };
});

/**
 * Persists session data. Sets the cookie when the session is new, which is only
 * allowed in Server Actions and Route Handlers; pages that merely update an
 * existing session only touch the store.
 */
export async function commitSession(
  session: { id: string | null; data: SessionData }
): Promise<void> {
  let id = session.id;
  const isNew = !id;
  if (!id) id = crypto.randomUUID();

  await store().write(await hashId(id), session.data, writeOptions(session.data));

  if (isNew) await setCookie(id);
  session.id = id;
}

/**
 * Starts a fresh session for a sign-in: a new id, the previous record removed in
 * the same step, and a new cookie, so a pre-login cookie can never become
 * authenticated (session fixation). Server Action / Route Handler only.
 */
export async function startSession(data: SessionData): Promise<{ id: string; data: SessionData }> {
  const previous = await readCookie();
  const id = crypto.randomUUID();
  await store().rotate(previous ? await hashId(previous) : null, await hashId(id), data, writeOptions(data));
  await setCookie(id);
  try {
    await store().purgeExpired(100);
  } catch {
    console.warn("Expired session cleanup failed; it will be retried at the next sign-in.");
  }
  return { id, data };
}

/** Deletes the session record and clears the cookie (Server Action / Route Handler only). */
export async function destroySession(): Promise<void> {
  const id = await readCookie();
  if (id) {
    try {
      await store().remove(await hashId(id));
    } catch {
      // Signing out must always work locally; the orphaned record expires on its own.
      console.warn("Session record could not be removed; it will expire.");
    }
  }
  (await cookies()).delete(COOKIE);
}
