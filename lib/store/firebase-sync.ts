"use client";

/**
 * Firestore behind the store (NEXT_PUBLIC_DATA_SOURCE=firebase).
 *
 * Reading: onSnapshot listeners fill the same MockDB shape the UI already
 * uses, so screens don't change. Admins listen to every card (plus clients,
 * requests, settings); a client listens only to their own documents.
 *
 * Writing: every store action is a pure update of that shape (updateDB). The
 * engine compares before and after, keeps the difference as pending writes
 * (shown immediately: optimistic), and flushes them about 800 ms later in one
 * atomic batch per flush. A rejected batch rolls those changes back to what
 * the server has and reports the error. Card creation and link changes go
 * through Functions (slug reservation); Firestore rules check everything else.
 *
 * Collections that later phases move to Functions (publishing, requests,
 * invites, pricing) are read here but not written yet: changes to them stay
 * local and a dev warning names the phase.
 */
import type { MockDB } from "@/lib/mock";
import type { AlbumPhoto, Card, CardBundle, ChangeLog, Client, ClientNotification, Invite, LibrarySettings, OrgChart, OrgMember, PricingOverrides, SocialLink, TemplateRequest } from "@/lib/types";
import { COL, SETTINGS, decode, encode } from "@/lib/firebase/model";
import { bundleFromDB } from "@/lib/mock";

/* ------------------------------------------------------------------ state */

type Identity = { role: "admin"; uid: string } | { role: "client"; uid: string; clientId: string; cardId: string };

type Server = {
  cards: Map<string, Card>;
  orgCharts: Map<string, OrgChart>; // by cardId
  socials: Map<string, SocialLink>;
  photos: Map<string, AlbumPhoto>;
  members: Map<string, OrgMember & { cardId: string }>;
  changeLog: Map<string, ChangeLog>;
  snapshots: Map<string, CardBundle>; // by cardId
  clients: Map<string, Client>;
  invites: Map<string, Invite>;
  requests: Map<string, TemplateRequest>;
  entitlements: Map<string, string[]>; // by cardId
  notifications: Map<string, ClientNotification>;
  library: Omit<LibrarySettings, "defaultTemplateId" | "favoriteTemplates">;
  favorites: string[];
  pricing: { defaultTemplateId: string; overrides: PricingOverrides };
};

type CardPatch = { set: Record<string, unknown>; del: Set<string>; sections: Set<string>; orgChart?: OrgChart; touched: boolean };
type SubKind = "socials" | "photos" | "orgMembers";
type SubOp = { kind: SubKind; cardId: string; id: string; doc: object | null };

type Pending = {
  newCards: Set<string>;
  cards: Map<string, CardPatch>;
  subs: Map<string, SubOp>;
  slugs: Map<string, string>;
  library?: Partial<Server["library"]>;
  favorites?: string[];
};

export type SyncHost = { getDB: () => MockDB; setDB: (db: MockDB, hydrated: boolean) => void };
export type SyncResult = { ok: true; savedAt: string } | { ok: false; error: string };

const DEFAULT_TEMPLATE = "keepsake";

export function emptyDB(): MockDB {
  return {
    cards: [], socialLinks: [], albumPhotos: [], orgCharts: [], orgMembers: [],
    library: { defaultTemplateId: DEFAULT_TEMPLATE, disabledTemplates: [], disabledThemes: [], favoriteTemplates: [], savedTemplates: [] },
    snapshots: {}, clients: [], invites: [], templateRequests: [], entitlements: [], changeLog: [], notifications: [], pricing: {},
  };
}

function emptyServer(): Server {
  return {
    cards: new Map(), orgCharts: new Map(), socials: new Map(), photos: new Map(), members: new Map(), changeLog: new Map(), snapshots: new Map(),
    clients: new Map(), invites: new Map(), requests: new Map(), entitlements: new Map(), notifications: new Map(),
    library: { disabledTemplates: [], disabledThemes: [], savedTemplates: [] }, favorites: [], pricing: { defaultTemplateId: DEFAULT_TEMPLATE, overrides: {} },
  };
}

const emptyPending = (): Pending => ({ newCards: new Set(), cards: new Map(), subs: new Map(), slugs: new Map() });

