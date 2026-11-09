"use client";

import { BRAND_ORIGIN } from "@/lib/brand";
import * as api from "@/lib/api";
import type { MockDB } from "@/lib/mock";
import { WORKSPACE } from "@/lib/mock/workspace";
import { PRICING, formatPeso } from "@/lib/pricing";
import { signInAsClient } from "@/lib/session";
import { canApplyTemplate, isTemplateUnlocked, OPEN_REQUEST, templatePricing, type PricingSettings } from "@/lib/entitlements";
import type {
  Card,
  CardEntitlements,
  CardPermissions,
  Client,
  ClientNotification,
  Invite,
  Role,
  PricingOverrides,
  TemplateRequest,
} from "@/lib/types";
import { greetingName, nowISO, uid } from "@/lib/utils";
import { getTemplate, lookFor, type TemplateLook } from "@/templates/registry";
import { saveLibrarySettings } from "@/lib/api";
import { applyTemplate, createCard, markPublished, patchCard } from "./actions";
import { logChanges } from "./change-log";
import { readDB, updateDB } from "./db";
import { isFirebaseMode } from "@/lib/services/mode";

/*
 * Client Portal and paid-template actions. Each one calls its stub in lib/api.ts
 * (the backend boundary), then updates the local mock store.
 */

type Res<T = undefined> = api.Result<T>;
const DAY = 86_400_000;

/* ================================================================ Selectors */

export function entitlementsFor(db: MockDB, cardId: string): CardEntitlements {
  return db.entitlements.find((e) => e.cardId === cardId) ?? { cardId, unlockedTemplateIds: [] };
}

/** The Default (free) template and the admin's price overrides, as the guard reads them. */
export function pricingOf(db: MockDB): PricingSettings {
  return { defaultTemplateId: db.library.defaultTemplateId, overrides: db.pricing };
}

export function clientFor(db: MockDB, cardId: string): Client | undefined {
  return db.clients.find((c) => c.cardId === cardId);
}

/** Newest invite for a client (by creation). */
export function latestInvite(db: MockDB, clientId: string): Invite | undefined {
  return db.invites.filter((i) => i.clientId === clientId).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0];
}

/** Stored status, with links past their expiry date shown as expired. */
export function inviteStatus(invite: Invite, now = Date.now()): Invite["status"] {
  if ((invite.status === "sent" || invite.status === "opened") && Date.parse(invite.expiresAt) < now) return "expired";
  return invite.status;
}

export type InviteLookup =
  | { state: "valid"; invite: Invite; client: Client }
  | { state: "expired" | "revoked" | "accepted"; invite: Invite; client: Client }
  | { state: "invalid" };

export function lookupInvite(db: MockDB, token: string): InviteLookup {
  const invite = db.invites.find((i) => i.token === token);
  const client = invite && db.clients.find((c) => c.id === invite.clientId);
  if (!invite || !client || invite.status === "draft") return { state: "invalid" };
  const status = inviteStatus(invite);
  if (status === "accepted") return { state: "accepted", invite, client };
  if (status === "revoked") return { state: "revoked", invite, client };
  if (status === "expired") return { state: "expired", invite, client };
  return { state: "valid", invite, client };
}

export function inviteUrl(token: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : BRAND_ORIGIN;
  return `${origin}/invite/${token}`;
}

export function requestsForCard(db: MockDB, cardId: string): TemplateRequest[] {
  return db.templateRequests.filter((r) => r.cardId === cardId).sort((a, b) => Date.parse(b.requestedAt) - Date.parse(a.requestedAt));
}

export function openRequests(db: MockDB): TemplateRequest[] {
  return db.templateRequests.filter((r) => OPEN_REQUEST.includes(r.status));
}

/** Requests waiting on the admin (badge count in the studio nav): payments to verify, plus manual-flow requests (QR payments off). */
export function pendingRequestCount(db: MockDB): number {
  return db.templateRequests.filter((r) => r.status === "payment_submitted" || r.status === "pending").length;
}

