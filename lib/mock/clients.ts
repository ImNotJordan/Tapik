import type {
  CardBundle,
  CardEntitlements,
  ChangeLog,
  Client,
  ClientNotification,
  Invite,
  PricingOverrides,
  TemplateRequest,
} from "@/lib/types";
import { preview as clinicPreview } from "@/templates/clinic-calm/preview";
import { preview as counterPreview } from "@/templates/sunny-counter/preview";
import { ADMIN_NAME } from "./workspace";

/**
 * Clients of the admin's business, their invites, template requests and the
 * notifications they received. Six clients, one per stage:
 *   Maria   invited, email not opened yet
 *   Nena    opened the invite, hasn't set up
 *   Carmela active on the Default template (Keepsake), no requests
 *   Joel    active, pending request for Transport & Logistics (older ones declined, cancelled)
 *   Lia     active, a request awaiting payment, changes waiting for review
 *   Bianca  active, paid for Clinic Calm and uses it; a new pending request
 * Dates are relative to now, so the demo never goes stale.
 * TODO(backend): Supabase tables `clients`, `invites`, `template_requests`,
 * `card_entitlements`, `change_log`, `notifications`.
 */

const DAY = 86_400_000;
const HOUR = 3_600_000;
// Floored to the hour so the server render and the browser agree.
const BASE = Math.floor(Date.now() / HOUR) * HOUR;
/** `ago(2, 3)` = two days and three hours ago. */
export function ago(days: number, hours = 0): string {
  return new Date(BASE - days * DAY - hours * HOUR).toISOString();
}
const ahead = (days: number) => new Date(BASE + days * DAY).toISOString();

/* ------------------------------------------------- Two more client cards */

function rebundle(b: CardBundle, id: string, slug: string, patch: Partial<CardBundle["card"]>): CardBundle {
  const chartId = `${id}_org`;
  return {
    card: { ...b.card, id, slug, ...patch },
    photos: b.photos.map((p, i) => ({ ...p, id: `${id}-ph-${i + 1}`, cardId: id })),
    socials: b.socials.map((s, i) => ({ ...s, id: `${id}-so-${i + 1}`, cardId: id })),
    orgChart: { id: chartId, cardId: id, mode: "tree", created_at: b.card.created_at },
    orgMembers: b.orgMembers.map((m) => ({
      ...m,
      id: m.id.replace(b.orgChart?.id ?? "", chartId),
      parentId: m.parentId ? m.parentId.replace(b.orgChart?.id ?? "", chartId) : null,
      orgChartId: chartId,
    })),
  };
}

export const CLIENT_BUNDLES: CardBundle[] = [
  rebundle(counterPreview, "card_nena", "lutong-bahay-ni-aling-nena", {
    status: "draft",
    motion: true,
    clientId: "cl_nena",
    permissions: { clientCanPublish: false, requireReview: true },
    created_at: ago(4, 2),
    updated_at: ago(4, 1),
  }),
  rebundle(clinicPreview, "card_bianca", "salonga-family-dental", {
    status: "published",
    themeId: "sage",
    motion: true,
    clientId: "cl_bianca",
    permissions: { clientCanPublish: true, requireReview: false },
    created_at: ago(40),
    updated_at: ago(5, 21),
    published_at: ago(5, 21),
  }),
];

/** Ownership and permissions for the seed cards in seed.ts. */
export const SEED_CARD_CLIENTS: Record<string, { clientId: string; permissions: { clientCanPublish: boolean; requireReview: boolean }; review?: CardBundle["card"]["review"]; updated_at?: string }> = {
  card_maria: { clientId: "cl_maria", permissions: { clientCanPublish: false, requireReview: true } },
  card_joel: { clientId: "cl_joel", permissions: { clientCanPublish: true, requireReview: false } },
  card_carmela: { clientId: "cl_carmela", permissions: { clientCanPublish: false, requireReview: true } },
  card_lia: {
    clientId: "cl_lia",
    permissions: { clientCanPublish: false, requireReview: true },
    review: { status: "pending", submittedAt: ago(0, 4) },
    updated_at: ago(0, 4),
  },
};

