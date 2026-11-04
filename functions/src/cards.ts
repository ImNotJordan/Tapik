import "./setup";
/**
 * Card callables and triggers.
 *   createCardFromBundle  admin: create a studio card from a full draft (Duplicate). Idempotent on card id.
 *   checkSlug             admin: is this link free?
 *   changeSlug            admin: move a card to a new link; the old link keeps redirecting
 *   onCardWritten         trigger: writes the "who edited what" change log
 */
import { FieldValue, getFirestore, type DocumentData, type Transaction } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { z } from "zod";
import { labelsFor } from "@/lib/change-log-fields";
import { COL, encode } from "@/lib/firebase/model";
import { cardBundle, id, slug as slugSchema } from "@/lib/schemas";
import type { CardBundle } from "@/lib/types";
import { parse, requireAdmin } from "./guards";
import { enforceAppCheck } from "./params";

const db = () => getFirestore();

/** First free slug from `base`, `base-2`, `base-3`… inside the transaction. Old links that redirect count as taken. */
async function reserveSlug(tx: Transaction, base: string, cardId: string): Promise<string> {
  for (let n = 1; n <= 50; n++) {
    const candidate = n === 1 ? base : `${base}-${n}`.slice(0, 80);
    const snap = await tx.get(db().collection(COL.slugs).doc(candidate));
    if (!snap.exists || snap.get("cardId") === cardId && !snap.get("redirectTo")) return candidate;
  }
  throw new HttpsError("resource-exhausted", "Couldn't find a free link for this card. Pick another name.");
}

/** Stored card document from a bundle's card (+ its org chart map). */
function cardDoc(b: CardBundle, editor: string): DocumentData {
  const { created_at: _c, updated_at: _u, published_at: _p, ...card } = b.card;
  void _c; void _u; void _p;
  return {
    ...encode(card, { renameTopLevel: true }),
    ...(b.orgChart ? { orgChart: encode(b.orgChart) } : {}),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    lastEditedBy: editor,
  };
}

export const createCardFromBundle = onCall({ enforceAppCheck }, async (req) => {
  const admin = requireAdmin(req);
  const { bundle } = parse(z.object({ bundle: cardBundle }), req.data);
  // A copy is always a studio card: it never inherits the source card's client, review or link state.
  const { clientId: _cl, permissions: _pe, review: _re, ...card } = bundle.card;
  void _cl; void _pe; void _re;
  const b: CardBundle = { ...bundle, card: { ...card, status: "draft", published_at: undefined } };
  const cardRef = db().collection(COL.cards).doc(b.card.id);

  const result = await db().runTransaction(async (tx) => {
    const existing = await tx.get(cardRef);
    if (existing.exists) return { cardId: b.card.id, slug: existing.get("slug") as string }; // retried call
    const free = await reserveSlug(tx, b.card.slug, b.card.id);
    tx.set(cardRef, cardDoc({ ...b, card: { ...b.card, slug: free } }, admin.uid));
    tx.set(db().collection(COL.slugs).doc(free), { cardId: b.card.id, createdAt: FieldValue.serverTimestamp() });
    for (const s of b.socials) tx.set(cardRef.collection(COL.socials).doc(s.id), encode({ ...s, cardId: b.card.id }));
    for (const p of b.photos) tx.set(cardRef.collection(COL.photos).doc(p.id), encode({ ...p, cardId: b.card.id }));
    for (const m of b.orgMembers) tx.set(cardRef.collection(COL.orgMembers).doc(m.id), encode(m));
    return { cardId: b.card.id, slug: free };
  });
  return result;
});

export const checkSlug = onCall({ enforceAppCheck }, async (req) => {
  requireAdmin(req);
  const { slug, cardId } = parse(z.object({ slug: slugSchema, cardId: id }), req.data);
  const snap = await db().collection(COL.slugs).doc(slug).get();
  return { available: !snap.exists || (snap.get("cardId") === cardId && !snap.get("redirectTo")) };
});