/** Payments clients submitted that an admin still has to verify. */
export function paymentsToVerify(db: MockDB): TemplateRequest[] {
  return db.templateRequests.filter((r) => r.status === "payment_submitted");
}

/** Display name of a requested template. */
export function requestTemplateName(r: Pick<TemplateRequest, "templateId">): string {
  return getTemplate(r.templateId).name;
}

/** The previewed theme saved on a request, by name ("Hazard"), or the template's first theme. */
export function requestThemeName(r: Pick<TemplateRequest, "templateId" | "themeId">): string {
  const t = getTemplate(r.templateId);
  return (t.themes.find((th) => th.id === r.themeId) ?? t.themes[0]).name;
}

/** "Live", "Draft changes not published" or "Waiting for review", as the client sees it. */
export type PortalCardState = "live" | "draft" | "changes" | "review" | "changes_requested";

export function portalCardState(card: Card): PortalCardState {
  if (card.review?.status === "pending") return "review";
  if (card.review?.status === "changes_requested") return "changes_requested";
  if (card.status === "draft") return "draft";
  if (card.published_at && Date.parse(card.updated_at) > Date.parse(card.published_at)) return "changes";
  return "live";
}

/* =============================================================== Internals */

function setRequest(db: MockDB, id: string, patch: Partial<TemplateRequest>): MockDB {
  return { ...db, templateRequests: db.templateRequests.map((r) => (r.id === id ? { ...r, ...patch } : r)) };
}

function addUnlock(db: MockDB, cardId: string, templateId: string): MockDB {
  const cur = entitlementsFor(db, cardId);
  if (cur.unlockedTemplateIds.includes(templateId)) return db;
  const next = { cardId, unlockedTemplateIds: [...cur.unlockedTemplateIds, templateId] };
  const has = db.entitlements.some((e) => e.cardId === cardId);
  return { ...db, entitlements: has ? db.entitlements.map((e) => (e.cardId === cardId ? next : e)) : [...db.entitlements, next] };
}

function notify(db: MockDB, n: Omit<ClientNotification, "id" | "at" | "read" | "emailed">): { db: MockDB; id: string } {
  const id = uid("nt");
  // TODO(backend): every notification is also emailed to the client.
  return { db: { ...db, notifications: [...db.notifications, { ...n, id, at: nowISO(), read: false, emailed: true }] }, id };
}

/** Snapshot of everything an admin action on a request touches, for Undo. */
function snapshotFor(r: TemplateRequest) {
  const db = readDB();
  return {
    request: db.templateRequests.find((x) => x.id === r.id)!,
    ent: entitlementsFor(db, r.cardId),
    notificationIds: new Set(db.notifications.map((n) => n.id)),
  };
}

function restoreSnapshot(s: ReturnType<typeof snapshotFor>) {
  updateDB((db) => ({
    ...db,
    templateRequests: db.templateRequests.map((r) => (r.id === s.request.id ? s.request : r)),
    entitlements: db.entitlements.some((e) => e.cardId === s.ent.cardId) ? db.entitlements.map((e) => (e.cardId === s.ent.cardId ? s.ent : e)) : [...db.entitlements, s.ent],
    notifications: db.notifications.filter((n) => s.notificationIds.has(n.id)),
  }));
}

/* =========================================================== Client + invite */

export type NewClientInput = {
  client: { name: string; email: string; phone?: string; company?: string };
  look: TemplateLook;
  starter: Partial<Pick<Card, "title" | "agentPhotoUrl" | "backgroundPhotoUrl" | "logoUrl">>;
  permissions: CardPermissions;
  /** The card id the flow reserved for uploads (see NewCardFlow). */
  cardId?: string;
};

/**
 * "New card for client": the card (draft), the client and a draft invite.
 * A paid template must be unlocked with unlockTemplateNow() right after, or
 * the caller passes the Default template instead.
 */