/* ---------------------------------------------------------------- Clients */

export const SEED_CLIENTS: Client[] = [
  { id: "cl_maria", name: "Maria Concepcion Villanueva-Santiago", email: "maria@villanuevahomes.ph", phone: "+63 917 555 0163", company: "Villanueva Homes", status: "invited", invitedAt: ago(1, 22), cardId: "card_maria" },
  { id: "cl_nena", name: "Nenita Dizon", email: "orders@alingnena.ph", phone: "+63 917 555 0119", company: "Lutong Bahay ni Aling Nena", status: "invited", invitedAt: ago(3, 23), cardId: "card_nena" },
  { id: "cl_joel", name: "Joel Mercado", email: "joel@pasigfreight.ph", phone: "+63 918 555 0127", company: "Pasig Freight Lines", status: "active", invitedAt: ago(35), lastActiveAt: ago(2, 20), cardId: "card_joel" },
  { id: "cl_carmela", name: "Carmela Reyes-Tan", email: "carmela@tanocampo.ph", phone: "+63 917 555 0142", company: "Tan & Ocampo Realty", status: "active", invitedAt: ago(30), lastActiveAt: ago(0, 3), cardId: "card_carmela" },
  { id: "cl_lia", name: "Lia Soriano", email: "lia@kapehan.ph", phone: "+63 927 555 0135", company: "Kapehan sa Calle Real", status: "active", invitedAt: ago(21), lastActiveAt: ago(0, 4), cardId: "card_lia" },
  { id: "cl_bianca", name: "Dr. Bianca Salonga", email: "clinic@salongadental.ph", phone: "+63 917 555 0174", company: "Salonga Family Dental", status: "active", invitedAt: ago(40), lastActiveAt: ago(0, 18), cardId: "card_bianca" },
];

/* ---------------------------------------------------------------- Invites */

const inv = (i: Omit<Invite, "createdAt" | "channel"> & { channel?: Invite["channel"] }): Invite => ({ channel: "email", createdAt: i.sentAt ?? ago(0), ...i });

export const SEED_INVITES: Invite[] = [
  inv({ id: "inv_maria", clientId: "cl_maria", cardId: "card_maria", token: "mvs-4hT9qL", sentAt: ago(1, 22), expiresAt: ahead(5), status: "sent" }),
  inv({ id: "inv_nena", clientId: "cl_nena", cardId: "card_nena", token: "nd-8pR2xk", sentAt: ago(3, 23), openedAt: ago(2, 17), expiresAt: ahead(3), status: "opened" }),
  inv({ id: "inv_joel_1", clientId: "cl_joel", cardId: "card_joel", token: "jm-old-2Fv7", sentAt: ago(45), expiresAt: ago(38), status: "expired" }),
  inv({ id: "inv_joel_2", clientId: "cl_joel", cardId: "card_joel", token: "jm-6Wc3nb", sentAt: ago(35), openedAt: ago(34, 21), acceptedAt: ago(34, 21), expiresAt: ago(28), status: "accepted" }),
  inv({ id: "inv_carmela", clientId: "cl_carmela", cardId: "card_carmela", token: "crt-9Lm4vd", sentAt: ago(30), openedAt: ago(29, 23), acceptedAt: ago(29, 23), expiresAt: ago(23), status: "accepted" }),
  inv({ id: "inv_lia_1", clientId: "cl_lia", cardId: "card_lia", token: "ls-1Qa7zt", sentAt: ago(22), expiresAt: ago(15), revokedAt: ago(21, 1), status: "revoked" }),
  inv({ id: "inv_lia_2", clientId: "cl_lia", cardId: "card_lia", token: "ls-5Kd8wy", sentAt: ago(21), openedAt: ago(20, 22), acceptedAt: ago(20, 22), expiresAt: ago(14), status: "accepted" }),
  inv({ id: "inv_bianca", clientId: "cl_bianca", cardId: "card_bianca", token: "bs-3Rn6hp", sentAt: ago(40), openedAt: ago(39, 23), acceptedAt: ago(39), expiresAt: ago(33), status: "accepted" }),
];