export const changeSlug = onCall({ enforceAppCheck }, async (req) => {
  const admin = requireAdmin(req);
  const { cardId, slug } = parse(z.object({ cardId: id, slug: slugSchema }), req.data);
  const cardRef = db().collection(COL.cards).doc(cardId);
  return db().runTransaction(async (tx) => {
    const card = await tx.get(cardRef);
    if (!card.exists) throw new HttpsError("not-found", "That card doesn't exist anymore.");
    const old = card.get("slug") as string;
    if (old === slug) return { slug, previous: old };
    const target = await tx.get(db().collection(COL.slugs).doc(slug));
    // Taking back one of this card's own old links is fine; anything else in use is not.
    if (target.exists && target.get("cardId") !== cardId) throw new HttpsError("already-exists", "That link is already used by another card.");
    const pub = await tx.get(db().collection(COL.publicCards).doc(old));

    tx.set(db().collection(COL.slugs).doc(slug), { cardId, createdAt: FieldValue.serverTimestamp() });
    // NFC cards may already carry the old link: keep it as a redirect, never free it for reuse.
    tx.set(db().collection(COL.slugs).doc(old), { cardId, redirectTo: slug, updatedAt: FieldValue.serverTimestamp() });
    tx.update(cardRef, { slug, updatedAt: FieldValue.serverTimestamp(), lastEditedBy: admin.uid });
    if (pub.exists) {
      const data = pub.data()!;
      tx.set(db().collection(COL.publicCards).doc(slug), { ...data, bundle: { ...data.bundle, card: { ...data.bundle.card, slug } } });
      tx.delete(pub.ref);
    }
    // TODO(phase 7): revalidate /c/{old} and /c/{slug} after commit.
    return { slug, previous: old };
  });
});

/* -------------------------------------------------------------- change log */

const META = new Set(["updatedAt", "lastEditedBy", "lastEditedSections", "createdAt"]);
const BUCKET_MS = 10 * 60_000;
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

type Actor = { actor: "admin" | "client"; actorName: string };

async function actorFor(uid: string): Promise<Actor | null> {
  const adminDoc = await db().collection(COL.admins).doc(uid).get();
  if (adminDoc.exists) return { actor: "admin", actorName: (adminDoc.get("name") as string) || "Admin" };
  const c = await db().collection(COL.clients).where("authUid", "==", uid).limit(1).get();
  if (!c.empty) return { actor: "client", actorName: (c.docs[0].get("name") as string) || "Client" };
  return null;
}

const keyOf = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");

/**
 * One entry per field, per person, per 10-minute window: the document id is
 * derived from those three, so repeated autosaves update one entry (and a
 * retried trigger can't add duplicates).
 */
export const onCardWritten = onDocumentUpdated({ document: "cards/{cardId}", retry: true }, async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  const uid = after?.lastEditedBy as string | undefined;
  if (!before || !after || !uid) return;
  const changed = Object.keys({ ...before, ...after }).filter((k) => !META.has(k) && !same(before[k], after[k]));
  const fields = labelsFor(changed);
  if (changed.includes("orgChart") && !fields.includes("Org chart")) fields.push("Org chart");
  const touchedOutside = !same(before.updatedAt, after.updatedAt) ? ((after.lastEditedSections as string[] | undefined) ?? []) : [];
  for (const s of touchedOutside) if (!fields.includes(s)) fields.push(s);
  if (!fields.length) return;

  const who = await actorFor(uid);
  if (!who) return;
  const at = new Date(event.time);
  const bucket = Math.floor(at.getTime() / BUCKET_MS);
  const log = db().collection(COL.cards).doc(event.params.cardId).collection(COL.changeLog);
  const batch = db().batch();
  for (const field of fields) {
    batch.set(log.doc(`${keyOf(field)}_${uid}_${bucket}`), { cardId: event.params.cardId, field, ...who, actorUid: uid, at }, { merge: true });
  }
  await batch.commit();
});
