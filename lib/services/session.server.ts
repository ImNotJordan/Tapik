import "server-only";

/**
 * Server-side session: the Data Access Layer for "who is signed in".
 * Reads the Firebase session cookie, verifies it (including revocation and
 * disabled accounts) and returns a narrow session. Call it only inside a
 * <Suspense> boundary (Cache Components treats cookies() as request data).
 */
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { connection } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { COL } from "@/lib/firebase/model";

export const SESSION_COOKIE = "__session";
/** How long a session lasts before signing in again. Firebase allows 5 minutes to 2 weeks. */
export const SESSION_DAYS = { admin: 5, client: 14 } as const;

export type ServerSession =
  | { uid: string; role: "admin"; email: string | null; name: string | null }
  | { uid: string; role: "client"; email: string | null; name: string | null; clientId: string; cardId: string };

/** Verified session for this request, or null. Deduplicated per request. */
export const getServerSession = cache(async (): Promise<ServerSession | null> => {
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!value) return null;
  // Verifying compares the cookie's expiry with the clock: a request-time read, never prerendered.
  await connection();
  try {
    const t = await adminAuth().verifySessionCookie(value, true);
    if (t.role === "admin") return { uid: t.uid, role: "admin", email: t.email ?? null, name: (t.name as string | undefined) ?? null };
    if (t.role === "client" && typeof t.clientId === "string" && typeof t.cardId === "string") {
      return { uid: t.uid, role: "client", email: t.email ?? null, name: (t.name as string | undefined) ?? null, clientId: t.clientId, cardId: t.cardId };
    }
    return null;
  } catch {
    // Expired, revoked, disabled or tampered: treat as signed out.
    return null;
  }
});

/** The path the proxy saw, for "send me back here after sign-in". */
export async function requestPath(): Promise<string> {
  return (await headers()).get("x-tapik-path") ?? "/";
}

/** A client's own record status, checked on every portal load (disabled clients are turned away). */
export async function clientStatus(clientId: string): Promise<{ status: "invited" | "active" | "disabled"; name: string } | null> {
  const snap = await adminDb().collection(COL.clients).doc(clientId).get();
  if (!snap.exists) return null;
  const d = snap.data() as { status: "invited" | "active" | "disabled"; name: string };
  return { status: d.status, name: d.name };
}

/* ------------------------------------------------------ create and end */

export type CreateSessionResult =
  | { ok: true; cookie: string; maxAgeSeconds: number; role: "admin" | "client" }
  | { ok: false; status: 400 | 401 | 403; error: string };

/** Signed in less than this long ago, or the sign-in has to be repeated. */
const RECENT_SIGN_IN_SECONDS = 5 * 60;

/**
 * Exchanges a fresh Firebase ID token for a session cookie. Only accounts with
 * a role claim get one; disabled clients and stale sign-ins are refused.
 * `expect` lets each sign-in screen refuse the other role with a clear message.
 */
export async function createSession(idToken: unknown, expect?: "admin" | "client"): Promise<CreateSessionResult> {
  if (typeof idToken !== "string" || idToken.length < 20 || idToken.length > 8192) return { ok: false, status: 400, error: "Sign-in didn't complete. Try again." };
  let t;
  try {
    t = await adminAuth().verifyIdToken(idToken, true);
  } catch {
    return { ok: false, status: 401, error: "Your sign-in expired. Try again." };
  }
  if (Date.now() / 1000 - t.auth_time > RECENT_SIGN_IN_SECONDS) return { ok: false, status: 401, error: "Please sign in again." };

  const role = t.role === "admin" ? "admin" : t.role === "client" ? "client" : null;
  if (!role) {
    return { ok: false, status: 403, error: expect === "admin" ? "This account isn't a Tapik Studio admin." : "We couldn't find a card for this email." };
  }
  if (expect && role !== expect) {
    return { ok: false, status: 403, error: expect === "admin" ? "This is a client account. Clients sign in from the portal." : "This is a studio admin account. Sign in from Tapik Studio." };
  }

  if (role === "client") {
    const clientId = typeof t.clientId === "string" ? t.clientId : "";
    const ref = adminDb().collection(COL.clients).doc(clientId);
    const snap = clientId ? await ref.get() : null;
    const c = snap?.data() as { status?: string; authUid?: string | null } | undefined;
    if (!c || c.authUid !== t.uid) return { ok: false, status: 403, error: "We couldn't find a card for this email." };
    if (c.status === "disabled") return { ok: false, status: 403, error: "Access to this card was turned off. Contact the company that made your card." };
    await ref.update({ lastActiveAt: new Date(), ...(c.status === "invited" ? { status: "active" } : {}) });
  }

  const maxAgeSeconds = SESSION_DAYS[role] * 24 * 60 * 60;
  const cookie = await adminAuth().createSessionCookie(idToken, { expiresIn: maxAgeSeconds * 1000 });
  return { ok: true, cookie, maxAgeSeconds, role };
}

/* ------------------------------------------------- development helpers */

/**
 * Emulators only: a custom token for a seeded user, so the dev RoleSwitcher can
 * switch accounts. Refuses outside emulator mode and in production builds.
 */
export async function devCustomToken(uid: unknown): Promise<string | null> {
  const { useEmulators } = await import("@/lib/firebase/config");
  if (!useEmulators || process.env.NODE_ENV === "production") return null;
  if (typeof uid !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(uid)) return null;
  try {
    await adminAuth().getUser(uid);
    return await adminAuth().createCustomToken(uid);
  } catch {
    return null;
  }
}
