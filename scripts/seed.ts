/**
 * Loads the mock data (lib/mock + one sample card per template) into Firestore and Auth.
 *
 *   npm run seed                                   emulators (project demo-tapik); wipes them first
 *   npm run seed -- --project tapik-ph --confirm   a real project, ONLY if it has no cards or clients yet
 *
 * Emulator runs also create sign-in users:
 *   admin@tapik.ph / $SEED_ADMIN_PASSWORD (default "tapik-dev-admin"), claim { role: "admin" }
 *   every account in OWNER_ADMINS below, same password and claim
 *   every active client, claims { role: "client", clientId, cardId } (they sign in by email link)
 * Real-project runs create no users: use scripts/make-admin.ts, and clients join through invites.
 */
import { createHash } from "node:crypto";
import { applicationDefault, cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { bundleFromDB, createSeedDB } from "@/lib/mock";
import { WORKSPACE } from "@/lib/mock/workspace";
import { COL, SETTINGS, encode } from "@/lib/firebase/model";
import { EMULATOR_HOSTS, EMULATOR_PROJECT_ID } from "@/lib/firebase/config";
import * as S from "@/lib/schemas";
import { TEMPLATE_PREVIEWS } from "@/templates/previews";
import type { CardBundle } from "@/lib/types";

/** The real Tapik Studio admins, mirrored in the emulators so local sign-in matches production. */
const OWNER_ADMINS = [{ uid: "admin_jordan", email: "amilasan_jordan@hyacinthindustriesllc.com", name: "Jordan Amilasan" }];

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const opt = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const project = opt("project");
const real = Boolean(project);
const projectId = project ?? EMULATOR_PROJECT_ID;

if (real && !flag("confirm")) {
  console.error(`Refusing to seed ${project} without --confirm. This writes to a real Firebase project.`);
  process.exit(1);
}
if (real && project !== "tapik-ph") {
  console.error(`Unknown project "${project}". Only tapik-ph is configured.`);
  process.exit(1);
}

if (!real) {
  process.env.FIRESTORE_EMULATOR_HOST = `${EMULATOR_HOSTS.firestore.host}:${EMULATOR_HOSTS.firestore.port}`;
  process.env.FIREBASE_AUTH_EMULATOR_HOST = EMULATOR_HOSTS.auth;
}

function credential() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return applicationDefault(); // gcloud auth application-default login
  const j = JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
  return cert({ projectId: j.project_id, clientEmail: j.client_email, privateKey: j.private_key });
}

const app = initializeApp(real ? { projectId, credential: credential() } : { projectId });
const db = getFirestore(app);
const auth = getAuth(app);
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

async function emulatorUp() {
  try {
    const r = await fetch(`http://${EMULATOR_HOSTS.firestore.host}:${EMULATOR_HOSTS.firestore.port}/`);
    return r.ok;
  } catch {
    return false;
  }
}

async function wipeEmulators() {
  const fs = `http://${EMULATOR_HOSTS.firestore.host}:${EMULATOR_HOSTS.firestore.port}/emulator/v1/projects/${projectId}/databases/(default)/documents`;
  const au = `http://${EMULATOR_HOSTS.auth}/emulator/v1/projects/${projectId}/accounts`;
  await Promise.all([fetch(fs, { method: "DELETE" }), fetch(au, { method: "DELETE" })]);
}

async function assertEmpty(f: Firestore) {
  for (const c of [COL.cards, COL.clients]) {
    const snap = await f.collection(c).limit(1).get();
    if (!snap.empty) {
      console.error(`${projectId} already has ${c}. Seeding only runs on an empty project.`);
      process.exit(1);
    }
  }
}

