"use client";

/**
 * The only place the portal home and the notification bell touch template
 * request data, so those two screens stay simple.
 */
import type { MockDB } from "@/lib/mock";
import { OPEN_REQUEST } from "@/lib/entitlements";
import { formatPeso } from "@/lib/pricing";
import { requestTemplateName, requestThemeName, requestsForCard } from "@/lib/services/requests";
import { applyTemplate, applyUnlocked } from "@/lib/services/templates";
import type { ClientNotification } from "@/lib/types";

/** A request as the portal shows it: name, price, status and when. */
export type PortalRequest = {
  id: string;
  /** Template name ("Transport & Logistics"). */
  name: string;
  /** The theme the client was previewing, if any ("Hazard"). */
  themeName?: string;
  price: string;
  status: string;
  awaitingPayment: boolean;
  requestedAt: string;
  paymentRequestedAt?: string;
  /** QR payments: the studio's note when a payment wasn't accepted. */
  reviewNote?: string;
  paymentSubmittedAt?: string;
};

/** Open template requests (pending or awaiting payment) on a card, newest first. */
export function openPortalRequests(db: MockDB, cardId: string): PortalRequest[] {
  return requestsForCard(db, cardId)
    .filter((r) => OPEN_REQUEST.includes(r.status))
    .map((r) => ({
      id: r.id,
      name: requestTemplateName(r),
      themeName: r.themeId ? requestThemeName(r) : undefined,
      price: formatPeso(r.price),
      status: r.status,
      awaitingPayment: r.status === "awaiting_payment",
      requestedAt: r.requestedAt,
      paymentRequestedAt: r.paymentRequestedAt,
      reviewNote: r.status === "payment_rejected" ? r.payment?.reviewNote : undefined,
      paymentSubmittedAt: r.payment?.submittedAt,
    }));
}

/** Notification kinds that mean "something you asked for is now yours". */
export function isUnlockNotice(n: ClientNotification): boolean {
  return n.kind === "template_unlocked" || n.kind === "template_applied";
}

export type ApplyOutcome = { ok: true; name: string; undo: () => void } | { ok: false; error: string };

export type UnlockAction = { kind: "apply"; label: string; run: () => ApplyOutcome } | { kind: "in-use"; label: string };

/**
 * What an unlock notification offers. Unlocking never switches the card by
 * itself: "Apply now" while the card is on another template, "In use" once
 * it's on the unlocked one.
 */
export function unlockActionFor(db: MockDB, n: ClientNotification): UnlockAction | null {
  if (!isUnlockNotice(n) || !n.requestId) return null;
  const req = db.templateRequests.find((r) => r.id === n.requestId);
  const card = db.cards.find((c) => c.id === n.cardId);
  if (!req || !card) return null;
  if (card.templateId === req.templateId) return { kind: "in-use", label: "In use" };
  return {
    kind: "apply",
    label: "Apply now",
    run: () => {
      const res = applyUnlocked(req.id);
      if (!res.ok) return { ok: false, error: res.error };
      const prev = res.data.prev;
      return { ok: true, name: requestTemplateName(req), undo: () => void applyTemplate(card.id, prev) };
    },
  };
}
