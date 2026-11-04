import "./setup";
/**
 * Clients and invites.
 *   createClientCard   admin: client + card + link + unlocks (+ optional "Unlock now") + draft invite, in one transaction
 *   sendInvite         admin: send a draft by email, or make a link to share ("Copy link"). Re-sending rotates the token.
 *   resendInvite       admin: a fresh invite; every open link for the client stops working
 *   revokeInvite       admin: open links stop working; an active client is signed out and must be invited again
 *   getInvite          anyone with the link: what the invite page shows (marks it "opened")
 *   acceptInvite       anyone with a valid link: makes the client's account and returns a sign-in token (one click)
 *   expireInvites      daily: marks unused links past their 7 days as expired
 * Tokens are random (192 bits) and only their SHA-256 is stored; the token itself exists only in the link.
 */
import { createHash, randomBytes } from "node:crypto";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore, type DocumentData, type DocumentReference, type Transaction } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { z } from "zod";
import { BRAND, emailSentOnBehalf } from "@/lib/brand";
import { DEFAULT_SECTION_ORDER } from "@/lib/design/sections";
import { templatePricing, type PricingSettings } from "@/lib/entitlements";
import { COL, encode } from "@/lib/firebase/model";
import { PRICING } from "@/lib/pricing";
import { cardPermissions, id } from "@/lib/schemas";
import type { Card } from "@/lib/types";
import { getTemplate, TEMPLATES } from "@/templates/registry";
import { bundleFor } from "./bundle";
import { parse, requireAdmin } from "./guards";
import { queueMail, simpleHtml } from "./mail";
import { appOrigin, enforceAppCheck, isEmulator } from "./params";

const db = () => getFirestore();
const DAY = 86_400_000;
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const newToken = () => randomBytes(24).toString("base64url");
const randomId = (prefix: string) => `${prefix}_${randomBytes(6).toString("base64url").replace(/[^A-Za-z0-9]/g, "x")}`;
const slugify = (s: string) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "card";
const firstName = (name: string) => name.trim().split(/\s+/)[0] || "there";
const OPEN = ["draft", "sent", "opened"];

/** Mail can only be delivered once the Trigger Email extension is set up (DEPLOY.md). */
const mailReady = () => isEmulator || process.env.MAIL_ENABLED === "true";

async function workspace() {
  const d = (await db().doc("settings/app").get()).data() as { company?: string; replyTo?: string; adminName?: string; phone?: string } | undefined;
  return { company: d?.company ?? BRAND.name, replyTo: d?.replyTo, phone: d?.phone };
}

async function reserveSlug(tx: Transaction, base: string, cardId: string): Promise<string> {
  const root = slugify(base);
  for (let n = 1; n <= 50; n++) {
    const candidate = n === 1 ? root : `${root}-${n}`;
    const snap = await tx.get(db().collection(COL.slugs).doc(candidate));
    if (!snap.exists || (snap.get("cardId") === cardId && !snap.get("redirectTo"))) return candidate;
  }
  throw new HttpsError("resource-exhausted", "Couldn't find a free link for this card. Change the name and try again.");
}

/* ------------------------------------------------------------ create */

const createInput = z.object({
  cardId: id,
  client: z.object({ name: z.string().trim().min(1).max(120), email: z.email().max(254), phone: z.string().max(40).optional(), company: z.string().max(120).optional() }),
  look: z.object({ templateId: z.string().max(64), themeId: z.string().max(64), fontPairingId: z.string().max(64), buttonShape: z.enum(["pill", "rounded", "square"]), buttonFill: z.enum(["solid", "outline", "soft"]) }),
  starter: z.object({ title: z.string().max(120).optional(), agentPhotoUrl: z.string().max(2048).optional(), backgroundPhotoUrl: z.string().max(2048).optional(), logoUrl: z.string().max(2048).optional() }),
  /** Card details the admin changed from the client's (step 3). */
  card: z.object({ name: z.string().max(120).optional(), phone: z.string().max(40).optional(), email: z.string().max(254).optional(), company: z.string().max(120).optional() }).default({}),
  permissions: cardPermissions,
  unlock: z.object({ paid: z.boolean(), reference: z.string().max(120).optional(), reason: z.string().max(500).optional() }).optional(),
  invite: z.object({ subject: z.string().max(200).optional(), message: z.string().max(2000).optional() }).default({}),
});