export function createClientCard(input: NewClientInput): { client: Client; card: Card; invite: Invite } {
  const look: TemplateLook = { ...input.look, customTokens: undefined };
  const card = createCard({ id: input.cardId, look, name: input.client.name, title: input.starter.title, phone: input.client.phone, email: input.client.email });
  const now = nowISO();
  const client: Client = {
    id: uid("cl"),
    name: input.client.name,
    email: input.client.email,
    phone: input.client.phone || undefined,
    company: input.client.company || undefined,
    status: "invited",
    invitedAt: now,
    cardId: card.id,
  };
  const invite: Invite = {
    id: uid("inv"),
    clientId: client.id,
    cardId: card.id,
    token: uid("t").slice(2) + Math.random().toString(36).slice(2, 6),
    createdAt: now,
    expiresAt: new Date(Date.now() + PRICING.inviteValidDays * DAY).toISOString(),
    status: "draft",
  };
  patchCard(card.id, {
    company: input.client.company || undefined,
    agentPhotoUrl: input.starter.agentPhotoUrl,
    backgroundPhotoUrl: input.starter.backgroundPhotoUrl,
    logoUrl: input.starter.logoUrl,
    clientId: client.id,
    permissions: input.permissions,
  });
  updateDB((db) =>
    logChanges(
      { ...db, clients: [client, ...db.clients], invites: [...db.invites, invite], entitlements: [...db.entitlements, { cardId: card.id, unlockedTemplateIds: [] }] },
      card.id,
      ["Card created"],
    ),
  );
  return { client, card: { ...card, clientId: client.id }, invite };
}

/** Send by email (status "sent") or mark as shared by link ("Copy link instead"). */
export async function sendInvite(inviteId: string, opts: { subject: string; message: string; channel: "email" | "link" }): Promise<Res<Invite>> {
  const db = readDB();
  const invite = db.invites.find((i) => i.id === inviteId);
  const client = invite && db.clients.find((c) => c.id === invite.clientId);
  if (!invite || !client) return { ok: false, error: "This invite no longer exists." };
  const res = opts.channel === "email" ? await api.sendInviteEmail(invite, client.email) : ({ ok: true, data: { sentAt: nowISO() } } as const);
  if (!res.ok) return res;
  const next: Invite = {
    ...invite,
    status: "sent",
    channel: opts.channel,
    subject: opts.subject,
    message: opts.message,
    sentAt: res.data.sentAt,
    expiresAt: new Date(Date.parse(res.data.sentAt) + PRICING.inviteValidDays * DAY).toISOString(),
  };
  updateDB((d) => ({ ...d, invites: d.invites.map((i) => (i.id === inviteId ? next : i)), clients: d.clients.map((c) => (c.id === client.id ? { ...c, invitedAt: next.sentAt! } : c)) }));
  return { ok: true, data: next };
}

/** "Send later": keep the subject and message on the draft invite. */
export function saveInviteDraft(inviteId: string, subject: string, message: string) {
  updateDB((d) => ({ ...d, invites: d.invites.map((i) => (i.id === inviteId ? { ...i, subject, message } : i)) }));
}

/** New link for a client whose invite is a draft, sent, opened or expired. The old link stops working. */
export async function resendClientInvite(clientId: string): Promise<Res<Invite>> {
  const db = readDB();
  const prev = latestInvite(db, clientId);
  const client = db.clients.find((c) => c.id === clientId);
  if (!client) return { ok: false, error: "This client no longer exists." };
  const res = await api.resendInvite(prev?.id ?? "");
  if (!res.ok) return res;
  const invite: Invite = {
    id: uid("inv"),
    clientId,
    cardId: client.cardId,
    token: uid("t").slice(2) + Math.random().toString(36).slice(2, 6),
    createdAt: res.data.sentAt,
    sentAt: res.data.sentAt,
    expiresAt: new Date(Date.parse(res.data.sentAt) + PRICING.inviteValidDays * DAY).toISOString(),
    status: "sent",
    channel: "email",
    subject: prev?.subject,
    message: prev?.message,
  };
  updateDB((d) => ({
    ...d,
    invites: [...d.invites.map((i) => (i.clientId === clientId && (i.status === "sent" || i.status === "opened" || i.status === "draft") ? { ...i, status: "revoked" as const, revokedAt: invite.sentAt } : i)), invite],
    clients: d.clients.map((c) => (c.id === clientId && c.status !== "active" ? { ...c, status: "invited" as const, invitedAt: invite.sentAt! } : c)),
  }));
  return { ok: true, data: invite };
}

