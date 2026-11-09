import "./setup";
/**
 * Template requests and QR payments (GoTyme Bank · InstaPay).
 *
 * QR payments on (settings/payment.enabled):
 *   pending_payment ─submit→ payment_submitted ─approve→ approved (unlocked AND applied to the card)
 *   payment_submitted ─reject→ payment_rejected ─submit→ payment_submitted
 *   any open ─decline→ declined · pending_payment ─cancel (client)→ cancelled
 *   pending_payment | payment_rejected ─approve with a "no proof" reason→ approved
 * QR payments off (manual flow): pending ─send details→ awaiting_payment ─mark paid→ paid · comp → approved.
 *
 * Every transition is a transaction that re-reads the request and checks the status it
 * moves from. templateRequestLocks/{cardId}__{templateId} keeps one open request per card
 * and template. Admin actions keep an Undo record for UNDO_MS, valid only while the
 * status is still the one the action set; any client action clears it.
 * Emails go out from onTemplateRequestWrite (request-emails.ts).
 *
 * Privacy: reference numbers, receipt paths and account digits are never logged.
 */
import { randomBytes } from "node:crypto";
import { FieldValue, getFirestore, type DocumentData, type DocumentReference, type Transaction } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { logger } from "firebase-functions";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { z } from "zod";
import { emailSentOnBehalf } from "@/lib/brand";
import { canApplyTemplate, NEEDS_PAYMENT, OPEN_REQUEST, templatePricing } from "@/lib/entitlements";
import { COL, SETTINGS, encode } from "@/lib/firebase/model";
import { WORKSPACE } from "@/lib/mock/workspace";
import { formatPeso } from "@/lib/pricing";
import { id, paymentSettings as paymentSettingsSchema, paymentSubmission } from "@/lib/schemas";
import type { PaymentSettings, PaymentSettingsPublic, PreviousLook, TemplateRequest, TemplateRequestStatus } from "@/lib/types";
import { getTemplate, hasTemplate, lookFor } from "@/templates/registry";
import { caller, parse, requireAdmin, requireClient } from "./guards";
import { queueMail, simpleHtml } from "./mail";
import { enforceAppCheck, isEmulator } from "./params";
import { pricing } from "./unlocks";

const db = () => getFirestore();
export const MEDIA_BUCKET = "tapik-ph-media";
const bucket = () => getStorage().bucket(MEDIA_BUCKET);
const randomId = (prefix: string) => `${prefix}_${randomBytes(6).toString("base64url").replace(/[^A-Za-z0-9]/g, "x")}`;
const mailReady = () => isEmulator || process.env.MAIL_ENABLED === "true";
const templateIdSchema = z.string().min(1).max(64).refine(hasTemplate, "That template doesn't exist.");
const nowIso = () => new Date().toISOString();

/** How long an admin action can be undone (the toast shows 10 s; the margin covers the round trip). */
export const UNDO_MS = 15_000;

export type UndoRecord = {
  action: "approve" | "reject" | "decline" | "payment_details" | "paid" | "comp";
  /** The status the action set: Undo is valid only while the request is still in it. */
  setStatus: TemplateRequestStatus;
  expiresAt: number;
  /** Request fields as they were (null = absent). */
  fields: Record<string, unknown>;
  notificationId?: string;
  /** The action added the unlock (take it back on Undo). */
  unlocked?: boolean;
  /** The action closed the request (recreate the lock on Undo). */
  closed?: boolean;
};

export type RequestDoc = Omit<TemplateRequest, "id" | "payment"> & {
  payment?: TemplateRequest["payment"] & { attempt?: number };
  amountMismatch?: boolean;
  undo?: UndoRecord | null;
};

const LOOK_KEYS = ["templateId", "themeId", "fontPairingId", "buttonShape", "buttonFill"] as const;

const lockRef = (cardId: string, templateId: string) => db().collection(COL.templateRequestLocks).doc(`${cardId}__${templateId}`);
const requestRef = (requestId: string) => db().collection(COL.templateRequests).doc(requestId);

async function txRequest(tx: Transaction, requestId: string): Promise<{ ref: DocumentReference; r: RequestDoc }> {
  const ref = requestRef(requestId);
  const snap = await tx.get(ref);
  if (!snap.exists) throw new HttpsError("not-found", "This request no longer exists.");
  return { ref, r: snap.data() as RequestDoc };
}