/** Media for a new card must be in that card's own Storage folder (or the app's sample images). */
const ownMedia = (url: string | undefined, cardId: string) =>
  !url || url.startsWith("/") || decodeURIComponent(url).includes(`/o/cards/${cardId}/`);

export const createClientCard = onCall({ enforceAppCheck }, async (req) => {
  const admin = requireAdmin(req);
  const input = parse(createInput, req.data);
  const email = input.client.email.trim().toLowerCase();
  const tpl = TEMPLATES.find((t) => t.id === input.look.templateId);
  if (!tpl) throw new HttpsError("invalid-argument", "That template doesn't exist.");
  if (!tpl.themes.some((t) => t.id === input.look.themeId)) throw new HttpsError("invalid-argument", "That theme doesn't belong to the template.");
  for (const u of [input.starter.agentPhotoUrl, input.starter.backgroundPhotoUrl, input.starter.logoUrl]) {
    if (!ownMedia(u, input.cardId)) throw new HttpsError("invalid-argument", "Photos must be uploaded for this card.");
  }

  const cardRef = db().collection(COL.cards).doc(input.cardId);
  const pricingDoc = (await db().doc("settings/pricing").get()).data() as PricingSettings | undefined;
  const pricing: PricingSettings = { defaultTemplateId: pricingDoc?.defaultTemplateId ?? "keepsake", overrides: pricingDoc?.overrides ?? {} };
  const price = templatePricing(tpl.id, pricing);

  return db().runTransaction(async (tx) => {
    const existing = await tx.get(cardRef);
    if (existing.exists) {
      // A retried call: hand back what the first one made.
      const inv = await tx.get(db().collection(COL.invites).where("cardId", "==", input.cardId).limit(1));
      return { cardId: input.cardId, clientId: existing.get("clientId") as string, inviteId: inv.docs[0]?.id ?? null, slug: existing.get("slug") as string, retried: true };
    }
    const dup = await tx.get(db().collection(COL.clients).where("email", "==", email).limit(1));
    if (!dup.empty) throw new HttpsError("already-exists", `${email} already has a card. Find them in Clients.`);

    const clientId = randomId("cl");
    const inviteId = randomId("inv");
    const slug = await reserveSlug(tx, input.card.name || input.client.name, input.cardId);
    const now = new Date();
    const card: Omit<Card, "created_at" | "updated_at"> = {
      id: input.cardId,
      slug,
      status: "draft",
      ...input.look,
      motion: true,
      name: (input.card.name || input.client.name).trim(),
      title: input.starter.title || undefined,
      company: (input.card.company ?? input.client.company) || undefined,
      phone: (input.card.phone ?? input.client.phone) || undefined,
      email: (input.card.email ?? email) || undefined,
      messageChannel: "sms",
      showDirections: true,
      overlayOpacity: 0.55,
      backgroundFocalPoint: { x: 0.5, y: 0.5 },
      agentPhotoUrl: input.starter.agentPhotoUrl,
      backgroundPhotoUrl: input.starter.backgroundPhotoUrl,
      logoUrl: input.starter.logoUrl,
      sectionOrder: getTemplate(tpl.id).defaultSectionOrder ?? DEFAULT_SECTION_ORDER,
      hiddenSections: [],
      clientId,
      permissions: input.permissions,
    };
    const unlocked = input.unlock && price.tier === "paid" && !price.isDefault ? [tpl.id] : [];

    tx.set(cardRef, {
      ...encode(card, { renameTopLevel: true }),
      orgChart: encode({ id: randomId("org"), cardId: input.cardId, mode: "tree", created_at: now.toISOString() }),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      lastEditedBy: admin.uid,
    });
    tx.set(db().collection(COL.slugs).doc(slug), { cardId: input.cardId, createdAt: FieldValue.serverTimestamp() });
    tx.set(db().collection(COL.clients).doc(clientId), {
      ...encode({ id: clientId, name: input.client.name.trim(), email, phone: input.client.phone || undefined, company: input.client.company || undefined, status: "invited", cardId: input.cardId }),
      invitedAt: now,
      authUid: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.set(db().collection(COL.entitlements).doc(input.cardId), { unlockedTemplateIds: unlocked, updatedAt: FieldValue.serverTimestamp() });
    if (unlocked.length) {
      const how = input.unlock!;
      tx.set(db().collection(COL.templateRequests).doc(randomId("tr")), encode({
        clientId, cardId: input.cardId, templateId: tpl.id, price: price.price ?? 0, currency: "PHP",
        status: how.paid ? "paid" : "approved", requestedAt: now.toISOString(), resolvedAt: now.toISOString(), byAdmin: true,
        ...(how.paid ? { paidAmount: price.price ?? 0, paymentRef: how.reference?.trim() || undefined } : { compReason: how.reason?.trim() || "Unlocked when the card was set up." }),
      }));
    }
    tx.set(db().collection(COL.invites).doc(inviteId), {
      ...encode({ id: inviteId, clientId, cardId: input.cardId, status: "draft", subject: input.invite.subject, message: input.invite.message }),
      tokenHash: null,
      createdAt: now,
      expiresAt: new Date(now.getTime() + PRICING.inviteValidDays * DAY),
    });
    return { cardId: input.cardId, clientId, inviteId, slug, retried: false };
  });
});

/* -------------------------------------------------------------- send */

async function inviteEmail(to: { name: string; email: string }, link: string, message: string | undefined, subject: string | undefined, expiresAt: Date) {
  const ws = await workspace();
  const lines = [
    `Hi ${firstName(to.name)},`,
    "We made you a digital business card. It opens with a tap of your NFC card, a QR code or a link, and you can edit it yourself any time: your photo, socials, album and anything else people should see.",
    ...(message?.trim() ? [message.trim()] : []),
  ];
  const after = `This link works for ${PRICING.inviteValidDays} days, until ${expiresAt.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}. After that, just reply and we'll send a new one.`;
  const footer = `If the button doesn't work, paste the link into your browser. You're getting this because ${ws.company} set up a card for you. Not expecting it? You can ignore this email. ${emailSentOnBehalf(ws.company)}`;
  return {
    to: to.email,
    replyTo: ws.replyTo,
    subject: subject?.trim() || "Your digital business card is ready to edit",
    text: `${lines.join("\n\n")}\n\nOpen my card editor: ${link}\n\n${after}\n\n${footer}`,
    html: simpleHtml([...lines], { label: "Open my card editor", href: link }, `${after} ${footer}`),
  };
}

/** A new token and the invite fields that go with it (the old link, if any, stops working). */
function issued() {
  const token = newToken();
  const sentAt = new Date();
  const expiresAt = new Date(sentAt.getTime() + PRICING.inviteValidDays * DAY);
  return { token, sentAt, expiresAt, fields: { tokenHash: sha256(token), status: "sent", sentAt, expiresAt } };
}

export const sendInvite = onCall({ enforceAppCheck }, async (req) => {
  requireAdmin(req);
  const { inviteId, channel, subject, message } = parse(
    z.object({ inviteId: id, channel: z.enum(["email", "link"]), subject: z.string().max(200).optional(), message: z.string().max(2000).optional() }),
    req.data,
  );
  if (channel === "email" && !mailReady()) throw new HttpsError("failed-precondition", "Sending email isn't set up yet. Use Copy link and send it by Viber, Messenger or text.");
  const ref = db().collection(COL.invites).doc(inviteId);
  const out = await db().runTransaction(async (tx) => {
    const inv = await tx.get(ref);
    if (!inv.exists) throw new HttpsError("not-found", "This invite no longer exists.");
    if (!OPEN.includes(inv.get("status"))) throw new HttpsError("failed-precondition", "This invite was already used or turned off. Send a new one.");
    const client = await tx.get(db().collection(COL.clients).doc(inv.get("clientId")));
    const next = issued();
    tx.update(ref, { ...next.fields, openedAt: FieldValue.delete(), channel, ...(subject !== undefined ? { subject } : {}), ...(message !== undefined ? { message } : {}) });
    tx.update(client.ref, { invitedAt: next.sentAt, updatedAt: FieldValue.serverTimestamp() });
    return { ...next, client: client.data() as { name: string; email: string }, subject: subject ?? inv.get("subject"), message: message ?? inv.get("message") };
  });
  const link = `${appOrigin(req.rawRequest.headers.origin)}/invite/${out.token}`;
  if (channel === "email") await queueMail(`invite_${inviteId}_${out.sentAt.getTime()}`, await inviteEmail(out.client, link, out.message, out.subject, out.expiresAt));
  return { token: out.token, sentAt: out.sentAt.toISOString(), expiresAt: out.expiresAt.toISOString() };
});

export const resendInvite = onCall({ enforceAppCheck }, async (req) => {
  requireAdmin(req);
  const { clientId, channel } = parse(z.object({ clientId: id, channel: z.enum(["email", "link"]).default("email") }), req.data);
  if (channel === "email" && !mailReady()) throw new HttpsError("failed-precondition", "Sending email isn't set up yet. Use Copy link and send it by Viber, Messenger or text.");
  const inviteId = randomId("inv");
  const out = await db().runTransaction(async (tx) => {
    const clientRef = db().collection(COL.clients).doc(clientId);
    const client = await tx.get(clientRef);
    if (!client.exists) throw new HttpsError("not-found", "This client no longer exists.");
    const open = await tx.get(db().collection(COL.invites).where("clientId", "==", clientId).where("status", "in", OPEN));
    const prev = open.docs.sort((a, b) => b.get("createdAt").toMillis() - a.get("createdAt").toMillis())[0];
    const now = new Date();
    for (const d of open.docs) tx.update(d.ref, { status: "revoked", revokedAt: now });
    const next = issued();
    tx.set(db().collection(COL.invites).doc(inviteId), { id: inviteId, clientId, cardId: client.get("cardId"), createdAt: now, channel, subject: prev?.get("subject") ?? null, message: prev?.get("message") ?? null, ...next.fields });
    if (client.get("status") !== "active") tx.update(clientRef, { status: client.get("status") === "disabled" ? "disabled" : "invited", invitedAt: next.sentAt, updatedAt: FieldValue.serverTimestamp() });
    return { ...next, client: client.data() as { name: string; email: string }, subject: prev?.get("subject") as string | undefined, message: prev?.get("message") as string | undefined };
  });
  const link = `${appOrigin(req.rawRequest.headers.origin)}/invite/${out.token}`;
  if (channel === "email") await queueMail(`invite_${inviteId}`, await inviteEmail(out.client, link, out.message, out.subject, out.expiresAt));
  return { inviteId, token: out.token, sentAt: out.sentAt.toISOString(), expiresAt: out.expiresAt.toISOString() };
});

export const revokeInvite = onCall({ enforceAppCheck }, async (req) => {
  requireAdmin(req);
  const { clientId } = parse(z.object({ clientId: id }), req.data);
  const clientRef = db().collection(COL.clients).doc(clientId);
  const authUid = await db().runTransaction(async (tx) => {
    const client = await tx.get(clientRef);
    if (!client.exists) throw new HttpsError("not-found", "This client no longer exists.");
    const open = await tx.get(db().collection(COL.invites).where("clientId", "==", clientId).where("status", "in", OPEN));
    const now = new Date();
    for (const d of open.docs) tx.update(d.ref, { status: "revoked", revokedAt: now });
    if (client.get("status") === "active") tx.update(clientRef, { status: "invited", updatedAt: FieldValue.serverTimestamp() });
    return client.get("authUid") as string | null;
  });
  // Signed-in sessions end now; they can't get a sign-in link while "invited".
  if (authUid) await getAuth().revokeRefreshTokens(authUid).catch(() => {});
  return { ok: true };
});

/* ------------------------------------------------------------ accept */

type Found = { ref: DocumentReference; data: DocumentData; state: "valid" | "expired" | "revoked" | "accepted" | "invalid" };

async function findByToken(token: string): Promise<Found | null> {
  if (!/^[A-Za-z0-9_-]{6,64}$/.test(token)) return null;
  const snap = await db().collection(COL.invites).where("tokenHash", "==", sha256(token)).limit(1).get();
  const doc = snap.docs[0];
  if (!doc) return null;
  const d = doc.data();
  const state =
    d.status === "accepted" ? "accepted"
    : d.status === "revoked" ? "revoked"
    : d.status === "draft" ? "invalid"
    : d.status === "expired" || d.expiresAt.toMillis() < Date.now() ? "expired"
    : "valid";
  return { ref: doc.ref, data: d, state };
}

/** What the invite page shows. Only the token holder (the client) can call it meaningfully. */
export const getInvite = onCall({ enforceAppCheck }, async (req) => {
  const { token } = parse(z.object({ token: z.string().max(128) }), req.data);
  const found = await findByToken(token);
  if (!found || found.state === "invalid") return { state: "invalid" as const };
  const client = (await db().collection(COL.clients).doc(found.data.clientId).get()).data() as { name: string; email: string; cardId: string } | undefined;
  if (!client) return { state: "invalid" as const };
  const invite = {
    expiresAt: found.data.expiresAt.toDate().toISOString(),
    acceptedAt: found.data.acceptedAt?.toDate().toISOString() ?? null,
  };
  const who = { name: client.name, email: client.email, cardId: client.cardId };
  if (found.state !== "valid") return { state: found.state, invite, client: who };
  if (found.data.status === "sent") await found.ref.update({ status: "opened", openedAt: new Date() });
  return { state: "valid" as const, invite, client: who, bundle: await bundleFor(client.cardId) };
});

/**
 * One click: the invite link itself proves the person owns the email it was sent to,
 * so accepting makes (or reuses) their account, sets the client role and returns a
 * custom token the browser signs in with. Later sign-ins use emailed links.
 */
export const acceptInvite = onCall({ enforceAppCheck }, async (req) => {
  const { token } = parse(z.object({ token: z.string().max(128) }), req.data);
  const found = await findByToken(token);
  if (!found || found.state !== "valid") {
    const message = found?.state === "accepted" ? "This invite was already used. Sign in with your email instead." : found?.state === "expired" ? "This invite link has expired. Ask for a new one." : "This invite link can't be used.";
    throw new HttpsError("failed-precondition", message);
  }
  const clientRef = db().collection(COL.clients).doc(found.data.clientId);
  const client = (await clientRef.get()).data() as { name: string; email: string; cardId: string; status: string; authUid?: string | null } | undefined;
  if (!client) throw new HttpsError("not-found", "This invite link can't be used.");
  if (client.status === "disabled") throw new HttpsError("permission-denied", "Access to this card is turned off. Contact the company that made your card.");

  const auth = getAuth();
  let user = await auth.getUserByEmail(client.email).catch(() => null);
  if (user?.customClaims?.role === "admin") throw new HttpsError("failed-precondition", "This email belongs to a studio admin. Use a different email for the client.");
  if (!user) user = await auth.createUser({ email: client.email, emailVerified: true, displayName: client.name });
  else if (!user.emailVerified) await auth.updateUser(user.uid, { emailVerified: true });
  const claims = { role: "client", clientId: found.data.clientId, cardId: client.cardId };

  // Single use: only one acceptance can win.
  await db().runTransaction(async (tx) => {
    const inv = await tx.get(found.ref);
    if (inv.get("status") === "accepted") throw new HttpsError("failed-precondition", "This invite was already used. Sign in with your email instead.");
    const now = new Date();
    // The hash stays so a reused link says "already set up" (status makes it single-use).
    tx.update(found.ref, { status: "accepted", acceptedAt: now, openedAt: inv.get("openedAt") ?? now });
    tx.update(clientRef, { status: "active", authUid: user!.uid, lastActiveAt: now, updatedAt: FieldValue.serverTimestamp() });
  });
  await auth.setCustomUserClaims(user.uid, claims);
  return { customToken: await auth.createCustomToken(user.uid, claims) };
});

/* ------------------------------------------------------------ expiry */

export const expireInvites = onSchedule({ schedule: "every day 03:00", timeZone: "Asia/Manila" }, async () => {
  const stale = await db().collection(COL.invites).where("status", "in", ["sent", "opened"]).where("expiresAt", "<", new Date()).limit(500).get();
  const batch = db().batch();
  stale.docs.forEach((d) => batch.update(d.ref, { status: "expired" }));
  if (!stale.empty) await batch.commit();
});