/** Revoke access: open invite links stop working. An active client can't sign in until invited again. */
export async function revokeClientAccess(clientId: string): Promise<Res> {
  const db = readDB();
  const open = db.invites.filter((i) => i.clientId === clientId && ["draft", "sent", "opened"].includes(i.status));
  const res = await api.revokeInvite(open[0]?.id ?? "");
  if (!res.ok) return res;
  const at = nowISO();
  updateDB((d) => ({
    ...d,
    invites: d.invites.map((i) => (open.some((o) => o.id === i.id) ? { ...i, status: "revoked" as const, revokedAt: at } : i)),
    clients: d.clients.map((c) => (c.id === clientId && c.status === "active" ? { ...c, status: "invited" as const } : c)),
  }));
  return { ok: true, data: undefined };
}

export async function setClientDisabled(clientId: string, disabled: boolean): Promise<Res> {
  const res = await api.setClientDisabled(clientId, disabled);
  if (!res.ok) return res;
  updateDB((d) => ({
    ...d,
    clients: d.clients.map((c) => {
      if (c.id !== clientId) return c;
      if (disabled) return { ...c, status: "disabled" as const };
      const accepted = d.invites.some((i) => i.clientId === clientId && i.status === "accepted");
      return { ...c, status: accepted ? ("active" as const) : ("invited" as const) };
    }),
  }));
  return { ok: true, data: undefined };
}

/** The invite page was opened (first time only). */
export function markInviteOpened(token: string) {
  updateDB((d) => ({
    ...d,
    invites: d.invites.map((i) => (i.token === token && i.status === "sent" ? { ...i, status: "opened" as const, openedAt: nowISO() } : i)),
  }));
}

export type SignInMethod = "magic-link" | "password";

/** Accept the invite, make the client active and sign them in (mock session). */
export async function acceptClientInvite(token: string, method: SignInMethod, password?: string): Promise<Res<Client>> {
  const found = lookupInvite(readDB(), token);
  if (found.state !== "valid") return { ok: false, error: "This invite link can’t be used any more." };
  const res = await api.acceptInvite(token);
  if (!res.ok) return res;
  if (method === "password" && password) {
    const pw = await api.setClientPassword(found.client.id, password);
    if (!pw.ok) return pw;
  }
  const at = nowISO();
  updateDB((d) => ({
    ...d,
    invites: d.invites.map((i) => (i.token === token ? { ...i, status: "accepted" as const, acceptedAt: at, openedAt: i.openedAt ?? at } : i)),
    clients: d.clients.map((c) => (c.id === found.client.id ? { ...c, status: "active" as const, lastActiveAt: at } : c)),
  }));
  signInAsClient(found.client.id);
  return { ok: true, data: found.client };
}

export function touchClientActive(clientId: string) {
  updateDB((d) => ({ ...d, clients: d.clients.map((c) => (c.id === clientId ? { ...c, lastActiveAt: nowISO() } : c)) }));
}

export async function setCardPermissions(cardId: string, permissions: CardPermissions): Promise<Res> {
  const res = await api.saveCardPermissions(cardId, permissions);
  if (res.ok) patchCard(cardId, { permissions });
  return res;
}

/* ========================================================== Paid templates */

/** Apply a look, through the guard. Returns the previous look for Undo. */
export type ApplyResult = Res<{ prev: TemplateLook; comped: boolean }>;

/**
 * Save a template (and its theme) to a card. Goes through canApplyTemplate:
 * a client can't save a locked template. When an admin applies a paid template
 * to a client's card that isn't unlocked, it is unlocked for the card (a comp),
 * so the client can switch back to it later.
 */