let host: SyncHost | null = null;
let me: Identity | null = null;
let server = emptyServer();
let pending = emptyPending();
/** What the current flush is writing: still shown until it lands (or rolls back). */
let inflight: Pending | null = null;
/** Created or moved by a Function: shown until the listener has caught up. */
const settling = { newCards: new Set<string>(), slugs: new Map<string, string>() };
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let inFlight: Promise<SyncResult> | null = null;
let hydrated = false;
const errorListeners = new Set<(message: string) => void>();
/** SDK modules, loaded once at start so saving never needs the network to fetch code (offline edits). */
let sdk: { client: typeof import("@/lib/firebase/client"); fs: typeof import("firebase/firestore"); fns: typeof import("firebase/functions") } | null = null;
const unsubs: (() => void)[] = [];

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const warned = new Set<string>();
function notYet(what: string, phase: number) {
  if (process.env.NODE_ENV === "production" || warned.has(what)) return;
  warned.add(what);
  console.warn(`[sync] ${what} isn't saved to Firebase yet (phase ${phase}). The change stays in this tab only.`);
}

/* --------------------------------------------------------------- assemble */

/** Server state with the pending (not yet saved) changes laid on top. */
function assemble(): MockDB {
  // Settled once the listener shows the server's version.
  for (const id of settling.newCards) if (server.cards.has(id)) settling.newCards.delete(id);
  for (const [id, slug] of settling.slugs) if (server.cards.get(id)?.slug === slug) settling.slugs.delete(id);
  const layers = [inflight, pending].filter((l): l is Pending => !!l);

  const cards = new Map(server.cards);
  const orgCharts = new Map(server.orgCharts);
  const socials = new Map(server.socials);
  const photos = new Map(server.photos);
  const members = new Map(server.members);
  const newIds = new Set([...settling.newCards, ...layers.flatMap((l) => [...l.newCards])].filter((id) => !server.cards.has(id)));
  let libraryLayer: Partial<Server["library"]> = {};
  let favorites: string[] | undefined;
  for (const l of layers) {
    for (const [id, p] of l.cards) {
      const base = cards.get(id);
      if (!base) continue;
      const next = { ...base, ...p.set } as Record<string, unknown>;
      for (const k of p.del) delete next[k];
      cards.set(id, next as Card);
      if (p.orgChart) orgCharts.set(id, p.orgChart);
    }
    for (const op of l.subs.values()) {
      const target = op.kind === "socials" ? socials : op.kind === "photos" ? photos : members;
      if (op.doc) (target as Map<string, object>).set(op.id, op.doc);
      else target.delete(op.id);
    }
    if (l.library) libraryLayer = { ...libraryLayer, ...l.library };
    if (l.favorites) favorites = l.favorites;
  }
  for (const [cardId, slug] of [...settling.slugs, ...layers.flatMap((l) => [...l.slugs])]) {
    const c = cards.get(cardId);
    if (c) cards.set(cardId, { ...c, slug });
  }
  // New cards (not on the server yet) come from the local view.
  const local = host?.getDB();
  const newBundles = local ? [...newIds].map((id) => bundleFromDB(local, id)).filter((b): b is CardBundle => !!b) : [];

  const byPos = <T extends { position: number }>(a: T, b: T) => a.position - b.position;
  const lib = { ...server.library, ...libraryLayer };
  return {
    cards: [...newBundles.map((b) => b.card), ...[...cards.values()].sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))],
    socialLinks: [...[...socials.values()].sort(byPos), ...newBundles.flatMap((b) => b.socials)],
    albumPhotos: [...[...photos.values()].sort(byPos), ...newBundles.flatMap((b) => b.photos)],
    orgCharts: [...orgCharts.values(), ...newBundles.flatMap((b) => (b.orgChart ? [b.orgChart] : []))],
    orgMembers: [...[...members.values()].map(({ cardId: _c, ...m }) => (void _c, m)).sort(byPos), ...newBundles.flatMap((b) => b.orgMembers)],
    library: { defaultTemplateId: server.pricing.defaultTemplateId, ...lib, favoriteTemplates: favorites ?? server.favorites },
    snapshots: Object.fromEntries(server.snapshots),
    clients: [...server.clients.values()],
    invites: [...server.invites.values()],
    templateRequests: [...server.requests.values()].sort((a, b) => Date.parse(b.requestedAt) - Date.parse(a.requestedAt)),
    entitlements: [...server.entitlements].map(([cardId, unlockedTemplateIds]) => ({ cardId, unlockedTemplateIds })),
    changeLog: [...server.changeLog.values()].sort((a, b) => Date.parse(a.at) - Date.parse(b.at)),
    notifications: [...server.notifications.values()].sort((a, b) => Date.parse(b.at) - Date.parse(a.at)),
    pricing: server.pricing.overrides,
  };
}

