"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { bundleFromDB, createSeedDB, type MockDB } from "@/lib/mock";
import type { Card, CardBundle, LibrarySettings } from "@/lib/types";
import { lockViolations } from "@/lib/entitlements";
import { LEGACY_TEMPLATE_IDS } from "@/templates/registry";
import { dataSource } from "@/lib/firebase/config";
import * as sync from "./firebase-sync";

/**
 * The client-side store every screen reads (useDB) and every action writes (updateDB).
 * Mock mode: seeded mock data, persisted to localStorage and synced across tabs.
 * Firebase mode: filled by Firestore listeners and written back through
 * ./firebase-sync (optimistic, debounced, rolled back on rejection).
 */
const firebaseMode = dataSource === "firebase";

// v3: clients, invites and paid templates. Older saved data is replaced by the new seed.
const STORAGE_KEY = "nfc-cards:db:v3";

type Snapshot = { db: MockDB; hydrated: boolean };

let db: MockDB = firebaseMode ? sync.emptyDB() : createSeedDB();
let hydrated = false;
let snapshot: Snapshot = { db, hydrated };
const serverSnapshot: Snapshot = { db: firebaseMode ? sync.emptyDB() : createSeedDB(), hydrated: false };
const listeners = new Set<() => void>();
let persistTimer: ReturnType<typeof setTimeout> | null = null;
let storageFull = false;

function emit() {
  snapshot = { db, hydrated };
  listeners.forEach((l) => l());
}

function readStorage(): MockDB | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<MockDB>;
    if (!parsed || !Array.isArray(parsed.cards)) return null;
    return migrate({ ...createSeedDB(), ...parsed } as MockDB);
  } catch {
    return null;
  }
}

/** Data saved before the template library: old template ids, starters instead of saved templates. */
function migrate(d: MockDB): MockDB {
  const id = (t: string) => LEGACY_TEMPLATE_IDS[t] ?? t;
  const card = (c: Card): Card => (LEGACY_TEMPLATE_IDS[c.templateId] ? { ...c, templateId: id(c.templateId) } : c);
  const seedLib = createSeedDB().library;
  const lib = d.library as Partial<LibrarySettings> & { disabledStarters?: string[] };
  const library: LibrarySettings = {
    defaultTemplateId: id(lib.defaultTemplateId ?? seedLib.defaultTemplateId),
    disabledTemplates: (lib.disabledTemplates ?? []).map(id),
    disabledThemes: (lib.disabledThemes ?? []).map((k) => {
      const [t, th] = k.split(":");
      return `${id(t)}:${th}`;
    }),
    favoriteTemplates: lib.favoriteTemplates ?? seedLib.favoriteTemplates,
    savedTemplates: lib.savedTemplates ?? [],
  };
  return {
    ...d,
    cards: d.cards.map(card),
    library,
    snapshots: Object.fromEntries(Object.entries(d.snapshots ?? {}).map(([k, b]) => [k, { ...b, card: card(b.card) }])),
  };
}

let syncStarted = false;

function hydrate() {
  if (typeof window === "undefined") return;
  if (firebaseMode) {
    if (syncStarted) return;
    // Only signed-in screens use live data. Public card pages render from the server, so a
    // tap on an NFC card never downloads the Firebase SDK.
    if (!/^\/(admin|portal)(\/|$)/.test(window.location.pathname)) {
      hydrated = true;
      emit();
      return;
    }
    syncStarted = true;
    const begin = () =>
      sync
        .start({
          getDB: () => db,
          setDB: (next, isHydrated) => {
            db = next;
            hydrated = isHydrated;
            emit();
          },
        })
        .catch(() => {
          // The SDK is loaded on demand; if the connection dropped before it arrived, try again once it's back.
          window.addEventListener("online", () => void begin(), { once: true });
        });
    void begin();
    return;
  }
  if (hydrated) return;
  db = readStorage() ?? db;
  hydrated = true;
  window.addEventListener("storage", (e) => {
    if (e.key !== STORAGE_KEY) return;
    const next = readStorage();
    if (next) {
      db = next;
      emit();
    }
  });
  emit();
}

function persist() {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
      storageFull = false;
    } catch {
      storageFull = true;
    }
  }, 200);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Replace the whole database through a pure updater. */
export function updateDB(fn: (current: MockDB) => MockDB) {
  const prev = db;
  db = fn(db);
  if (process.env.NODE_ENV !== "production") {
    // Honest locks: a client card must never be saved on a locked template.
    const bad = lockViolations(db.cards, db.entitlements, { defaultTemplateId: db.library.defaultTemplateId, overrides: db.pricing });
    if (bad.length) console.warn(`[theme guard] ${bad.join("; ")}`);
  }
  emit();
  if (firebaseMode) sync.record(prev, db);
  else persist();
}

/** Firebase mode: write everything pending now (the editor's autosave awaits this). */
export function flushDB(): Promise<sync.SyncResult> {
  return firebaseMode ? sync.flush() : Promise.resolve({ ok: true, savedAt: new Date().toISOString() });
}

/** Firebase mode: a write was rejected and rolled back. Returns an unsubscribe. */
export function onSyncError(listener: (message: string) => void): () => void {
  return firebaseMode ? sync.onSyncError(listener) : () => {};
}

export function readDB(): MockDB {
  return db;
}

export function isStorageFull(): boolean {
  return storageFull;
}

export function resetDemoData() {
  if (firebaseMode) return; // real data: there is no demo to reset
  db = createSeedDB();
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem("nfc-cards:db:v1");
    window.localStorage.removeItem("nfc-cards:db:v2");
  } catch {
    /* storage blocked: the in-memory reset still applies */
  }
  emit();
}

export function useDB(): Snapshot {
  const snap = useSyncExternalStore(subscribe, () => snapshot, () => serverSnapshot);
  useEffect(() => {
    hydrate();
  }, []);
  return snap;
}

export function useCardBundle(cardId: string | undefined): { bundle: CardBundle | null; hydrated: boolean } {
  const { db: current, hydrated: isHydrated } = useDB();
  const bundle = useMemo(() => (cardId ? bundleFromDB(current, cardId) : null), [current, cardId]);
  return { bundle, hydrated: isHydrated };
}