export function applyTemplateAs(cardId: string, look: TemplateLook, role: Role): ApplyResult {
  const db = readDB();
  const card = db.cards.find((c) => c.id === cardId);
  if (!card) return { ok: false, error: "This card no longer exists." };
  const ent = entitlementsFor(db, cardId);
  const pricing = pricingOf(db);
  const name = getTemplate(look.templateId).name;
  if (!canApplyTemplate(role, ent, pricing, look.templateId)) return { ok: false, error: `${name} is locked. Request it to use it on your card.` };
  // Clients never get custom colors; an admin's custom look falls back to the template's own theme.
  const safe: TemplateLook = role === "client" && look.themeId === "custom" ? { ...look, themeId: getTemplate(look.templateId).themes[0].id, customTokens: undefined } : look;
  const comped = role === "admin" && !!card.clientId && templatePricing(look.templateId, pricing).tier === "paid" && !isTemplateUnlocked(ent, look.templateId);
  // Firebase mode: the onCardWritten trigger records the unlock on the server when the template changes.
  if (comped) updateDB((d) => addUnlock(d, cardId, look.templateId));
  const prev = applyTemplate(cardId, safe);
  if (!prev) return { ok: false, error: "This card no longer exists." };
  return { ok: true, data: { prev, comped } };
}

/** Takes back an unlock on the server (Firebase mode; admin only: Undo right after applying). The mock keeps it in the local DB. */
async function saveUnlock(cardId: string, templateId: string, unlocked: boolean): Promise<Res> {
  if (!isFirebaseMode) return { ok: true, data: undefined };
  const { call } = await import("@/lib/services/callable");
  const r = await call<{ unlockedTemplateIds: string[] }>("setTemplateUnlock", { cardId, templateId, unlocked });
  return r.ok ? { ok: true, data: undefined } : r;
}

/**
 * Mock mode only, before publishing (admin or client): a client card is always
 * unlocked for the template it's on, because only the studio can put a template
 * on it (a comp). In Firebase mode the server enforces this when publishing
 * (functions/src/unlocks.ts), so this does nothing there. Returns the template
 * it unlocked, if any.
 */
export function ensureTemplateUnlockedLocally(cardId: string): string | null {
  if (isFirebaseMode) return null;
  const db = readDB();
  const card = db.cards.find((c) => c.id === cardId);
  if (!card?.clientId || canApplyTemplate("client", entitlementsFor(db, cardId), pricingOf(db), card.templateId)) return null;
  updateDB((d) => addUnlock(d, cardId, card.templateId));
  return card.templateId;
}

/** Undo an apply: the previous look, and the comp unlock if the apply made one. */
export function undoApply(cardId: string, prev: TemplateLook, compedTemplateId?: string) {
  applyTemplate(cardId, prev);
  if (!compedTemplateId) return;
  void saveUnlock(cardId, compedTemplateId, false);
  updateDB((d) => ({
    ...d,
    entitlements: d.entitlements.map((e) => (e.cardId === cardId ? { ...e, unlockedTemplateIds: e.unlockedTemplateIds.filter((t) => t !== compedTemplateId) } : e)),
  }));
}

/** Switch theme within the card's template. Themes are free for everyone. */
export function applyThemeOnly(cardId: string, themeId: string) {
  patchCard(cardId, { themeId, customTokens: undefined });
}

export async function requestTemplate(cardId: string, templateId: string, themeId: string | undefined, note: string): Promise<Res<TemplateRequest>> {
  const db = readDB();
  const client = clientFor(db, cardId);
  if (!client) return { ok: false, error: "Only client cards can request templates." };
  const price = templatePricing(templateId, pricingOf(db)).price ?? 0;
  const input = { clientId: client.id, cardId, templateId, themeId, price, currency: "PHP" as const, note: note.trim() || undefined };
  const res = await api.createTemplateRequest(input);
  if (!res.ok) return res;
  const req: TemplateRequest = { ...input, id: uid("tr"), status: "pending", requestedAt: res.data.requestedAt };
  updateDB((d) => ({ ...d, templateRequests: [...d.templateRequests, req] }));
  return { ok: true, data: req };
}