function publish() {
  host?.setDB(assemble(), hydrated);
}

/* ------------------------------------------------------------------ diff */

/** Card fields that only Functions change (later phases), never a direct write. */
/** Card fields only Functions write (publish, review, ownership). The store's local copy is replaced by the listener. */
const FUNCTION_ONLY = new Set(["status", "published_at", "review", "clientId"]);
const SKIP = new Set(["id", "created_at", "updated_at"]);

function patchFor(cardId: string): CardPatch {
  let p = pending.cards.get(cardId);
  if (!p) pending.cards.set(cardId, (p = { set: {}, del: new Set(), sections: new Set(), touched: false }));
  return p;
}

function diffSubs<T extends { id: string }>(kind: SubKind, prev: T[], next: T[], cardOf: (row: T) => string | undefined, label: string) {
  const before = new Map(prev.map((r) => [r.id, r]));
  const after = new Map(next.map((r) => [r.id, r]));
  for (const [id, row] of after) {
    if (same(before.get(id), row)) continue;
    const cardId = cardOf(row);
    if (!cardId || pending.newCards.has(cardId)) continue;
    pending.subs.set(`${kind}:${id}`, { kind, cardId, id, doc: row });
    const p = patchFor(cardId);
    p.touched = true;
    p.sections.add(label);
  }
  for (const [id, row] of before) {
    if (after.has(id)) continue;
    const cardId = cardOf(row);
    if (!cardId || pending.newCards.has(cardId)) continue;
    pending.subs.set(`${kind}:${id}`, { kind, cardId, id, doc: null });
    const p = patchFor(cardId);
    p.touched = true;
    p.sections.add(label);
  }
}

/** Records the difference between two store states as pending writes. */
export function record(prev: MockDB, next: MockDB) {
  if (!me) return;
  const prevCards = new Map(prev.cards.map((c) => [c.id, c]));
  // A new card that arrives with a new client is "New card for a client" (phase 5, its own Function).
  const prevClients = new Set(prev.clients.map((c) => c.id));
  const forNewClient = new Set(next.clients.filter((c) => !prevClients.has(c.id)).map((c) => c.cardId));
  for (const card of next.cards) {
    const old = prevCards.get(card.id);
    if (!old) {
      if (me.role === "admin" && !forNewClient.has(card.id)) pending.newCards.add(card.id);
      else notYet("Creating a client's card", 5);
      continue;
    }
    if (pending.newCards.has(card.id) || same(old, card)) continue;
    const keys = new Set([...Object.keys(old), ...Object.keys(card)]);
    for (const k of keys) {
      const a = (old as Record<string, unknown>)[k];
      const b = (card as Record<string, unknown>)[k];
      if (SKIP.has(k) || same(a, b)) continue;
      if (k === "slug") {
        pending.slugs.set(card.id, b as string);
        continue;
      }
      if (FUNCTION_ONLY.has(k)) continue;
      if (k === "permissions" && me.role !== "admin") continue;
      if (k === "templateId" && me.role !== "admin") {
        notYet("A client's template change", 6);
        continue;
      }
      const p = patchFor(card.id);
      if (b === undefined) {
        p.del.add(k);
        delete p.set[k];
      } else {
        p.set[k] = b;
        p.del.delete(k);
      }
      p.touched = true;
    }
    if (old.updated_at !== card.updated_at) patchFor(card.id).touched = true;
  }

  const chartCard = (orgChartId: string) => next.orgCharts.find((o) => o.id === orgChartId)?.cardId ?? prev.orgCharts.find((o) => o.id === orgChartId)?.cardId;
  for (const chart of next.orgCharts) {
    const old = prev.orgCharts.find((o) => o.cardId === chart.cardId);
    if (pending.newCards.has(chart.cardId) || same(old, chart)) continue;
    const p = patchFor(chart.cardId);
    p.orgChart = chart;
    p.touched = true;
  }
  diffSubs("socials", prev.socialLinks, next.socialLinks, (r) => r.cardId, "Socials");
  diffSubs("photos", prev.albumPhotos, next.albumPhotos, (r) => r.cardId, "Album");
  diffSubs("orgMembers", prev.orgMembers, next.orgMembers, (r) => chartCard(r.orgChartId), "Org chart");

  if (me.role === "admin") {
    const { defaultTemplateId: d0, favoriteTemplates: f0, ...l0 } = prev.library;
    const { defaultTemplateId: d1, favoriteTemplates: f1, ...l1 } = next.library;
    if (!same(l0, l1)) pending.library = l1;
    if (!same(f0, f1)) pending.favorites = f1;
    if (d0 !== d1) notYet("The Default template", 6);
  }
  if (!same(prev.pricing, next.pricing)) notYet("Template prices", 6);
  for (const [k, phase] of [["clients", 5], ["invites", 5], ["templateRequests", 6], ["entitlements", 6], ["notifications", 6]] as const) {
    if (!same(prev[k], next[k])) notYet(k, phase);
  }
  scheduleFlush();
}

