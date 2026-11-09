import "./setup";
/**
 * Template requests: a client asks for a paid template; the studio sends payment
 * details, marks it paid, approves it free, or declines. Unlocks and the client's
 * notifications are written here, so they never depend on the browser.
 *
 *   requestTemplate              client: ask for a paid template (optional note)
 *   cancelTemplateRequest        client: withdraw an open request
 *   applyTemplateAsClient        client: switch their card to a template they may use
 *   sendTemplatePaymentDetails   admin: email payment details → awaiting_payment
 *   markTemplateRequestPaid      admin: payment received → unlocked
 *   compTemplateRequest          admin: approve free → unlocked
 *   declineTemplateRequest       admin: decline with a note the client sees
 *   undoTemplateRequestAction    admin: Undo of the last action (status, unlock, notification)
 *
 * The request document is the client-visible history (firestore.rules: admins and
 * the owning client read it; only Functions write it).
 */
import { randomBytes } from "node:crypto";
import { FieldValue, getFirestore, type DocumentReference } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { z } from "zod";
import { emailSentOnBehalf } from "@/lib/brand";
import { canApplyTemplate, OPEN_REQUEST, templatePricing } from "@/lib/entitlements";
import { COL, encode } from "@/lib/firebase/model";
import { WORKSPACE } from "@/lib/mock/workspace";
import { formatPeso } from "@/lib/pricing";
import { id } from "@/lib/schemas";
import type { TemplateRequest } from "@/lib/types";
import { getTemplate, hasTemplate, lookFor } from "@/templates/registry";
import { parse, requireAdmin, requireClient } from "./guards";
import { queueMail, simpleHtml } from "./mail";
import { enforceAppCheck, isEmulator } from "./params";
import { pricing } from "./unlocks";

const db = () => getFirestore();
const randomId = (prefix: string) => `${prefix}_${randomBytes(6).toString("base64url").replace(/[^A-Za-z0-9]/g, "x")}`;
const mailReady = () => isEmulator || process.env.MAIL_ENABLED === "true";
const templateId = z.string().min(1).max(64).refine(hasTemplate, "That template doesn't exist.");

type RequestDoc = Omit<TemplateRequest, "id"> & {
  /** What the last admin action changed, so Undo can put it back. */
  undo?: { fields: Record<string, unknown>; notificationId?: string; unlocked?: boolean } | null;
};

async function unlockedFor(cardId: string): Promise<string[]> {
  return ((await db().collection(COL.entitlements).doc(cardId).get()).get("unlockedTemplateIds") as string[] | undefined) ?? [];
}

async function loadRequest(requestId: string): Promise<{ ref: DocumentReference; r: RequestDoc }> {
  const ref = db().collection(COL.templateRequests).doc(requestId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "This request no longer exists.");
  return { ref, r: snap.data() as RequestDoc };
}

function requireOpen(r: RequestDoc) {
  if (!OPEN_REQUEST.includes(r.status)) throw new HttpsError("failed-precondition", "This request was already handled. Refresh to see its status.");
}

function notification(r: RequestDoc, requestId: string, kind: string, title: string, body: string) {
  const nid = randomId("nt");
  const doc = { ...encode({ id: nid, clientId: r.clientId, cardId: r.cardId, kind, requestId, title, body, read: false, emailed: false }), at: new Date() };
  return { nid, ref: db().collection(COL.notifications).doc(nid), doc };
}

/** The request fields an action is about to change, as they are now (absent → delete on Undo). */
function before(r: RequestDoc, keys: (keyof RequestDoc)[]): Record<string, unknown> {
  return Object.fromEntries(keys.map((k) => [k, r[k] ?? null]));
}

/* ------------------------------------------------------------- client */

