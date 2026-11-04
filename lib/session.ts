"use client";

import { useSyncExternalStore } from "react";
import type { Role } from "@/lib/types";

/**
 * Mock session. There is no real sign-in: the session is a role kept in this
 * browser, switched by accepting an invite, the portal sign-in, "Sign out",
 * or the dev-only RoleSwitcher.
 * TODO(backend): Supabase Auth (magic link or password) with a `role` claim and
 * RLS so a client can only read and write their own card.
 */
export type Session = { role: "admin" } | { role: "client"; clientId: string };

const KEY = "nfc-cards:session:v1";
const ADMIN: Session = { role: "admin" };

let current: Session = ADMIN;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Session) : null;
    if (parsed?.role === "client" && typeof parsed.clientId === "string") current = parsed;
  } catch {
    /* blocked storage: stay admin */
  }
  window.addEventListener("storage", (e) => {
    if (e.key !== KEY) return;
    loaded = false;
    current = ADMIN;
    load();
    listeners.forEach((l) => l());
  });
}

function subscribe(l: () => void) {
  load();
  listeners.add(l);
  return () => listeners.delete(l);
}

export function getSession(): Session {
  load();
  return current;
}

export function setSession(next: Session) {
  current = next;
  try {
    if (next.role === "admin") window.localStorage.removeItem(KEY);
    else window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* in-memory only */
  }
  listeners.forEach((l) => l());
}

export function signInAsClient(clientId: string) {
  setSession({ role: "client", clientId });
}

/** Mock: signing out of the client account returns this browser to the studio admin. */
export function signOut() {
  setSession(ADMIN);
}

/** Server render and first paint are always "admin"; the stored session applies after hydration. */
export function useSession(): Session {
  return useSyncExternalStore(subscribe, getSession, () => ADMIN);
}

export function useRole(): Role {
  return useSession().role;
}