export async function cancelRequest(requestId: string): Promise<Res> {
  const res = await api.cancelTemplateRequest(requestId);
  if (res.ok) updateDB((d) => setRequest(d, requestId, { status: "cancelled", resolvedAt: nowISO() }));
  return res;
}

/**
 * "Apply now" from an unlock notification: the unlocked template, in the theme
 * the client was previewing. Never automatic; the client taps it.
 */
export function applyUnlocked(requestId: string): ApplyResult {
  const db = readDB();
  const r = db.templateRequests.find((x) => x.id === requestId);
  if (!r) return { ok: false, error: "This request no longer exists." };
  return applyTemplateAs(r.cardId, lookFor(getTemplate(r.templateId), r.themeId), "client");
}

/**
 * New card for a client: the admin unlocks a paid template up front, paid or
 * comped. Recorded as a resolved request so it shows in the client's history.
 */
export async function unlockTemplateNow(cardId: string, templateId: string, how: { paid: boolean; reason?: string; reference?: string }): Promise<Res> {
  const db = readDB();
  const client = clientFor(db, cardId);
  const res = await api.unlockTemplate(cardId, templateId);
  if (!res.ok) return res;
  const price = templatePricing(templateId, pricingOf(db)).price ?? 0;
  const at = nowISO();
  updateDB((d) => {
    let next = addUnlock(d, cardId, templateId);
    if (client) {
      const req: TemplateRequest = {
        id: uid("tr"),
        clientId: client.id,
        cardId,
        templateId,
        price,
        currency: "PHP",
        status: how.paid ? "paid" : "approved",
        requestedAt: at,
        resolvedAt: at,
        byAdmin: true,
        ...(how.paid ? { paidAmount: price, paymentRef: how.reference?.trim() || undefined } : { compReason: how.reason?.trim() || "Unlocked when the card was set up." }),
      };
      next = { ...next, templateRequests: [...next.templateRequests, req] };
    }
    return next;
  });
  return { ok: true, data: undefined };
}

export function paymentEmail(r: TemplateRequest, client: Client) {
  const name = requestTemplateName(r);
  return {
    subject: `Payment details for ${name} (${formatPeso(r.price)})`,
    body: [
      `Hi ${greetingName(client.name)},`,
      `Thanks for choosing the ${name} template for your card. The total is ${formatPeso(r.price)}, one time, and it includes all of its color themes.`,
      `To pay, scan the InstaPay QR code below with GCash, Maya, GoTyme or any bank app (or save it and upload it in the app’s Scan QR screen), and send exactly ${formatPeso(r.price)}.`,
      `Please reply with a screenshot or the reference number. We'll unlock ${name} as soon as the payment is confirmed, usually the same day.`,
      WORKSPACE.company,
    ].join("\n\n"),
  };
}

/** Each admin action returns an Undo that restores the request, the card's unlocks and the client's notifications. */
export type AdminResult = Res<{ undo: () => void }>;

export async function sendPaymentDetailsFor(requestId: string, subject: string, body: string): Promise<AdminResult> {
  const db = readDB();
  const r = db.templateRequests.find((x) => x.id === requestId);
  const client = r && db.clients.find((c) => c.id === r.clientId);
  if (!r || !client) return { ok: false, error: "This request no longer exists." };
  const snap = snapshotFor(r);
  const res = await api.sendPaymentDetails(requestId, client.email, subject, body);
  if (!res.ok) return res;
  const name = requestTemplateName(r);
  updateDB((d) => {
    const next = setRequest(d, requestId, { status: "awaiting_payment", paymentRequestedAt: res.data.sentAt });
    return notify(next, {
      clientId: r.clientId,
      cardId: r.cardId,
      kind: "payment_requested",
      requestId,
      title: `Payment details for ${name}`,
      body: `Pay ${formatPeso(r.price)} by ${WORKSPACE.payment.map((p) => p.method).join(", ").replace(/, ([^,]*)$/, " or $1")}. ${name} unlocks as soon as payment is confirmed.`,
    }).db;
  });
  return { ok: true, data: { undo: () => restoreSnapshot(snap) } };
}