/* ----------------------------------------------------------------- flush */

function scheduleFlush(ms = 800) {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => void flush(), ms);
}

function hasPending() {
  return pending.newCards.size + pending.cards.size + pending.subs.size + pending.slugs.size > 0 || !!pending.library || !!pending.favorites;
}

const FRIENDLY: Record<string, string> = {
  "permission-denied": "You don’t have permission to change that. The change was undone.",
  "functions/permission-denied": "You don’t have permission to change that. The change was undone.",
  "functions/already-exists": "That link is already used by another card.",
  unauthenticated: "Your session ended. Sign in again to keep editing.",
  "functions/unauthenticated": "Your session ended. Sign in again to keep editing.",
  "functions/invalid-argument": "Some details aren’t valid. The change was undone.",
};
const friendly = (e: unknown) => FRIENDLY[(e as { code?: string })?.code ?? ""] ?? "Couldn’t save that change. Check your connection and try again.";

/** The server said no: roll back. Anything else (network, timeouts) is retried, never dropped. */
const REFUSED = /(^|\/)(permission-denied|unauthenticated|invalid-argument|already-exists|not-found|failed-precondition|out-of-range)$/;
const refused = (e: unknown) => REFUSED.test((e as { code?: string })?.code ?? "");

/** Puts a failed flush back in front of anything edited since (newer edits win). */
function requeue(older: Pending) {
  const newer = pending;
  const merged = emptyPending();
  older.newCards.forEach((id) => merged.newCards.add(id));
  newer.newCards.forEach((id) => merged.newCards.add(id));
  for (const src of [older, newer]) {
    for (const [id, p] of src.cards) {
      const m = merged.cards.get(id) ?? { set: {}, del: new Set<string>(), sections: new Set<string>(), touched: false };
      for (const [k, v] of Object.entries(p.set)) { m.set[k] = v; m.del.delete(k); }
      for (const k of p.del) { m.del.add(k); delete m.set[k]; }
      p.sections.forEach((x) => m.sections.add(x));
      if (p.orgChart) m.orgChart = p.orgChart;
      m.touched = m.touched || p.touched;
      merged.cards.set(id, m);
    }
    for (const [k, op] of src.subs) merged.subs.set(k, op);
    for (const [k, v] of src.slugs) merged.slugs.set(k, v);
    if (src.library) merged.library = { ...merged.library, ...src.library };
    if (src.favorites) merged.favorites = src.favorites;
  }
  pending = merged;
}

function retryWhenOnline() {
  if (typeof window === "undefined") return;
  if (navigator.onLine) scheduleFlush(5000);
  else window.addEventListener("online", () => scheduleFlush(300), { once: true });
}