/* ------------------------------------------------------ Template requests */

const req = (r: Omit<TemplateRequest, "currency">): TemplateRequest => ({ currency: "PHP", ...r });

export const SEED_TEMPLATE_REQUESTS: TemplateRequest[] = [
  req({ id: "tr_1", clientId: "cl_joel", cardId: "card_joel", templateId: "transit", themeId: "hazard", price: 499, note: "Mas bagay sa trucking ’to, lalo na yung dilaw. Pwede po bang GCash?", status: "pending", requestedAt: ago(0, 6) }),
  req({ id: "tr_2", clientId: "cl_joel", cardId: "card_joel", templateId: "noir-ledger", themeId: "graphite", price: 299, status: "declined", requestedAt: ago(10), resolvedAt: ago(9, 2), adminNote: "Noir Ledger is made for advisers and law offices, and your truck photos get lost on it. Transport & Logistics was built for fleets like yours; happy to show it to you." }),
  req({ id: "tr_3", clientId: "cl_joel", cardId: "card_joel", templateId: "boardroom", price: 499, status: "cancelled", requestedAt: ago(14), resolvedAt: ago(14, 1) }),
  req({ id: "tr_4", clientId: "cl_lia", cardId: "card_lia", templateId: "sunny-counter", themeId: "calamansi", price: 299, note: "For our menu board feel. Can we see it with the calamansi colors?", status: "awaiting_payment", requestedAt: ago(3, 5), paymentRequestedAt: ago(2, 3), adminNote: "Sent GCash and bank details." }),
  req({ id: "tr_5", clientId: "cl_lia", cardId: "card_lia", templateId: "place-first", price: 299, status: "approved", requestedAt: ago(21), resolvedAt: ago(21), compReason: "Café launch promo: first template free.", byAdmin: true }),
  req({ id: "tr_6", clientId: "cl_bianca", cardId: "card_bianca", templateId: "clinic-calm", themeId: "sage", price: 299, note: "Para sa clinic, yung may oras at serbisyo.", status: "paid", requestedAt: ago(8), paymentRequestedAt: ago(7, 2), resolvedAt: ago(6, 3), paidAmount: 299, paymentRef: "GCash 7781 2203 9915" }),
  req({ id: "tr_7", clientId: "cl_bianca", cardId: "card_bianca", templateId: "bilingual", themeId: "capiz", price: 499, note: "Many of our lolos and lolas read Filipino better. Can we have both?", status: "pending", requestedAt: ago(0, 9) }),
  req({ id: "tr_8", clientId: "cl_lia", cardId: "card_lia", templateId: "event-promo", themeId: "fiesta", price: 499, note: "For our 5th anniversary on the 15th. Only for a month, then back.", status: "pending", requestedAt: ago(1, 4) }),
];

/* ----------------------------------------------------------- Entitlements */

/** Templates set up by the admin before clients could request them count as unlocked (comped at setup). */
export const SEED_ENTITLEMENTS: CardEntitlements[] = [
  { cardId: "card_carmela", unlockedTemplateIds: [] },
  { cardId: "card_joel", unlockedTemplateIds: ["landmark"] },
  { cardId: "card_lia", unlockedTemplateIds: ["place-first"] },
  { cardId: "card_maria", unlockedTemplateIds: ["landmark"] },
  { cardId: "card_bianca", unlockedTemplateIds: ["clinic-calm"] },
  { cardId: "card_nena", unlockedTemplateIds: ["sunny-counter"] },
];

/* ------------------------------------------------------------- Change log */