function unlockedNotice(r: TemplateRequest, body: string) {
  const name = requestTemplateName(r);
  return { clientId: r.clientId, cardId: r.cardId, kind: "template_unlocked" as const, requestId: r.id, title: `${name} is unlocked`, body };
}

export async function markRequestPaid(requestId: string, amount: number, reference: string): Promise<AdminResult> {
  const db = readDB();
  const r = db.templateRequests.find((x) => x.id === requestId);
  if (!r) return { ok: false, error: "This request no longer exists." };
  const snap = snapshotFor(r);
  const paid = await api.markTemplateRequestPaid(requestId, amount, reference);
  if (!paid.ok) return paid;
  const unlocked = await api.unlockTemplate(r.cardId, r.templateId);
  if (!unlocked.ok) return unlocked;
  const name = requestTemplateName(r);
  updateDB((d) => {
    let next = setRequest(d, requestId, { status: "paid", resolvedAt: nowISO(), paidAmount: amount, paymentRef: reference.trim() || undefined });
    next = addUnlock(next, r.cardId, r.templateId);
    return notify(next, unlockedNotice(r, `Payment received, thank you. Tap Apply now to switch your card to ${name}, or do it later from Design. You can switch back any time.`)).db;
  });
  return { ok: true, data: { undo: () => restoreSnapshot(snap) } };
}

export async function compRequest(requestId: string, reason: string): Promise<AdminResult> {
  const db = readDB();
  const r = db.templateRequests.find((x) => x.id === requestId);
  if (!r) return { ok: false, error: "This request no longer exists." };
  const snap = snapshotFor(r);
  const ok = await api.approveTemplateRequest(requestId, reason);
  if (!ok.ok) return ok;
  const unlocked = await api.unlockTemplate(r.cardId, r.templateId);
  if (!unlocked.ok) return unlocked;
  const name = requestTemplateName(r);
  updateDB((d) => {
    let next = setRequest(d, requestId, { status: "approved", resolvedAt: nowISO(), compReason: reason.trim() });
    next = addUnlock(next, r.cardId, r.templateId);
    return notify(next, unlockedNotice(r, `${name} is yours, no charge. Tap Apply now to use it, or find it later in Design.`)).db;
  });
  return { ok: true, data: { undo: () => restoreSnapshot(snap) } };
}

export async function declineRequest(requestId: string, note: string): Promise<AdminResult> {
  const db = readDB();
  const r = db.templateRequests.find((x) => x.id === requestId);
  if (!r) return { ok: false, error: "This request no longer exists." };
  const snap = snapshotFor(r);
  const res = await api.declineTemplateRequest(requestId, note);
  if (!res.ok) return res;
  const name = requestTemplateName(r);
  updateDB((d) => {
    const next = setRequest(d, requestId, { status: "declined", resolvedAt: nowISO(), adminNote: note.trim() });
    return notify(next, { clientId: r.clientId, cardId: r.cardId, kind: "request_declined", requestId, title: `${name} wasn’t approved`, body: note.trim() }).db;
  });
  return { ok: true, data: { undo: () => restoreSnapshot(snap) } };
}

/** Save tiers and prices. Client cards already on a template that becomes paid keep it (it is unlocked for them). */
export async function savePricing(overrides: PricingOverrides): Promise<Res<{ grandfathered: number }>> {
  const res = await api.saveTemplatePricing(overrides);
  if (!res.ok) return res;
  let grandfathered = 0;
  updateDB((d) => {
    let next: MockDB = { ...d, pricing: overrides };
    for (const c of d.cards) {
      if (c.clientId && !canApplyTemplate("client", entitlementsFor(next, c.id), pricingOf(next), c.templateId)) {
        next = addUnlock(next, c.id, c.templateId);
        grandfathered++;
      }
    }
    return next;
  });
  return { ok: true, data: { grandfathered } };
}