function requireStatus(r: RequestDoc, allowed: TemplateRequestStatus[], expected?: TemplateRequestStatus) {
  if (!allowed.includes(r.status) || (expected && r.status !== expected)) {
    throw new HttpsError("failed-precondition", "This request changed in the meantime. Refresh to see where it stands.");
  }
}

function notification(r: RequestDoc, requestId: string, kind: string, title: string, body: string) {
  const nid = randomId("nt");
  const doc = { ...encode({ id: nid, clientId: r.clientId, cardId: r.cardId, kind, requestId, title, body, read: false, emailed: false }), at: new Date() };
  return { nid, ref: db().collection(COL.notifications).doc(nid), doc };
}

/** The request fields an action is about to change, as they are now (null = absent, deleted on Undo). */
function before(r: RequestDoc, keys: string[]): Record<string, unknown> {
  const rec = r as unknown as Record<string, unknown>;
  return Object.fromEntries(keys.map((k) => [k, rec[k] ?? null]));
}

const undoRecord = (u: Omit<UndoRecord, "expiresAt">): UndoRecord => ({ ...u, expiresAt: Date.now() + UNDO_MS });

/* ------------------------------------------------------------ settings */

const DEFAULT_SETTINGS: PaymentSettings = {
  enabled: false,
  channelLabel: "GoTyme Bank · InstaPay",
  accountName: "",
  accountLast4: "",
  instructions: "Open your bank or e-wallet app, choose InstaPay or Scan QR, and scan or upload this QR code. Pay the exact amount shown.",
};

export async function paymentSettings(): Promise<PaymentSettings> {
  const d = (await db().collection(COL.settings).doc(SETTINGS.payment).get()).data() as Partial<PaymentSettings> | undefined;
  return { ...DEFAULT_SETTINGS, ...d } as PaymentSettings;
}

const qrOn = (s: PaymentSettings) => s.enabled && !!s.qrStoragePath;

function publicSettings(s: PaymentSettings): PaymentSettingsPublic {
  return { enabled: qrOn(s), channelLabel: s.channelLabel, accountName: s.accountName, accountLast4: s.accountLast4, instructions: s.instructions };
}

async function dataUrl(path: string): Promise<string> {
  const file = bucket().file(path);
  const [[meta], [buf]] = await Promise.all([file.getMetadata(), file.download()]);
  return `data:${meta.contentType ?? "image/jpeg"};base64,${buf.toString("base64")}`;
}

const QR_PATH = /^settings\/payment\/[A-Za-z0-9._-]{1,80}$/;

/** Admin: save the payment settings. A full account number is never stored (last 4 digits only). */
export const savePaymentSettings = onCall({ enforceAppCheck }, async (req) => {
  const admin = requireAdmin(req);
  const input = parse(paymentSettingsSchema.extend({ qrStoragePath: z.string().regex(QR_PATH).optional() }), req.data);
  const cur = await paymentSettings();
  const newQr = input.qrStoragePath && input.qrStoragePath !== cur.qrStoragePath ? input.qrStoragePath : null;
  if (newQr) {
    const [exists] = await bucket().file(newQr).exists();
    if (!exists) throw new HttpsError("failed-precondition", "The QR image didn't finish uploading. Try again.");
  }
  if (input.enabled && !(newQr ?? cur.qrStoragePath)) throw new HttpsError("failed-precondition", "Upload the QR code before turning on QR payments.");
  const next: Record<string, unknown> = {
    enabled: input.enabled, channelLabel: input.channelLabel, accountName: input.accountName, accountLast4: input.accountLast4, instructions: input.instructions,
    updatedAt: FieldValue.serverTimestamp(), updatedBy: admin.uid,
  };
  if (newQr) {
    next.qrStoragePath = newQr;
    next.previousQrStoragePath = cur.qrStoragePath ?? FieldValue.delete();
  }
  await db().collection(COL.settings).doc(SETTINGS.payment).set(next, { merge: true });
  return { ok: true };
});

/** Admin: the full settings (with QR paths), for the Payment settings screen. */
export const getPaymentSettings = onCall({ enforceAppCheck }, async (req) => {
  requireAdmin(req);
  const s = await paymentSettings();
  return { ...publicSettings(s), enabled: s.enabled, qrStoragePath: s.qrStoragePath ?? null, previousQrStoragePath: s.previousQrStoragePath ?? null };
});

