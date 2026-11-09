/**
 * Template requests and client notifications.
 * Mock mode: the local store (manual payment flow). Firebase mode: Functions
 * (functions/src/requests.ts) write requests, unlocks, the card's new look and
 * notifications; the listeners bring them back here.
 */
import * as portal from "@/lib/store/portal";
import type { AdminResult } from "@/lib/store/portal";
import type { TemplateRequestStatus } from "@/lib/types";
import { isFirebaseMode } from "./mode";
import type { Result } from "./types";

export {
  markAllRead, openRequests, paymentEmail, paymentsToVerify, pendingRequestCount,
  requestTemplateName, requestThemeName, requestsForCard, type AdminResult,
} from "@/lib/store/portal";

async function call<O>(name: string, data: unknown): Promise<Result<O>> {
  const { call } = await import("./callable");
  return call<O>(name, data);
}

/** The live card changed (an approval applied a template, or Undo put it back): refresh its public page now. */
async function refresh(slug: string | null | undefined) {
  if (!slug) return;
  const { refreshPublicPages } = await import("./cards");
  await refreshPublicPages([slug]);
}

export type Requested = { requestId: string; status: TemplateRequestStatus; created: boolean };

/** Ask for a paid template. With QR payments on, it opens straight at "Payment needed"; a second ask returns the open request. */
export async function requestTemplate(cardId: string, templateId: string, themeId: string | undefined, note: string): Promise<Result<Requested>> {
  if (!isFirebaseMode) {
    const r = await portal.requestTemplate(cardId, templateId, themeId, note);
    return r.ok ? { ok: true, data: { requestId: r.data.id, status: r.data.status, created: true } } : r;
  }
  return call<Requested>("requestTemplate", { cardId, templateId, themeId, note: note.trim() || undefined });
}

export async function cancelRequest(requestId: string): Promise<Result> {
  if (!isFirebaseMode) return portal.cancelRequest(requestId);
  const r = await call<{ ok: true }>("cancelTemplateRequest", { requestId });
  return r.ok ? { ok: true, data: undefined } : r;
}

/** An admin action, with an Undo that puts the request, the card's look, the unlock and the client's notification back. */
async function adminAction(name: string, data: { requestId: string } & Record<string, unknown>): Promise<AdminResult> {
  const r = await call<{ slug?: string | null }>(name, data);
  if (!r.ok) return r;
  await refresh(r.data?.slug);
  return {
    ok: true,
    data: {
      undo: () =>
        void call<{ slug?: string | null }>("undoTemplateRequestAction", { requestId: data.requestId }).then(async (u) => {
          if (u.ok) await refresh(u.data?.slug);
        }),
    },
  };
}

/** Approve a payment (or, with a reason, approve without one): unlocks the template and applies it to the client's card. */
export async function approveRequest(requestId: string, expectedStatus: "payment_submitted" | "pending_payment" | "payment_rejected", reason?: string): Promise<AdminResult> {
  if (!isFirebaseMode) return portal.compRequest(requestId, reason ?? "Payment verified.");
  return adminAction("approveTemplateRequest", { requestId, expectedStatus, reason: reason?.trim() || undefined });
}

/** The payment couldn't be confirmed: the client sees the note and can submit again. */
export async function rejectPayment(requestId: string, note: string): Promise<AdminResult> {
  if (!isFirebaseMode) return { ok: false, error: "QR payments work with the Firebase backend only." };
  return adminAction("rejectTemplatePayment", { requestId, note });
}

export async function sendPaymentDetailsFor(requestId: string, subject: string, body: string): Promise<AdminResult> {
  if (!isFirebaseMode) return portal.sendPaymentDetailsFor(requestId, subject, body);
  return adminAction("sendTemplatePaymentDetails", { requestId, subject, body });
}

export async function markRequestPaid(requestId: string, amount: number, reference: string): Promise<AdminResult> {
  if (!isFirebaseMode) return portal.markRequestPaid(requestId, amount, reference);
  return adminAction("markTemplateRequestPaid", { requestId, amount, reference: reference.trim() || undefined });
}

export async function compRequest(requestId: string, reason: string): Promise<AdminResult> {
  if (!isFirebaseMode) return portal.compRequest(requestId, reason);
  return adminAction("compTemplateRequest", { requestId, reason });
}

export async function declineRequest(requestId: string, note: string): Promise<AdminResult> {
  if (!isFirebaseMode) return portal.declineRequest(requestId, note);
  return adminAction("declineTemplateRequest", { requestId, note });
}