/** Writes everything pending. Concurrent callers share the same flush. */
export function flush(): Promise<SyncResult> {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (inFlight) return inFlight.then(() => (hasPending() ? flush() : { ok: true, savedAt: new Date().toISOString() }));
  if (!hasPending() || !me) return Promise.resolve({ ok: true, savedAt: new Date().toISOString() });
  const batchOps = pending;
  inflight = batchOps;
  pending = emptyPending();
  inFlight = commit(batchOps)
    .then((): SyncResult => {
      // Card edits are already in Firestore's local cache; Function results land via the listener.
      batchOps.newCards.forEach((id) => settling.newCards.add(id));
      batchOps.slugs.forEach((slug, id) => settling.slugs.set(id, slug));
      return { ok: true, savedAt: new Date().toISOString() };
    })
    .catch((e): SyncResult => {
      if (!refused(e)) {
        // Network trouble: keep every edit and try again (offline: when the connection returns).
        requeue(batchOps);
        retryWhenOnline();
        return { ok: false, error: "Not saved yet. Your edits are kept and save when the connection is back." };
      }
      // Refused: roll back exactly what this flush carried (dropping `inflight`); newer edits stay pending.
      const message = friendly(e);
      errorListeners.forEach((l) => l(message));
      return { ok: false, error: message };
    })
    .finally(() => {
      inflight = null;
      inFlight = null;
      publish();
    });
  return inFlight;
}