/** Validates against the shared schemas so seed data proves the schemas accept real cards. */
function check<T>(schema: { safeParse: (v: unknown) => { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } } }, value: T, what: string): T {
  const r = schema.safeParse(value);
  if (!r.success) {
    const issues = r.error!.issues.slice(0, 5).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Seed data failed validation (${what}): ${issues}`);
  }
  return value;
}

async function main() {
  if (!real && !(await emulatorUp())) {
    console.error("The Firestore emulator isn't running. Start it with `npm run emulators`, then run `npm run seed` again.");
    process.exit(1);
  }
  if (real) await assertEmpty(db);
  else await wipeEmulators();

  const mock = createSeedDB();
  const w = db.bulkWriter();
  let docs = 0;
  const set = (path: string, data: object) => {
    docs++;
    void w.set(db.doc(path), data);
  };

  // Settings
  set(`${COL.settings}/${SETTINGS.pricing}`, check(S.pricingSettings, { defaultTemplateId: mock.library.defaultTemplateId, overrides: mock.pricing }, "pricing"));
  const { favoriteTemplates, defaultTemplateId: _d, ...library } = mock.library;
  void _d;
  set(`${COL.settings}/${SETTINGS.library}`, encode(check(S.librarySettings, library, "library")));
  const { payment, senderEmail, adminName, adminEmail, ...publicWorkspace } = WORKSPACE;
  set(`${COL.settings}/${SETTINGS.app}`, { ...publicWorkspace, updatedAt: new Date() });
  set(`${COL.settings}/${SETTINGS.private}`, { payment, senderEmail, adminName, adminEmail, updatedAt: new Date() });

  // Cards: the client cards plus one published sample per template (studio-only, no client).
  const bundles: CardBundle[] = mock.cards.map((c) => bundleFromDB(mock, c.id)!);
  const taken = new Set(bundles.flatMap((b) => [b.card.id, b.card.slug]));
  for (const b of Object.values(TEMPLATE_PREVIEWS)) if (!taken.has(b.card.id) && !taken.has(b.card.slug)) bundles.push(structuredClone(b));

  for (const b of bundles) {
    check(S.cardBundle, b, `card ${b.card.id}`);
    const { card, socials, photos, orgChart, orgMembers } = b;
    const base = `${COL.cards}/${card.id}`;
    set(base, { ...encode(card, { renameTopLevel: true }), ...(orgChart ? { orgChart: encode(orgChart) } : {}), lastEditedBy: null });
    for (const s of socials) set(`${base}/${COL.socials}/${s.id}`, encode(s));
    for (const p of photos) set(`${base}/${COL.photos}/${p.id}`, encode(p));
    for (const m of orgMembers) set(`${base}/${COL.orgMembers}/${m.id}`, encode(m));
    set(`${COL.slugs}/${card.slug}`, { cardId: card.id, createdAt: new Date() });
    if (card.status === "published") {
      const snapshot = mock.snapshots[card.id] ?? b;
      set(`${COL.publicCards}/${card.slug}`, { cardId: card.id, publishedAt: new Date(card.published_at ?? card.updated_at), bundle: encode(snapshot) });
    }
  }
  for (const e of mock.changeLog) set(`${COL.cards}/${e.cardId}/${COL.changeLog}/${e.id}`, encode(e));

  // Clients, invites (hash only), requests, entitlements, notifications
  for (const c of mock.clients) set(`${COL.clients}/${c.id}`, { ...encode(check(S.client, c, `client ${c.id}`)), authUid: null, createdAt: new Date(c.invitedAt), updatedAt: new Date() });
  for (const { token, ...inv } of mock.invites) {
    const stored = { ...inv, tokenHash: sha256(token) };
    set(`${COL.invites}/${inv.id}`, encode(check(S.invite, stored, `invite ${inv.id}`)));
  }
  for (const r of mock.templateRequests) set(`${COL.templateRequests}/${r.id}`, encode(check(S.templateRequest, r, `request ${r.id}`)));
  for (const e of mock.entitlements) set(`${COL.entitlements}/${e.cardId}`, { unlockedTemplateIds: e.unlockedTemplateIds, updatedAt: new Date() });
  for (const n of mock.notifications) set(`${COL.notifications}/${n.id}`, encode(check(S.notification, n, `notification ${n.id}`)));

  // A small NFC batch for phase 8: two tags assigned, three blank.
  const batchId = "batch_demo";
  set(`${COL.nfcBatches}/${batchId}`, { count: 5, createdBy: "seed", createdAt: new Date() });
  const tagIds = ["K7X2QD", "M4P9TR", "H3WN8C", "R9TB4K", "V6PJ2M"];
  tagIds.forEach((t, i) => {
    const cardId = i === 0 ? "card_carmela" : i === 1 ? "card_lia" : null;
    set(`${COL.nfcTags}/${t}`, { cardId, status: cardId ? "assigned" : "unassigned", batchId, programmedAt: new Date(), lockedAt: null, tapCount: 0, lastTapAt: null, createdAt: new Date(), updatedAt: new Date() });
  });

  await w.close();

  // Sign-in users (emulator only)
  let users = 0;
  if (!real) {
    const pw = process.env.SEED_ADMIN_PASSWORD || "tapik-dev-admin";
    const admin = await auth.createUser({ uid: "admin_rhea", email: "admin@tapik.ph", password: pw, displayName: WORKSPACE.adminName, emailVerified: true });
    await auth.setCustomUserClaims(admin.uid, { role: "admin" });
    await db.doc(`${COL.admins}/${admin.uid}`).set({ name: WORKSPACE.adminName, email: admin.email, role: "admin", favoriteTemplates, createdAt: new Date(), updatedAt: new Date() });
    users++;
    for (const o of OWNER_ADMINS) {
      const u = await auth.createUser({ uid: o.uid, email: o.email, password: pw, displayName: o.name, emailVerified: true });
      await auth.setCustomUserClaims(u.uid, { role: "admin" });
      await db.doc(`${COL.admins}/${u.uid}`).set({ name: o.name, email: o.email, role: "admin", favoriteTemplates: [], createdAt: new Date(), updatedAt: new Date() });
      users++;
    }
    for (const c of mock.clients.filter((x) => x.status === "active")) {
      const u = await auth.createUser({ uid: `client_${c.id}`, email: c.email, displayName: c.name, emailVerified: true });
      await auth.setCustomUserClaims(u.uid, { role: "client", clientId: c.id, cardId: c.cardId });
      await db.doc(`${COL.clients}/${c.id}`).update({ authUid: u.uid });
      users++;
    }
  }

  console.log(`Seeded ${projectId}: ${docs} documents (${bundles.length} cards, ${mock.clients.length} clients), ${users} sign-in users.`);
  if (!real) console.log(`Admin sign-in: admin@tapik.ph, ${OWNER_ADMINS.map((o) => o.email).join(", ")} (password: SEED_ADMIN_PASSWORD or the dev default). Emulator UI: http://127.0.0.1:4000`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