/**
 * The QR as a data: URL, to admins and to clients with an open request. Never a public
 * URL: no signBlob IAM grant, no bucket CORS, no permanent download token. `version`
 * lets the browser keep it per upload.
 */
export const getPaymentQr = onCall({ enforceAppCheck }, async (req) => {
  const who = caller(req);
  const { path } = parse(z.object({ path: z.string().regex(QR_PATH).optional() }), req.data ?? {});
  const s = await paymentSettings();
  if (who.role === "client") {
    const mine = await db().collection(COL.templateRequests).where("cardId", "==", who.cardId).get();
    if (!mine.docs.some((d) => OPEN_REQUEST.includes(d.get("status")))) throw new HttpsError("permission-denied", "There's no payment waiting on your card.");
  }
  // Admins may preview the previous upload too (Payment settings, "Restore previous").
  const target = who.role === "admin" && path && (path === s.qrStoragePath || path === s.previousQrStoragePath) ? path : s.qrStoragePath;
  if (!target) throw new HttpsError("failed-precondition", "No QR code has been uploaded yet.");
  return { dataUrl: await dataUrl(target), version: target, settings: publicSettings(s) };
});

/* ------------------------------------------------------------- client */

/**
 * Ask for a paid template. Creates it as pending_payment when QR payments are on
 * (pending when off); returns the open request instead if there is one already.
 * The price always comes from the template pricing.
 */
export const requestTemplate = onCall({ enforceAppCheck }, async (req) => {
  const who = requireClient(req);
  const input = parse(z.object({ cardId: id, templateId: templateIdSchema, themeId: z.string().max(64).optional(), note: z.string().trim().max(500).optional() }), req.data);
  if (who.cardId !== input.cardId) throw new HttpsError("permission-denied", "That isn't your card.");
  const name = getTemplate(input.templateId).name;
  const p = templatePricing(input.templateId, await pricing());
  if (p.tier !== "paid") throw new HttpsError("failed-precondition", `${name} is free. You can use it right away.`);
  const settings = await paymentSettings();
  const themeId = getTemplate(input.templateId).themes.some((t) => t.id === input.themeId) ? input.themeId : undefined;
  const entRef = db().collection(COL.entitlements).doc(input.cardId);
  const lock = lockRef(input.cardId, input.templateId);

  const result = await db().runTransaction(async (tx) => {
    const [lockSnap, ent] = await Promise.all([tx.get(lock), tx.get(entRef)]);
    if (((ent.get("unlockedTemplateIds") as string[] | undefined) ?? []).includes(input.templateId)) {
      throw new HttpsError("failed-precondition", `${name} is already unlocked for your card.`);
    }
    // One open request per card and template: a second tap opens the existing one.
    const lockedId = lockSnap.get("requestId") as string | undefined;
    if (lockedId) {
      const existing = await tx.get(requestRef(lockedId));
      if (existing.exists && OPEN_REQUEST.includes(existing.get("status"))) return { requestId: lockedId, created: false };
    }
    const requestId = randomId("tr");
    const doc: Omit<TemplateRequest, "id"> = {
      clientId: who.clientId, cardId: input.cardId, templateId: input.templateId, themeId, price: p.price ?? 0, currency: "PHP",
      note: input.note || undefined, status: qrOn(settings) ? "pending_payment" : "pending", requestedAt: nowIso(),
    };
    tx.set(requestRef(requestId), { ...encode(doc), updatedAt: FieldValue.serverTimestamp(), createdAt: FieldValue.serverTimestamp() });
    tx.set(lock, { requestId, createdAt: FieldValue.serverTimestamp() });
    return { requestId, created: true };
  });
  const snap = await requestRef(result.requestId).get();
  logger.info("template request", { requestId: result.requestId, created: result.created });
  return { requestId: result.requestId, status: snap.get("status") as TemplateRequestStatus, created: result.created, payment: publicSettings(settings) };
});

