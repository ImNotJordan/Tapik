import "./setup";
/**
 * Publishing: the public page shows publicCards/{slug}, a snapshot of the draft
 * taken at publish time, never the draft itself.
 *   publishCard      admin, or the card's client when they may publish directly
 *   unpublishCard    admin: the link stops resolving immediately
 *   submitForReview  the card's client: asks the studio to review the draft
 *   reviewDecision   admin: approve (publishes) or ask for changes; the client is notified
 *   setTemplateUnlock admin: unlock a paid template for a client's card (a comp), or take the comp back
 * The browser that published asks the site to refresh the page (/api/revalidate).
 */
import { randomBytes } from "node:crypto";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { z } from "zod";
import { BRAND } from "@/lib/brand";
import { canApplyTemplate, type PricingSettings } from "@/lib/entitlements";
import { COL, encode } from "@/lib/firebase/model";
import { id } from "@/lib/schemas";
import { getTemplate, hasTemplate } from "@/templates/registry";
import { bundleFor, publicBundle } from "./bundle";
import { caller, parse, requireAdmin, requireClient, type Caller } from "./guards";
import { enforceAppCheck } from "./params";

const db = () => getFirestore();
const randomId = (prefix: string) => `${prefix}_${randomBytes(6).toString("base64url").replace(/[^A-Za-z0-9]/g, "x")}`;

async function pricing(): Promise<PricingSettings> {
  const d = (await db().doc("settings/pricing").get()).data() as Partial<PricingSettings> | undefined;
  return { defaultTemplateId: d?.defaultTemplateId ?? "keepsake", overrides: d?.overrides ?? {} };
}

/** Builds and stores the public snapshot; marks the card published. Returns what changed. */
async function publish(cardId: string, who: Caller, extra: Record<string, unknown> = {}) {
  const bundle = await bundleFor(cardId);
  if (!bundle) throw new HttpsError("not-found", "That card doesn't exist anymore.");
  const { card } = bundle;
  if (!card.name?.trim()) throw new HttpsError("failed-precondition", "Add a name before publishing.");
  // Honest locks: a client's card never goes live on a template it hasn't unlocked.
  if (card.clientId) {
    const ent = (await db().collection(COL.entitlements).doc(cardId).get()).data() as { unlockedTemplateIds?: string[] } | undefined;
    if (!canApplyTemplate("client", { cardId, unlockedTemplateIds: ent?.unlockedTemplateIds ?? [] }, await pricing(), card.templateId)) {
      throw new HttpsError("failed-precondition", `${getTemplate(card.templateId).name} isn't unlocked for this card yet.`);
    }
  }
  const publishedAt = new Date();
  const snapshot = publicBundle(bundle, publishedAt.toISOString());
  const batch = db().batch();
  batch.set(db().collection(COL.publicCards).doc(card.slug), { cardId, slug: card.slug, publishedAt, bundle: encode(snapshot) });
  batch.update(db().collection(COL.cards).doc(cardId), { status: "published", publishedAt, lastEditedBy: who.uid, ...extra });
  await batch.commit();
  return { publishedAt: publishedAt.toISOString(), slug: card.slug, clientId: card.clientId };
}

async function loadCard(cardId: string) {
  const snap = await db().collection(COL.cards).doc(cardId).get();
  if (!snap.exists) throw new HttpsError("not-found", "That card doesn't exist anymore.");
  return snap.data() as { slug: string; clientId?: string; permissions?: { clientCanPublish?: boolean; requireReview?: boolean } };
}

async function notifyClient(clientId: string, cardId: string, kind: "review_approved" | "review_changes", title: string, body: string) {
  const nid = randomId("nt");
  await db().collection(COL.notifications).doc(nid).set({ ...encode({ id: nid, clientId, cardId, kind, title, body, read: false, emailed: false }), at: new Date() });
}