const log = (id: string, cardId: string, actor: "admin" | "client", actorName: string, field: string, at: string): ChangeLog => ({ id, cardId, actor, actorName, field, at });

export const SEED_CHANGE_LOG: ChangeLog[] = [
  log("lg_1", "card_carmela", "admin", ADMIN_NAME, "Card created", ago(31)),
  log("lg_2", "card_carmela", "client", "Carmela Reyes-Tan", "Quote", ago(4, 20)),
  log("lg_3", "card_carmela", "client", "Carmela Reyes-Tan", "Album", ago(4, 21)),
  log("lg_4", "card_carmela", "admin", ADMIN_NAME, "Published", ago(3, 22)),
  log("lg_5", "card_lia", "admin", ADMIN_NAME, "Card created", ago(22)),
  log("lg_6", "card_lia", "client", "Lia Soriano", "Opening hours", ago(0, 5)),
  log("lg_7", "card_lia", "client", "Lia Soriano", "Album", ago(0, 4)),
  log("lg_8", "card_joel", "admin", ADMIN_NAME, "Card created", ago(36)),
  log("lg_9", "card_joel", "client", "Joel Mercado", "Socials", ago(2, 20)),
  log("lg_10", "card_joel", "client", "Joel Mercado", "Published", ago(2, 20)),
  log("lg_11", "card_bianca", "admin", ADMIN_NAME, "Card created", ago(40)),
  log("lg_12", "card_bianca", "admin", ADMIN_NAME, "Template", ago(5, 21)),
  log("lg_13", "card_bianca", "client", "Dr. Bianca Salonga", "Services", ago(0, 18)),
  log("lg_14", "card_maria", "admin", ADMIN_NAME, "Card created", ago(1, 23)),
  log("lg_15", "card_nena", "admin", ADMIN_NAME, "Card created", ago(4, 2)),
];

/* ---------------------------------------------------------- Notifications */

export const SEED_NOTIFICATIONS: ClientNotification[] = [
  { id: "nt_1", clientId: "cl_lia", cardId: "card_lia", kind: "payment_requested", title: "Payment details for Sunny Counter", body: "Pay ₱299 by GCash, Maya or bank transfer. Sunny Counter unlocks as soon as payment is confirmed.", at: ago(2, 3), read: false, requestId: "tr_4", emailed: true },
  { id: "nt_2", clientId: "cl_joel", cardId: "card_joel", kind: "request_declined", title: "Noir Ledger wasn’t approved", body: "Noir Ledger is made for advisers and law offices, and your truck photos get lost on it. Transport & Logistics was built for fleets like yours; happy to show it to you.", at: ago(9, 2), read: false, requestId: "tr_2", emailed: true },
  { id: "nt_3", clientId: "cl_bianca", cardId: "card_bianca", kind: "template_unlocked", title: "Clinic Calm is unlocked", body: "Payment received, thank you. Clinic Calm is ready in Design, and you can switch back to Keepsake any time.", at: ago(6, 3), read: true, requestId: "tr_6", emailed: true },
  { id: "nt_4", clientId: "cl_lia", cardId: "card_lia", kind: "template_unlocked", title: "Place First is unlocked", body: "Place First is yours, no charge, from the café launch promo.", at: ago(21), read: true, requestId: "tr_5", emailed: true },
  { id: "nt_5", clientId: "cl_carmela", cardId: "card_carmela", kind: "review_changes", title: "Changes requested", body: "Please use the new licence number, PRC REB No. 0004127, before this goes live.", at: ago(6), read: true, emailed: true },
  { id: "nt_6", clientId: "cl_carmela", cardId: "card_carmela", kind: "review_approved", title: "Your changes are live", body: "Tapik reviewed and published your latest edits.", at: ago(3, 22), read: false, emailed: true },
];

/** Admin overrides on top of lib/pricing.ts. One example: Landmark is on a ₱249 promo. */
export const SEED_PRICING: PricingOverrides = {
  landmark: { tier: "paid", price: 249 },
};