/** The client withdraws a request before paying (never after a payment was submitted). */
export const cancelTemplateRequest = onCall({ enforceAppCheck }, async (req) => {
  const who = requireClient(req);
  const { requestId } = parse(z.object({ requestId: id }), req.data);
  await db().runTransaction(async (tx) => {
    const { ref, r } = await txRequest(tx, requestId);
    if (r.clientId !== who.clientId) throw new HttpsError("permission-denied", "That isn't your request.");
    if (!["pending_payment", "pending", "awaiting_payment"].includes(r.status)) {
      throw new HttpsError("failed-precondition", r.status === "payment_submitted" ? "Your payment is being verified, so the request can't be cancelled now." : "This request can't be cancelled anymore.");
    }
    tx.update(ref, { status: "cancelled", resolvedAt: nowIso(), undo: null, updatedAt: FieldValue.serverTimestamp() });
    tx.delete(lockRef(r.cardId, r.templateId));
  });
  return { ok: true };
});

/**
 * The client says they paid: reference number, amount, when, and the receipt they just
 * uploaded to paymentProofs/{clientId}/{requestId}/… (Storage rules let only them create it).
 */
export const submitTemplatePayment = onCall({ enforceAppCheck }, async (req) => {
  const who = requireClient(req);
  const input = parse(paymentSubmission.extend({ requestId: id, proofPath: z.string().max(300) }), req.data);
  const prefix = `paymentProofs/${who.clientId}/${input.requestId}/`;
  if (!input.proofPath.startsWith(prefix) || input.proofPath.slice(prefix.length).includes("/")) throw new HttpsError("invalid-argument", "Upload the receipt again.");
  if (Date.parse(input.paidAt) > Date.now() + 5 * 60_000) throw new HttpsError("invalid-argument", "The payment time is in the future. Check the date on your receipt.");
  const [meta] = await bucket().file(input.proofPath).getMetadata().catch(() => [null]);
  if (!meta || !/^image\//.test(meta.contentType ?? "") || Number(meta.size) > 10 * 1024 * 1024) {
    throw new HttpsError("failed-precondition", "The receipt didn't finish uploading. Add it again.");
  }
  await db().runTransaction(async (tx) => {
    const { ref, r } = await txRequest(tx, input.requestId);
    const ent = await tx.get(db().collection(COL.entitlements).doc(r.cardId));
    if (r.clientId !== who.clientId) throw new HttpsError("permission-denied", "That isn't your request.");
    requireStatus(r, NEEDS_PAYMENT);
    if (((ent.get("unlockedTemplateIds") as string[] | undefined) ?? []).includes(r.templateId)) {
      throw new HttpsError("failed-precondition", `${getTemplate(r.templateId).name} is already unlocked for your card, so there's nothing to pay.`);
    }
    const attempt = (r.payment?.attempt ?? 0) + 1;
    tx.update(ref, {
      status: "payment_submitted",
      payment: { referenceNo: input.referenceNo.toUpperCase(), amountPaid: input.amountPaid, paidAt: input.paidAt, proofPath: input.proofPath, submittedAt: nowIso(), attempt },
      amountMismatch: Math.round(input.amountPaid) !== Math.round(r.price),
      undo: null,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
  logger.info("payment submitted", { requestId: input.requestId });
  return { ok: true };
});

/** The client's own receipt or, for admins, the proof under review, as a data: URL. */
export const getPaymentProof = onCall({ enforceAppCheck }, async (req) => {
  const who = caller(req);
  const { requestId } = parse(z.object({ requestId: id }), req.data);
  const r = (await requestRef(requestId).get()).data() as RequestDoc | undefined;
  if (!r || (who.role === "client" && r.clientId !== who.clientId)) throw new HttpsError("not-found", "This request no longer exists.");
  const path = r.payment?.proofPath;
  if (!path) throw new HttpsError("not-found", "There's no receipt on this request (receipts are deleted after a year).");
  return { dataUrl: await dataUrl(path) };
});

/** The client puts their card back on the template it had before an approved request was applied. The unlock stays. */
export const undoTemplateApply = onCall({ enforceAppCheck }, async (req) => {
  const who = requireClient(req);
  const { cardId } = parse(z.object({ cardId: id }), req.data);
  if (who.cardId !== cardId) throw new HttpsError("permission-denied", "That isn't your card.");
  const cardRef = db().collection(COL.cards).doc(cardId);
  const prices = await pricing();
  const slug = await db().runTransaction(async (tx) => {
    const card = await tx.get(cardRef);
    const prev = card.get("previousLook") as PreviousLook | undefined;
    if (!card.exists || card.get("clientId") !== who.clientId || !prev) throw new HttpsError("failed-precondition", "There's nothing to undo on your card.");
    const ent = await tx.get(db().collection(COL.entitlements).doc(cardId));
    const unlocked = (ent.get("unlockedTemplateIds") as string[] | undefined) ?? [];
    if (!canApplyTemplate("client", { cardId, unlockedTemplateIds: unlocked }, prices, prev.templateId)) {
      throw new HttpsError("failed-precondition", `${getTemplate(prev.templateId).name} isn't available on your card anymore.`);
    }
    const slug = card.get("slug") as string;
    const pub = await tx.get(db().collection(COL.publicCards).doc(slug));
    const reqSnap = await tx.get(requestRef(prev.requestId));
    applyLook(tx, cardRef, prev, who.uid, { previousLook: FieldValue.delete() });
    if (pub.exists) patchSnapshotLook(tx, pub.ref, prev);
    // The client acted: the studio's Undo no longer applies.
    if (reqSnap.exists) tx.update(reqSnap.ref, { undo: null });
    return pub.exists ? slug : null;
  });
  return { slug };
});

/**
 * A client switches their card to a template: the Default, a free one, or one unlocked
 * for the card (the same guard as the editor). Clients never set custom colors, fonts
 * or buttons: the template's own look is applied.
 */
export const applyTemplateAsClient = onCall({ enforceAppCheck }, async (req) => {
  const who = requireClient(req);
  const input = parse(z.object({ cardId: id, templateId: templateIdSchema, themeId: z.string().max(64).optional() }), req.data);
  if (who.cardId !== input.cardId) throw new HttpsError("permission-denied", "That isn't your card.");
  const cardRef = db().collection(COL.cards).doc(input.cardId);
  const prices = await pricing();
  const look = lookFor(getTemplate(input.templateId), input.themeId);
  await db().runTransaction(async (tx) => {
    const [card, ent] = await Promise.all([tx.get(cardRef), tx.get(db().collection(COL.entitlements).doc(input.cardId))]);
    if (!card.exists || card.get("clientId") !== who.clientId) throw new HttpsError("permission-denied", "That isn't your card.");
    const unlocked = (ent.get("unlockedTemplateIds") as string[] | undefined) ?? [];
    if (!canApplyTemplate("client", { cardId: input.cardId, unlockedTemplateIds: unlocked }, prices, input.templateId)) {
      throw new HttpsError("permission-denied", `${getTemplate(input.templateId).name} is locked. Request it to use it on your card.`);
    }
    applyLook(tx, cardRef, { ...look, customTokens: undefined }, who.uid);
  });
  return { templateId: look.templateId, themeId: look.themeId };
});

/* ------------------------------------------------------------ the look */

type Look = Pick<PreviousLook, "templateId" | "themeId" | "fontPairingId" | "buttonShape" | "buttonFill" | "customTokens">;

function applyLook(tx: Transaction, cardRef: DocumentReference, look: Look, uid: string, extra: Record<string, unknown> = {}) {
  tx.update(cardRef, {
    templateId: look.templateId, themeId: look.themeId, fontPairingId: look.fontPairingId, buttonShape: look.buttonShape, buttonFill: look.buttonFill,
    customTokens: look.customTokens ?? FieldValue.delete(),
    updatedAt: FieldValue.serverTimestamp(), lastEditedBy: uid, lastEditedSections: ["Design"],
    ...extra,
  });
}

/** Only the look of the live card changes: unreviewed draft edits never go live this way. */
function patchSnapshotLook(tx: Transaction, pubRef: DocumentReference, look: Look) {
  const set: Record<string, unknown> = {};
  for (const k of LOOK_KEYS) set[`bundle.card.${k}`] = look[k];
  set["bundle.card.customTokens"] = look.customTokens ?? FieldValue.delete();
  tx.update(pubRef, set);
}

function lookOf(card: DocumentData, requestId: string): PreviousLook {
  return {
    requestId, appliedAt: nowIso(), templateId: card.templateId, themeId: card.themeId, fontPairingId: card.fontPairingId, buttonShape: card.buttonShape, buttonFill: card.buttonFill,
    ...(card.customTokens ? { customTokens: card.customTokens } : {}),
  };
}

/* -------------------------------------------------------------- admin */

/**
 * Unlock the request's template for the card AND apply it (the theme the client previewed),
 * in one transaction with the live card's look. Used by approve, mark paid and comp.
 */
async function approveCore(
  adminUid: string,
  requestId: string,
  opts: { allowed: TemplateRequestStatus[]; expected?: TemplateRequestStatus; status: "approved" | "paid"; action: UndoRecord["action"]; fields: Record<string, unknown> },
) {
  return db().runTransaction(async (tx) => {
    const { ref, r } = await txRequest(tx, requestId);
    requireStatus(r, opts.allowed, opts.expected);
    const cardRef = db().collection(COL.cards).doc(r.cardId);
    const entRef = db().collection(COL.entitlements).doc(r.cardId);
    const [card, ent] = await Promise.all([tx.get(cardRef), tx.get(entRef)]);
    if (!card.exists) throw new HttpsError("not-found", "This client's card no longer exists.");
    const slug = card.get("slug") as string;
    const pub = await tx.get(db().collection(COL.publicCards).doc(slug));
    const name = getTemplate(r.templateId).name;

    const unlocked = (ent.get("unlockedTemplateIds") as string[] | undefined) ?? [];
    const adds = !unlocked.includes(r.templateId);
    if (adds) tx.set(entRef, { unlockedTemplateIds: FieldValue.arrayUnion(r.templateId), updatedAt: FieldValue.serverTimestamp() }, { merge: true });

    // Apply it. The studio may apply any template (canApplyTemplate("admin") is always true),
    // and approval applies it even on cards that need review: the admin is the reviewer.
    const look = lookFor(getTemplate(r.templateId), r.themeId);
    const already = card.get("templateId") === r.templateId;
    if (!already) {
      applyLook(tx, cardRef, { ...look, customTokens: undefined }, adminUid, { previousLook: lookOf(card.data()!, requestId) });
      if (pub.exists) patchSnapshotLook(tx, pub.ref, look);
    }

    const n = notification(r, requestId, "template_applied", `${name} is on your card`, `${name} is unlocked and applied to your card${pub.exists ? ", and your live card shows it now" : ""}. Not quite right? Undo puts your previous template back; ${name} stays unlocked.`);
    tx.set(n.ref, n.doc);
    const resolvedAt = nowIso();
    tx.update(ref, {
      ...opts.fields, status: opts.status, resolvedAt, approvedAt: resolvedAt, updatedAt: FieldValue.serverTimestamp(),
      undo: undoRecord({ action: opts.action, setStatus: opts.status, fields: before(r, ["status", "resolvedAt", "approvedAt", ...Object.keys(opts.fields)]), notificationId: n.nid, unlocked: adds, closed: true }),
    });
    tx.delete(lockRef(r.cardId, r.templateId));
    return { slug: pub.exists ? slug : null, applied: !already };
  });
}

export const approveTemplateRequest = onCall({ enforceAppCheck }, async (req) => {
  const admin = requireAdmin(req);
  const input = parse(z.object({ requestId: id, expectedStatus: z.enum(["payment_submitted", "pending_payment", "payment_rejected"]), reason: z.string().trim().max(500).optional() }), req.data);
  const withoutProof = input.expectedStatus !== "payment_submitted";
  if (withoutProof && !input.reason) throw new HttpsError("invalid-argument", "Say why you're approving it without a payment proof.");
  const r = await approveCore(admin.uid, input.requestId, {
    allowed: ["payment_submitted", "pending_payment", "payment_rejected"],
    expected: input.expectedStatus,
    status: "approved",
    action: "approve",
    fields: withoutProof ? { approvedWithoutProof: input.reason } : {},
  });
  logger.info("template request approved", { requestId: input.requestId, applied: r.applied });
  return r;
});

export const rejectTemplatePayment = onCall({ enforceAppCheck }, async (req) => {
  requireAdmin(req);
  const { requestId, note } = parse(z.object({ requestId: id, note: z.string().trim().min(1, "Tell the client what to fix.").max(1000) }), req.data);
  await db().runTransaction(async (tx) => {
    const { ref, r } = await txRequest(tx, requestId);
    requireStatus(r, ["payment_submitted"]);
    const name = getTemplate(r.templateId).name;
    const n = notification(r, requestId, "payment_rejected", `Please check your payment for ${name}`, note);
    tx.set(n.ref, n.doc);
    tx.update(ref, {
      status: "payment_rejected", "payment.reviewNote": note, updatedAt: FieldValue.serverTimestamp(),
      undo: undoRecord({ action: "reject", setStatus: "payment_rejected", fields: { status: r.status, "payment.reviewNote": r.payment?.reviewNote ?? null }, notificationId: n.nid }),
    });
  });
  return { ok: true };
});

export const declineTemplateRequest = onCall({ enforceAppCheck }, async (req) => {
  requireAdmin(req);
  const { requestId, note } = parse(z.object({ requestId: id, note: z.string().trim().min(1, "Say why, so the client understands.").max(1000) }), req.data);
  await db().runTransaction(async (tx) => {
    const { ref, r } = await txRequest(tx, requestId);
    requireStatus(r, OPEN_REQUEST);
    const name = getTemplate(r.templateId).name;
    const paid = (r.payment?.attempt ?? 0) > 0;
    const body = paid ? `${note}\n\nIf you already paid, ${WORKSPACE.company} will contact you about a refund.` : note;
    const n = notification(r, requestId, "request_declined", `${name} wasn’t approved`, body);
    tx.set(n.ref, n.doc);
    tx.update(ref, {
      status: "declined", resolvedAt: nowIso(), adminNote: note, updatedAt: FieldValue.serverTimestamp(),
      undo: undoRecord({ action: "decline", setStatus: "declined", fields: before(r, ["status", "resolvedAt", "adminNote"]), notificationId: n.nid, closed: true }),
    });
    tx.delete(lockRef(r.cardId, r.templateId));
  });
  return { ok: true };
});

/* --------------------------------------------- manual flow (QR payments off) */

export const sendTemplatePaymentDetails = onCall({ enforceAppCheck }, async (req) => {
  requireAdmin(req);
  const { requestId, subject, body } = parse(z.object({ requestId: id, subject: z.string().trim().min(1).max(200), body: z.string().trim().min(1).max(5000) }), req.data);
  if (!mailReady()) throw new HttpsError("failed-precondition", "Sending email isn't set up yet.");
  const sentAt = nowIso();
  const r = await db().runTransaction(async (tx) => {
    const { ref, r } = await txRequest(tx, requestId);
    requireStatus(r, ["pending", "awaiting_payment"]);
    const name = getTemplate(r.templateId).name;
    const n = notification(r, requestId, "payment_requested", `Payment details for ${name}`, `Pay ${formatPeso(r.price)}. The details are in your email. ${name} unlocks as soon as payment is confirmed.`);
    tx.set(n.ref, n.doc);
    tx.update(ref, {
      status: "awaiting_payment", paymentRequestedAt: sentAt, updatedAt: FieldValue.serverTimestamp(),
      undo: undoRecord({ action: "payment_details", setStatus: "awaiting_payment", fields: before(r, ["status", "paymentRequestedAt"]), notificationId: n.nid }),
    });
    return r;
  });
  const client = (await db().collection(COL.clients).doc(r.clientId).get()).data() as { email?: string } | undefined;
  if (client?.email) {
    await queueMail(`payment_${requestId}_${Date.parse(sentAt)}`, { to: client.email, subject, text: `${body}\n\n${emailSentOnBehalf(WORKSPACE.company)}`, html: simpleHtml(body.split(/\n{2,}/), undefined, emailSentOnBehalf(WORKSPACE.company)) });
  }
  return { sentAt };
});

export const markTemplateRequestPaid = onCall({ enforceAppCheck }, async (req) => {
  const admin = requireAdmin(req);
  const { requestId, amount, reference } = parse(z.object({ requestId: id, amount: z.number().min(0).max(1_000_000), reference: z.string().trim().max(120).optional() }), req.data);
  return approveCore(admin.uid, requestId, { allowed: ["pending", "awaiting_payment"], status: "paid", action: "paid", fields: { paidAmount: amount, ...(reference ? { paymentRef: reference } : {}) } });
});

export const compTemplateRequest = onCall({ enforceAppCheck }, async (req) => {
  const admin = requireAdmin(req);
  const { requestId, reason } = parse(z.object({ requestId: id, reason: z.string().trim().max(500) }), req.data);
  return approveCore(admin.uid, requestId, { allowed: ["pending", "awaiting_payment"], status: "approved", action: "comp", fields: { compReason: reason } });
});

/* --------------------------------------------------------------- undo */

/**
 * Undo the last admin action, within UNDO_MS and only while the request is still where the
 * action left it (any client action clears the record). An approval also puts the card's
 * previous look back (card and live card), unless the client already changed it.
 */
export const undoTemplateRequestAction = onCall({ enforceAppCheck }, async (req) => {
  const admin = requireAdmin(req);
  const { requestId } = parse(z.object({ requestId: id }), req.data);
  return db().runTransaction(async (tx) => {
    const { ref, r } = await txRequest(tx, requestId);
    const u = r.undo;
    if (!u || r.status !== u.setStatus || Date.now() > u.expiresAt) throw new HttpsError("failed-precondition", "It's too late to undo this one.");
    const cardRef = db().collection(COL.cards).doc(r.cardId);
    const card = await tx.get(cardRef);
    const slug = card.get("slug") as string | undefined;
    const pub = slug ? await tx.get(db().collection(COL.publicCards).doc(slug)) : null;
    const lock = u.closed ? await tx.get(lockRef(r.cardId, r.templateId)) : null;
    if (lock?.exists) throw new HttpsError("failed-precondition", "The client has opened a new request for this template, so this can't be undone.");

    const restore = Object.fromEntries(Object.entries(u.fields).map(([k, v]) => [k, v === null ? FieldValue.delete() : v]));
    tx.update(ref, { ...restore, undo: null, updatedAt: FieldValue.serverTimestamp() });
    if (u.notificationId) tx.delete(db().collection(COL.notifications).doc(u.notificationId));
    if (u.closed) tx.set(lockRef(r.cardId, r.templateId), { requestId, createdAt: FieldValue.serverTimestamp() });
    let reverted = false;
    if (["approve", "paid", "comp"].includes(u.action)) {
      const prev = card.get("previousLook") as PreviousLook | undefined;
      if (card.exists && card.get("templateId") === r.templateId && prev?.requestId === requestId) {
        applyLook(tx, cardRef, prev, admin.uid, { previousLook: FieldValue.delete() });
        if (pub?.exists) patchSnapshotLook(tx, pub.ref, prev);
        reverted = true;
      }
      if (u.unlocked && (reverted || card.get("templateId") !== r.templateId)) {
        tx.set(db().collection(COL.entitlements).doc(r.cardId), { unlockedTemplateIds: FieldValue.arrayRemove(r.templateId), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      }
    }
    return { slug: reverted && pub?.exists ? slug ?? null : null };
  });
});

/* ---------------------------------------------------------- retention */

/**
 * Daily: receipts are kept for a year, then deleted (the request keeps proofPath = null).
 * Uploads never submitted (older than 7 days, not on any request) are deleted too.
 */
export const cleanUpPaymentProofs = onSchedule({ schedule: "every day 03:30", timeZone: "Asia/Manila" }, async () => {
  const yearAgo = new Date(Date.now() - 365 * 86_400_000).toISOString();
  const old = await db().collection(COL.templateRequests).where("payment.submittedAt", "<", yearAgo).get();
  let expired = 0;
  for (const d of old.docs) {
    const path = d.get("payment.proofPath") as string | null | undefined;
    if (!path) continue;
    await bucket().file(path).delete({ ignoreNotFound: true });
    await d.ref.update({ "payment.proofPath": null });
    expired++;
  }
  const referenced = new Set((await db().collection(COL.templateRequests).where("payment.proofPath", ">", "").get()).docs.map((d) => d.get("payment.proofPath") as string));
  const [files] = await bucket().getFiles({ prefix: "paymentProofs/" });
  const weekAgo = Date.now() - 7 * 86_400_000;
  let orphans = 0;
  for (const f of files) {
    if (referenced.has(f.name) || Date.parse(f.metadata.timeCreated ?? "") > weekAgo) continue;
    await f.delete({ ignoreNotFound: true });
    orphans++;
  }
  logger.info("payment proofs cleaned up", { expired, orphans });
});