export const publishCard = onCall({ enforceAppCheck }, async (req) => {
  const who = caller(req);
  const { cardId } = parse(z.object({ cardId: id }), req.data);
  const card = await loadCard(cardId);
  if (who.role === "client" && (who.cardId !== cardId || card.clientId !== who.clientId || !card.permissions?.clientCanPublish)) {
    throw new HttpsError("permission-denied", "Your changes need a review before they go live. Use Submit for review.");
  }
  const r = await publish(cardId, who);
  return { publishedAt: r.publishedAt, slug: r.slug };
});

export const unpublishCard = onCall({ enforceAppCheck }, async (req) => {
  const who = requireAdmin(req);
  const { cardId } = parse(z.object({ cardId: id }), req.data);
  const card = await loadCard(cardId);
  const batch = db().batch();
  batch.delete(db().collection(COL.publicCards).doc(card.slug));
  batch.update(db().collection(COL.cards).doc(cardId), { status: "draft", lastEditedBy: who.uid, updatedAt: FieldValue.serverTimestamp() });
  await batch.commit();
  return { slug: card.slug };
});

export const submitForReview = onCall({ enforceAppCheck }, async (req) => {
  const who = requireClient(req);
  const { cardId } = parse(z.object({ cardId: id }), req.data);
  const card = await loadCard(cardId);
  if (who.cardId !== cardId || card.clientId !== who.clientId) throw new HttpsError("permission-denied", "That isn't your card.");
  const submittedAt = new Date();
  await db().collection(COL.cards).doc(cardId).update({ review: { status: "pending", submittedAt }, lastEditedBy: who.uid });
  return { submittedAt: submittedAt.toISOString() };
});

export const reviewDecision = onCall({ enforceAppCheck }, async (req) => {
  const who = requireAdmin(req);
  const { cardId, decision, note } = parse(
    z.object({ cardId: id, decision: z.enum(["approve", "changes"]), note: z.string().trim().max(1000).optional() }),
    req.data,
  );
  const card = await loadCard(cardId);
  const doc = (await db().collection(COL.cards).doc(cardId).get()).data() as { review?: { submittedAt?: unknown } };
  const submittedAt = doc.review?.submittedAt ?? new Date();
  const resolvedAt = new Date();
  if (decision === "approve") {
    const r = await publish(cardId, who, { review: { status: "approved", submittedAt, resolvedAt } });
    if (card.clientId) await notifyClient(card.clientId, cardId, "review_approved", "Your changes are live", `${BRAND.name} reviewed and published your latest edits.`);
    return { publishedAt: r.publishedAt, slug: r.slug };
  }
  if (!note) throw new HttpsError("invalid-argument", "Say what should change, so the client knows what to fix.");
  await db().collection(COL.cards).doc(cardId).update({ review: { status: "changes_requested", submittedAt, resolvedAt, note }, lastEditedBy: who.uid });
  if (card.clientId) await notifyClient(card.clientId, cardId, "review_changes", "Changes requested", note);
  return { slug: card.slug };
});

/**
 * An admin applied a paid template to a client's card: it is unlocked for that card
 * (a comp), so the card can be published on it and the client can switch back to it.
 * `unlocked: false` takes it back (Undo right after applying).
 */
export const setTemplateUnlock = onCall({ enforceAppCheck }, async (req) => {
  requireAdmin(req);
  const { cardId, templateId, unlocked } = parse(z.object({ cardId: id, templateId: z.string().min(1).max(64), unlocked: z.boolean() }), req.data);
  if (!hasTemplate(templateId)) throw new HttpsError("invalid-argument", "That template doesn't exist.");
  const card = await loadCard(cardId);
  if (!card.clientId) return { unlockedTemplateIds: [] as string[] };
  const ref = db().collection(COL.entitlements).doc(cardId);
  await ref.set({ unlockedTemplateIds: unlocked ? FieldValue.arrayUnion(templateId) : FieldValue.arrayRemove(templateId), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  const after = (await ref.get()).data() as { unlockedTemplateIds?: string[] } | undefined;
  return { unlockedTemplateIds: after?.unlockedTemplateIds ?? [] };
});