export const requestTemplate = onCall({ enforceAppCheck }, async (req) => {
  const who = requireClient(req);
  const input = parse(z.object({ cardId: id, templateId, themeId: z.string().max(64).optional(), note: z.string().trim().max(500).optional() }), req.data);
  if (who.cardId !== input.cardId) throw new HttpsError("permission-denied", "That isn't your card.");
  const p = templatePricing(input.templateId, await pricing());
  if (p.tier !== "paid") throw new HttpsError("failed-precondition", `${getTemplate(input.templateId).name} is free. You can use it right away.`);
  if ((await unlockedFor(input.cardId)).includes(input.templateId)) throw new HttpsError("failed-precondition", `${getTemplate(input.templateId).name} is already unlocked for your card.`);
  // A card has a handful of requests: filter here rather than needing a composite index.
  const mine = await db().collection(COL.templateRequests).where("cardId", "==", input.cardId).get();
  const open = mine.docs.some((d) => d.get("templateId") === input.templateId && OPEN_REQUEST.includes(d.get("status")));
  if (open) throw new HttpsError("already-exists", `You already asked for ${getTemplate(input.templateId).name}. We'll get back to you soon.`);
  const themeId = getTemplate(input.templateId).themes.some((t) => t.id === input.themeId) ? input.themeId : undefined;
  const requestId = randomId("tr");
  const doc: Omit<TemplateRequest, "id"> = {
    clientId: who.clientId, cardId: input.cardId, templateId: input.templateId, themeId, price: p.price ?? 0, currency: "PHP",
    note: input.note || undefined, status: "pending", requestedAt: new Date().toISOString(),
  };
  await db().collection(COL.templateRequests).doc(requestId).set({ ...encode(doc), createdAt: FieldValue.serverTimestamp() });
  return { ...doc, id: requestId };
});

export const cancelTemplateRequest = onCall({ enforceAppCheck }, async (req) => {
  const who = requireClient(req);
  const { requestId } = parse(z.object({ requestId: id }), req.data);
  const { ref, r } = await loadRequest(requestId);
  if (r.clientId !== who.clientId) throw new HttpsError("permission-denied", "That isn't your request.");
  requireOpen(r);
  await ref.update({ status: "cancelled", resolvedAt: new Date().toISOString(), undo: null });
  return { ok: true };
});

/**
 * A client switches their card to a template: the Default, a free one, or one
 * unlocked for the card (the same guard as the editor). Clients never set
 * custom colors, fonts or buttons: the template's own look is applied.
 */
export const applyTemplateAsClient = onCall({ enforceAppCheck }, async (req) => {
  const who = requireClient(req);
  const input = parse(z.object({ cardId: id, templateId, themeId: z.string().max(64).optional() }), req.data);
  if (who.cardId !== input.cardId) throw new HttpsError("permission-denied", "That isn't your card.");
  const ref = db().collection(COL.cards).doc(input.cardId);
  const card = await ref.get();
  if (!card.exists || card.get("clientId") !== who.clientId) throw new HttpsError("permission-denied", "That isn't your card.");
  const ent = { cardId: input.cardId, unlockedTemplateIds: await unlockedFor(input.cardId) };
  if (!canApplyTemplate("client", ent, await pricing(), input.templateId)) {
    throw new HttpsError("permission-denied", `${getTemplate(input.templateId).name} is locked. Request it to use it on your card.`);
  }
  const look = lookFor(getTemplate(input.templateId), input.themeId);
  await ref.update({
    templateId: look.templateId, themeId: look.themeId, fontPairingId: look.fontPairingId, buttonShape: look.buttonShape, buttonFill: look.buttonFill,
    customTokens: FieldValue.delete(), updatedAt: FieldValue.serverTimestamp(), lastEditedBy: who.uid, lastEditedSections: ["Design"],
  });
  return { templateId: look.templateId, themeId: look.themeId };
});

/* -------------------------------------------------------------- admin */

export const sendTemplatePaymentDetails = onCall({ enforceAppCheck }, async (req) => {
  requireAdmin(req);
  const { requestId, subject, body } = parse(z.object({ requestId: id, subject: z.string().trim().min(1).max(200), body: z.string().trim().min(1).max(5000) }), req.data);
  const { ref, r } = await loadRequest(requestId);
  requireOpen(r);
  const client = (await db().collection(COL.clients).doc(r.clientId).get()).data() as { email?: string } | undefined;
  if (!client?.email) throw new HttpsError("failed-precondition", "This client has no email address.");
  if (!mailReady()) throw new HttpsError("failed-precondition", "Sending email isn't set up yet.");
  const name = getTemplate(r.templateId).name;
  const sentAt = new Date().toISOString();
  const methods = WORKSPACE.payment.map((p) => p.method).join(", ").replace(/, ([^,]*)$/, " or $1");
  const n = notification(r, requestId, "payment_requested", `Payment details for ${name}`, `Pay ${formatPeso(r.price)} by ${methods}. ${name} unlocks as soon as payment is confirmed.`);
  const batch = db().batch();
  batch.update(ref, { status: "awaiting_payment", paymentRequestedAt: sentAt, undo: { fields: before(r, ["status", "paymentRequestedAt"]), notificationId: n.nid } });
  batch.set(n.ref, n.doc);
  await batch.commit();
  const company = WORKSPACE.company;
  await queueMail(`payment_${requestId}_${Date.now()}`, { to: client.email, subject, text: `${body}\n\n${emailSentOnBehalf(company)}`, html: simpleHtml(body.split(/\n{2,}/), undefined, emailSentOnBehalf(company)) });
  return { sentAt };
});

