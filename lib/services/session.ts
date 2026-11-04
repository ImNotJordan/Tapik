"use client";

/**
 * Who is signed in, on the client, and the sign-in / sign-out actions.
 *
 * Mock mode: the in-browser demo session (lib/session.ts), unchanged.
 * Firebase mode: the server gate verifies the session cookie and hands the
 * session to <SessionProvider>; useSession() reads it. Sign-in screens call
 * signInAdmin / requestSignInLink / completeEmailLinkSignIn, which sign in the
 * Firebase SDK (for Firestore and Storage) and exchange the ID token for the
 * httpOnly session cookie (for server components) at /api/session.
 */
import { createContext, createElement, useContext, useEffect, type ReactNode } from "react";
import { dataSource, useEmulators } from "@/lib/firebase/config";
import * as mock from "@/lib/session";
import type { Result } from "@/lib/api";

export type Session = { role: "admin" } | { role: "client"; clientId: string } | { role: "guest" };

const firebaseMode = dataSource === "firebase";
type ProvidedSession = Session & { uid?: string; email?: string | null };
const SessionContext = createContext<ProvidedSession | null>(null);
const GUEST: Session = { role: "guest" };

/* -------------------------------------------------------------- reading */

export function useSession(): Session {
  const provided = useContext(SessionContext);
  const demo = mock.useSession();
  if (!firebaseMode) return demo;
  return provided ?? GUEST;
}

/**
 * Wraps signed-in screens with the session the server verified. In Firebase
 * mode it also keeps the browser SDK in step: if the SDK has no user (cleared
 * storage, another tab signed out) or a different one, the session ends.
 */