async function commit(ops: Pending) {
  if (!sdk) throw Object.assign(new Error("not started"), { code: "unavailable" });
  const { client: { firestore, firebaseFunctions }, fs, fns: { httpsCallable } } = sdk;
  const db = firestore();
  const local = host!.getDB();

  for (const cardId of ops.newCards) {
    const bundle = bundleFromDB(local, cardId);
    if (bundle) await httpsCallable(firebaseFunctions(), "createCardFromBundle")({ bundle: JSON.parse(JSON.stringify(bundle)) });
  }
  for (const [cardId, slug] of ops.slugs) {
    const moved = (await httpsCallable(firebaseFunctions(), "changeSlug")({ cardId, slug })).data as { slug: string; previous: string };
    // Both public pages change: the old link now forwards, the new one shows the card.
    void fetch("/api/revalidate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slugs: [moved.previous, moved.slug] }) }).catch(() => {});
  }

  const writes: ((b: ReturnType<typeof fs.writeBatch>) => void)[] = [];
  for (const [cardId, p] of ops.cards) {
    if (ops.newCards.has(cardId) || !p.touched) continue;
    const ref = fs.doc(db, COL.cards, cardId);
    const data: Record<string, unknown> = {
      ...encode(p.set),
      updatedAt: fs.serverTimestamp(),
      lastEditedBy: me!.uid,
      lastEditedSections: [...p.sections],
    };
    for (const k of p.del) data[k] = fs.deleteField();
    if (p.orgChart) data.orgChart = encode(p.orgChart);
    writes.push((b) => b.update(ref, data));
  }
  for (const op of ops.subs.values()) {
    if (ops.newCards.has(op.cardId)) continue;
    const ref = fs.doc(db, COL.cards, op.cardId, op.kind, op.id);
    writes.push((b) => (op.doc ? b.set(ref, encode(op.doc!)) : b.delete(ref)));
  }
  if (ops.library) {
    const lib = ops.library;
    writes.push((b) => b.set(fs.doc(db, COL.settings, SETTINGS.library), { ...encode(lib), updatedAt: fs.serverTimestamp() }, { merge: true }));
  }
  if (ops.favorites && me!.role === "admin") {
    const fav = ops.favorites;
    writes.push((b) => b.update(fs.doc(db, COL.admins, me!.uid), { favoriteTemplates: fav, updatedAt: fs.serverTimestamp() }));
  }
  // Firestore batches hold up to 500 writes.
  for (let i = 0; i < writes.length; i += 450) {
    const b = fs.writeBatch(db);
    writes.slice(i, i + 450).forEach((w) => w(b));
    await b.commit();
  }
}

export function onSyncError(listener: (message: string) => void): () => void {
  errorListeners.add(listener);
  return () => errorListeners.delete(listener);
}

/* ------------------------------------------------------------- listeners */

type Snap = { id: string; ref: { path: string }; data: (o?: { serverTimestamps?: "estimate" }) => Record<string, unknown> | undefined };
const read = (s: Snap) => s.data({ serverTimestamps: "estimate" }) ?? {};

function toCard(id: string, d: Record<string, unknown>): { card: Card; orgChart?: OrgChart } {
  const { orgChart, lastEditedBy: _a, lastEditedSections: _b, ...rest } = d;
  void _a; void _b;
  const card = decode<Card>({ ...rest, id }, { renameTopLevel: true });
  return { card, orgChart: orgChart ? decode<OrgChart>(orgChart as Record<string, unknown>) : undefined };
}

/** Starts listening for the signed-in account. Resolves once every first snapshot arrived. */
export async function start(h: SyncHost): Promise<void> {
  host = h;
  const [client, { onAuthStateChanged }, fs, fns] = await Promise.all([import("@/lib/firebase/client"), import("firebase/auth"), import("firebase/firestore"), import("firebase/functions")]);
  sdk = { client, fs, fns };
  const { firebaseAuth, firestore } = client;
  const auth = firebaseAuth();
  await auth.authStateReady();

  onAuthStateChanged(auth, async (user) => {
    unsubs.splice(0).forEach((u) => u());
    server = emptyServer();
    pending = emptyPending();
    hydrated = false;
    me = null;
    if (!user) {
      hydrated = true;
      publish();
      return;
    }
    const claims = (await user.getIdTokenResult()).claims;
    if (claims.role === "admin") me = { role: "admin", uid: user.uid };
    else if (claims.role === "client" && typeof claims.clientId === "string" && typeof claims.cardId === "string") me = { role: "client", uid: user.uid, clientId: claims.clientId, cardId: claims.cardId };
    else {
      hydrated = true;
      publish();
      return;
    }
    listen(firestore(), fs, me);
  });
}

function listen(db: ReturnType<typeof import("@/lib/firebase/client").firestore>, fs: typeof import("firebase/firestore"), who: Identity) {
  const waiting = new Set<string>();
  const ready = (key: string) => {
    waiting.delete(key);
    if (!waiting.size && !hydrated) hydrated = true;
    publish();
  };
  const onError = (key: string) => (e: unknown) => {
    console.error(`[sync] ${key}:`, (e as Error).message);
    ready(key);
  };
  /** Keeps a Map in step with a query. */
  const watchQuery = <T>(key: string, q: import("firebase/firestore").Query, map: Map<string, T>, conv: (s: Snap) => [string, T] | null) => {
    waiting.add(key);
    unsubs.push(
      fs.onSnapshot(
        q as never,
        (snap: { docs: Snap[] }) => {
          map.clear();
          for (const d of snap.docs) {
            const r = conv(d);
            if (r) map.set(r[0], r[1]);
          }
          ready(key);
        },
        onError(key),
      ),
    );
  };
  const watchDoc = (key: string, ref: import("firebase/firestore").DocumentReference, apply: (d: Record<string, unknown> | null) => void) => {
    waiting.add(key);
    unsubs.push(fs.onSnapshot(ref as never, (s: Snap & { exists: () => boolean }) => {
      apply(s.exists() ? read(s) : null);
      ready(key);
    }, onError(key)));
  };
  const parentCard = (s: Snap) => s.ref.path.split("/")[1];

  const cardsInto = (s: Snap) => {
    const { card, orgChart } = toCard(s.id, read(s));
    if (orgChart) server.orgCharts.set(card.id, orgChart);
    else server.orgCharts.delete(card.id);
    return [card.id, card] as [string, Card];
  };
  const social = (s: Snap) => [s.id, decode<SocialLink>({ ...read(s), id: s.id })] as [string, SocialLink];
  const photo = (s: Snap) => [s.id, decode<AlbumPhoto>({ ...read(s), id: s.id })] as [string, AlbumPhoto];
  const member = (s: Snap) => [s.id, { ...decode<OrgMember>({ ...read(s), id: s.id }), cardId: parentCard(s) }] as [string, OrgMember & { cardId: string }];
  const logEntry = (s: Snap) => [s.id, decode<ChangeLog>({ ...read(s), id: s.id })] as [string, ChangeLog];
  const settingsDoc = (name: string, apply: (d: Record<string, unknown>) => void) =>
    watchDoc(`settings/${name}`, fs.doc(db, COL.settings, name), (d) => d && apply(decode(d)));

  settingsDoc(SETTINGS.pricing, (d) => (server.pricing = { defaultTemplateId: (d.defaultTemplateId as string) ?? DEFAULT_TEMPLATE, overrides: (d.overrides as PricingOverrides) ?? {} }));
  settingsDoc(SETTINGS.library, (d) => (server.library = { disabledTemplates: (d.disabledTemplates as string[]) ?? [], disabledThemes: (d.disabledThemes as string[]) ?? [], savedTemplates: (d.savedTemplates as LibrarySettings["savedTemplates"]) ?? [] }));

  if (who.role === "admin") {
    watchQuery("cards", fs.collection(db, COL.cards), server.cards, cardsInto);
    watchQuery("socials", fs.collectionGroup(db, COL.socials), server.socials, social);
    watchQuery("photos", fs.collectionGroup(db, COL.photos), server.photos, photo);
    watchQuery("orgMembers", fs.collectionGroup(db, COL.orgMembers), server.members, member);
    watchQuery("changeLog", fs.query(fs.collectionGroup(db, COL.changeLog), fs.orderBy("at", "desc"), fs.limit(400)), server.changeLog, logEntry);
    watchQuery("publicCards", fs.collection(db, COL.publicCards), server.snapshots, (s) => {
      const d = read(s);
      return [d.cardId as string, decode<CardBundle>(d.bundle as Record<string, unknown>)];
    });
    watchQuery("clients", fs.collection(db, COL.clients), server.clients, (s) => [s.id, decode<Client>({ ...read(s), id: s.id })]);
    watchQuery("invites", fs.collection(db, COL.invites), server.invites, (s) => [s.id, { ...decode<Invite>({ ...read(s), id: s.id }), token: "" }]);
    watchQuery("requests", fs.collection(db, COL.templateRequests), server.requests, (s) => [s.id, decode<TemplateRequest>({ ...read(s), id: s.id })]);
    watchQuery("entitlements", fs.collection(db, COL.entitlements), server.entitlements, (s) => [s.id, (read(s).unlockedTemplateIds as string[]) ?? []]);
    watchQuery("notifications", fs.collection(db, COL.notifications), server.notifications, (s) => [s.id, decode<ClientNotification>({ ...read(s), id: s.id })]);
    watchDoc("admin", fs.doc(db, COL.admins, who.uid), (d) => (server.favorites = (d?.favoriteTemplates as string[]) ?? []));
    return;
  }

  // A client: only their own card and records.
  const cardRef = fs.doc(db, COL.cards, who.cardId);
  let snapshotUnsub: (() => void) | null = null;
  let snapshotSlug = "";
  watchDoc("card", cardRef, (d) => {
    if (!d) {
      server.cards.clear();
      return;
    }
    const [id, card] = cardsInto({ id: who.cardId, ref: { path: cardRef.path }, data: () => d });
    server.cards.set(id, card);
    if (card.slug !== snapshotSlug) {
      // The published version, for "Your live card" and unpublished-changes hints.
      snapshotSlug = card.slug;
      snapshotUnsub?.();
      snapshotUnsub = fs.onSnapshot(fs.doc(db, COL.publicCards, card.slug), (s) => {
        server.snapshots.clear();
        if (s.exists()) server.snapshots.set(who.cardId, decode<CardBundle>((s.data().bundle ?? {}) as Record<string, unknown>));
        publish();
      }, () => {});
      unsubs.push(() => snapshotUnsub?.());
    }
  });
  watchQuery("socials", fs.collection(cardRef, COL.socials), server.socials, social);
  watchQuery("photos", fs.collection(cardRef, COL.photos), server.photos, photo);
  watchQuery("orgMembers", fs.collection(cardRef, COL.orgMembers), server.members, member);
  watchQuery("changeLog", fs.query(fs.collection(cardRef, COL.changeLog), fs.orderBy("at", "desc"), fs.limit(100)), server.changeLog, logEntry);
  watchDoc("client", fs.doc(db, COL.clients, who.clientId), (d) => {
    server.clients.clear();
    if (d) server.clients.set(who.clientId, decode<Client>({ ...d, id: who.clientId }));
  });
  watchDoc("entitlements", fs.doc(db, COL.entitlements, who.cardId), (d) => {
    server.entitlements.clear();
    server.entitlements.set(who.cardId, (d?.unlockedTemplateIds as string[]) ?? []);
  });
  watchQuery("requests", fs.query(fs.collection(db, COL.templateRequests), fs.where("clientId", "==", who.clientId)), server.requests, (s) => [s.id, decode<TemplateRequest>({ ...read(s), id: s.id })]);
  watchQuery("notifications", fs.query(fs.collection(db, COL.notifications), fs.where("clientId", "==", who.clientId)), server.notifications, (s) => [s.id, decode<ClientNotification>({ ...read(s), id: s.id })]);
}

export function isHydrated() {
  return hydrated;
}