/** Client cards that would lose their template if `templateId` stopped being the Default. */
export function cardsOnDefault(db: MockDB): Card[] {
  return db.cards.filter((c) => c.clientId && c.templateId === db.library.defaultTemplateId);
}

/**
 * Make another template the Default (free) one. Client cards already on the old
 * Default keep it: it is unlocked for those cards.
 */
export async function setDefaultTemplate(templateId: string): Promise<Res<{ kept: number }>> {
  const res = await api.setDefaultTemplate(templateId);
  if (!res.ok) return res;
  let kept = 0;
  updateDB((d) => {
    const oldDefault = d.library.defaultTemplateId;
    let next: MockDB = { ...d, library: { ...d.library, defaultTemplateId: templateId } };
    // The new Default can't also carry a paid override.
    if (next.pricing[templateId]) {
      const rest = { ...next.pricing };
      delete rest[templateId];
      next = { ...next, pricing: rest };
    }
    for (const c of d.cards) {
      if (c.clientId && c.templateId === oldDefault && oldDefault !== templateId) {
        next = addUnlock(next, c.id, oldDefault);
        kept++;
      }
    }
    return next;
  });
  void saveLibrarySettings();
  return { ok: true, data: { kept } };
}

/* ================================================================ Review */

export async function submitCardForReview(cardId: string): Promise<Res<{ submittedAt: string }>> {
  const res = await api.submitForReview(cardId);
  if (!res.ok) return res;
  updateDB((d) =>
    logChanges(
      { ...d, cards: d.cards.map((c) => (c.id === cardId ? { ...c, review: { status: "pending" as const, submittedAt: res.data.submittedAt } } : c)) },
      cardId,
      ["Submitted for review"],
    ),
  );
  return res;
}

/** Approve: publish the draft and tell the client. */
export async function approveCardReview(cardId: string): Promise<Res> {
  // Honest locks: a client card goes live only on an unlocked template; the one the studio put on it counts (a comp).
  ensureTemplateUnlockedLocally(cardId);
  const res = await api.approveReview(cardId);
  if (!res.ok) return res;
  const publishedAt = nowISO();
  markPublished(cardId, publishedAt);
  updateDB((d) => {
    const card = d.cards.find((c) => c.id === cardId);
    const next = { ...d, cards: d.cards.map((c) => (c.id === cardId && c.review ? { ...c, review: { ...c.review, status: "approved" as const, resolvedAt: publishedAt } } : c)) };
    if (!card?.clientId) return next;
    return notify(next, { clientId: card.clientId, cardId, kind: "review_approved", title: "Your changes are live", body: `${WORKSPACE.shortName} reviewed and published your latest edits.` }).db;
  });
  return { ok: true, data: undefined };
}

export async function requestCardChanges(cardId: string, note: string): Promise<Res> {
  const res = await api.requestReviewChanges(cardId, note);
  if (!res.ok) return res;
  updateDB((d) => {
    const card = d.cards.find((c) => c.id === cardId);
    const next = {
      ...d,
      cards: d.cards.map((c) => (c.id === cardId && c.review ? { ...c, review: { ...c.review, status: "changes_requested" as const, resolvedAt: nowISO(), note: note.trim() } } : c)),
    };
    if (!card?.clientId) return next;
    return notify(next, { clientId: card.clientId, cardId, kind: "review_changes", title: "Changes requested", body: note.trim() }).db;
  });
  return { ok: true, data: undefined };
}

/* ========================================================= Notifications */

export function markAllRead(clientId: string) {
  void api.markNotificationsRead(clientId);
  updateDB((d) => ({ ...d, notifications: d.notifications.map((n) => (n.clientId === clientId && !n.read ? { ...n, read: true } : n)) }));
}