/** Unlocks the request's template for the card and resolves the request, with an Undo record. */
async function resolveWithUnlock(requestId: string, fields: Record<string, unknown>, noticeBody: (name: string) => string) {
  const { ref, r } = await loadRequest(requestId);
  requireOpen(r);
  const name = getTemplate(r.templateId).name;
  const entRef = db().collection(COL.entitlements).doc(r.cardId);
  const n = notification(r, requestId, "template_unlocked", `${name} is unlocked`, noticeBody(name));
  await db().runTransaction(async (tx) => {
    const unlocked = ((await tx.get(entRef)).get("unlockedTemplateIds") as string[] | undefined) ?? [];
    const adds = !unlocked.includes(r.templateId);
    tx.update(ref, { ...fields, resolvedAt: new Date().toISOString(), undo: { fields: before(r, [...(Object.keys(fields) as (keyof RequestDoc)[]), "resolvedAt"]), notificationId: n.nid, unlocked: adds } });
    if (adds) tx.set(entRef, { unlockedTemplateIds: FieldValue.arrayUnion(r.templateId), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    tx.set(n.ref, n.doc);
  });
  return { ok: true };
}

export const markTemplateRequestPaid = onCall({ enforceAppCheck }, async (req) => {
  requireAdmin(req);
  const { requestId, amount, reference } = parse(z.object({ requestId: id, amount: z.number().min(0).max(1_000_000), reference: z.string().trim().max(120).optional() }), req.data);
  return resolveWithUnlock(
    requestId,
    { status: "paid", paidAmount: amount, ...(reference ? { paymentRef: reference } : {}) },
    (name) => `Payment received, thank you. Tap Apply now to switch your card to ${name}, or do it later from Design. You can switch back any time.`,
  );
});

export const compTemplateRequest = onCall({ enforceAppCheck }, async (req) => {
  requireAdmin(req);
  const { requestId, reason } = parse(z.object({ requestId: id, reason: z.string().trim().max(500) }), req.data);
  return resolveWithUnlock(requestId, { status: "approved", compReason: reason }, (name) => `${name} is yours, no charge. Tap Apply now to use it, or find it later in Design.`);
});

export const declineTemplateRequest = onCall({ enforceAppCheck }, async (req) => {
  requireAdmin(req);
  const { requestId, note } = parse(z.object({ requestId: id, note: z.string().trim().min(1, "Say why, so the client understands.").max(1000) }), req.data);
  const { ref, r } = await loadRequest(requestId);
  requireOpen(r);
  const name = getTemplate(r.templateId).name;
  const n = notification(r, requestId, "request_declined", `${name} wasn’t approved`, note);
  const batch = db().batch();
  batch.update(ref, { status: "declined", resolvedAt: new Date().toISOString(), adminNote: note, undo: { fields: before(r, ["status", "resolvedAt", "adminNote"]), notificationId: n.nid } });
  batch.set(n.ref, n.doc);
  await batch.commit();
  return { ok: true };
});

/**
 * Undo the last admin action on a request: its fields go back, the notification
 * it sent is withdrawn, and an unlock it added is taken back unless the card is
 * already using that template. A payment email already sent can't be unsent.
 */
export const undoTemplateRequestAction = onCall({ enforceAppCheck }, async (req) => {
  requireAdmin(req);
  const { requestId } = parse(z.object({ requestId: id }), req.data);
  const { ref, r } = await loadRequest(requestId);
  const u = r.undo;
  if (!u) throw new HttpsError("failed-precondition", "There's nothing to undo on this request anymore.");
  const card = await db().collection(COL.cards).doc(r.cardId).get();
  const restore = Object.fromEntries(Object.entries(u.fields).map(([k, v]) => [k, v === null ? FieldValue.delete() : v]));
  const batch = db().batch();
  batch.update(ref, { ...restore, undo: null });
  if (u.notificationId) batch.delete(db().collection(COL.notifications).doc(u.notificationId));
  if (u.unlocked && card.get("templateId") !== r.templateId) {
    batch.set(db().collection(COL.entitlements).doc(r.cardId), { unlockedTemplateIds: FieldValue.arrayRemove(r.templateId), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  }
  await batch.commit();
  return { ok: true };
});