export function SessionProvider({ session, children }: { session: ProvidedSession; children: ReactNode }) {
  useEffect(() => {
    if (!firebaseMode || session.role === "guest" || !session.uid) return;
    let cancelled = false;
    let unsub: (() => void) | undefined;
    void (async () => {
      const [{ firebaseAuth }, { onAuthStateChanged }] = await Promise.all([import("@/lib/firebase/client"), import("firebase/auth")]);
      if (cancelled) return;
      if (!useEmulators && process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID) void import("@/lib/firebase/analytics").then((m) => m.startAnalytics()).catch(() => {});
      const auth = firebaseAuth();
      await auth.authStateReady();
      unsub = onAuthStateChanged(auth, (user) => {
        if (!user || user.uid !== session.uid) void signOutAndGo(session.role === "admin" ? "/admin/sign-in" : "/portal/sign-in");
      });
    })();
    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [session.role, session.uid]);
  return createElement(SessionContext.Provider, { value: session }, children);
}

/** The signed-in account's email (Firebase mode), for "Signed in as …". */
export function useAccountEmail(): string | null {
  return useContext(SessionContext)?.email ?? null;
}

/* ------------------------------------------------------------- sign out */

/** Ends the session everywhere in this browser: cookie, Firebase SDK, offline cache. */
export async function signOut(): Promise<void> {
  if (!firebaseMode) {
    mock.signOut();
    return;
  }
  try {
    await fetch("/api/session", { method: "DELETE" });
  } catch {
    /* offline: the cookie expires on its own */
  }
  const [{ firebaseAuth, firestore }, { signOut: fbSignOut }, { terminate, clearIndexedDbPersistence }] = await Promise.all([
    import("@/lib/firebase/client"),
    import("firebase/auth"),
    import("firebase/firestore"),
  ]);
  await fbSignOut(firebaseAuth()).catch(() => {});
  // Portals get used on shared computers: drop the offline copy of the card too.
  try {
    const db = firestore();
    await terminate(db);
    await clearIndexedDbPersistence(db);
  } catch {
    /* not started, or another tab still has it open */
  }
}

/**
 * Signs out, then loads the sign-in screen fresh. A full page load (not a
 * client-side push) on purpose: it drops every in-memory copy of the card,
 * the client list and the Firebase SDK state. Mock mode only signs out.
 */
export async function signOutAndGo(to: "/admin/sign-in" | "/portal/sign-in"): Promise<void> {
  await signOut();
  if (firebaseMode) window.location.assign(to);
}

/* ------------------------------------------------------------- sign in */

async function exchange(idToken: string, expect: "admin" | "client"): Promise<Result> {
  const res = await fetch("/api/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idToken, expect }) });
  if (res.ok) return { ok: true, data: undefined };
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  return { ok: false, error: body.error ?? "Sign-in didn't complete. Try again." };
}

const AUTH_ERRORS: Record<string, string> = {
  "auth/invalid-credential": "That email and password don’t match.",
  "auth/wrong-password": "That email and password don’t match.",
  "auth/user-not-found": "That email and password don’t match.",
  "auth/invalid-email": "Enter a valid email address.",
  "auth/user-disabled": "This account was turned off.",
  "auth/too-many-requests": "Too many tries. Wait a few minutes, then try again.",
  "auth/network-request-failed": "You seem to be offline. Check your connection and try again.",
  "auth/invalid-action-code": "This sign-in link has expired or was already used.",
  "auth/expired-action-code": "This sign-in link has expired or was already used.",
};
const authMessage = (e: unknown) => AUTH_ERRORS[(e as { code?: string })?.code ?? ""] ?? "Sign-in didn’t work. Try again.";

/** Tapik Studio: email + password, admin claim required. */
export async function signInAdmin(email: string, password: string): Promise<Result> {
  if (!firebaseMode) return { ok: true, data: undefined };
  const [{ firebaseAuth }, { signInWithEmailAndPassword, signOut: fbSignOut }] = await Promise.all([import("@/lib/firebase/client"), import("firebase/auth")]);
  const auth = firebaseAuth();
  try {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    const token = await cred.user.getIdTokenResult();
    if (token.claims.role !== "admin") {
      await fbSignOut(auth);
      return { ok: false, error: token.claims.role === "client" ? "This is a client account. Clients sign in from the portal." : "This account isn’t a Tapik Studio admin." };
    }
    const r = await exchange(token.token, "admin");
    if (!r.ok) await fbSignOut(auth);
    return r;
  } catch (e) {
    return { ok: false, error: authMessage(e) };
  }
}

const EMAIL_KEY = "tapik:sign-in-email";

/**
 * Client portal: ask for a sign-in link. The answer is the same whether or not
 * the email has a card, so the screen never reveals who is a client.
 * `devLink` is returned by the emulators only, for the demo box on the sign-in screen.
 */
export async function requestSignInLink(email: string): Promise<Result<{ email: string; devLink?: string }>> {
  if (!firebaseMode) {
    const { requestSignInLink: mockRequest } = await import("@/lib/api");
    return mockRequest(email);
  }
  const [{ firebaseFunctions }, { httpsCallable }] = await Promise.all([import("@/lib/firebase/client"), import("firebase/functions")]);
  try {
    const r = await httpsCallable<{ email: string }, { devLink?: string }>(firebaseFunctions(), "sendSignInLink")({ email });
    try {
      window.localStorage.setItem(EMAIL_KEY, email);
    } catch {
      /* the finish screen asks for the email instead */
    }
    return { ok: true, data: { email, devLink: r.data.devLink } };
  } catch (e) {
    const code = (e as { code?: string }).code ?? "";
    if (code.endsWith("resource-exhausted")) return { ok: false, error: "A link was just sent. Wait a moment before asking again." };
    if (code.endsWith("invalid-argument")) return { ok: false, error: "Enter a valid email address." };
    return { ok: false, error: "We couldn’t send the link. Check your connection and try again." };
  }
}

/** Is this URL a sign-in link we sent? */
export async function isSignInLink(href: string): Promise<boolean> {
  if (!firebaseMode) return false;
  const [{ firebaseAuth }, { isSignInWithEmailLink }] = await Promise.all([import("@/lib/firebase/client"), import("firebase/auth")]);
  return isSignInWithEmailLink(firebaseAuth(), href);
}

/** The email saved when the link was requested on this device, if any. */
export function rememberedSignInEmail(): string | null {
  try {
    return window.localStorage.getItem(EMAIL_KEY);
  } catch {
    return null;
  }
}

/** Finishes an email-link sign-in and starts the portal session. */
export async function completeEmailLinkSignIn(email: string, href: string): Promise<Result> {
  const [{ firebaseAuth }, { signInWithEmailLink, signOut: fbSignOut }] = await Promise.all([import("@/lib/firebase/client"), import("firebase/auth")]);
  const auth = firebaseAuth();
  try {
    const cred = await signInWithEmailLink(auth, email.trim(), href);
    const token = await cred.user.getIdTokenResult();
    const r = await exchange(token.token, "client");
    if (!r.ok) await fbSignOut(auth);
    else {
      try {
        window.localStorage.removeItem(EMAIL_KEY);
      } catch {
        /* nothing to clean */
      }
    }
    return r;
  } catch (e) {
    return { ok: false, error: authMessage(e) };
  }
}

/** Invite accepted: sign in with the token acceptInvite returned, then start the portal session. */
export async function signInWithInviteToken(customToken: string): Promise<Result> {
  const [{ firebaseAuth }, { signInWithCustomToken, signOut: fbSignOut }] = await Promise.all([import("@/lib/firebase/client"), import("firebase/auth")]);
  const auth = firebaseAuth();
  try {
    const cred = await signInWithCustomToken(auth, customToken);
    const r = await exchange(await cred.user.getIdToken(true), "client");
    if (!r.ok) await fbSignOut(auth);
    return r;
  } catch (e) {
    return { ok: false, error: authMessage(e) };
  }
}

/* ---------------------------------------------- demo / development only */

/** Mock mode: become a client (invite acceptance, demo sign-in). */
export const signInAsClient = mock.signInAsClient;
/** Mock mode: set the demo session directly (RoleSwitcher, gates). */
export const setSession = mock.setSession;

/** Firebase mode against the emulators only: sign in as a seeded user (RoleSwitcher). */
export async function devSignInAs(uid: string, role: "admin" | "client"): Promise<Result> {
  if (!firebaseMode || !useEmulators) return { ok: false, error: "Only available against the emulators." };
  const res = await fetch("/api/dev/sign-in-as", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ uid }) });
  if (!res.ok) return { ok: false, error: "Couldn’t sign in as that user." };
  const { token } = (await res.json()) as { token: string };
  const [{ firebaseAuth }, { signInWithCustomToken }] = await Promise.all([import("@/lib/firebase/client"), import("firebase/auth")]);
  const cred = await signInWithCustomToken(firebaseAuth(), token);
  return exchange(await cred.user.getIdToken(), role);
}

export const isFirebaseMode = firebaseMode;
export const isEmulatorMode = useEmulators;
