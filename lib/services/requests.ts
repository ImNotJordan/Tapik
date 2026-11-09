/**
 * Template requests and client notifications.
 * Mock mode: the local store. Firebase mode: Functions (functions/src/requests.ts)
 * write requests, unlocks and notifications; the listeners bring them back here,
 * so the studio sees a client's request the moment it's made.
 */
import * as portal from "@/lib/store/portal";
import type { AdminResult } from "@/lib/store/portal";
import type { TemplateRequest } from "@/lib/types";
import { isFirebaseMode } from "./mode";
import type { Result } from "./types";

export {
  markAllRead, openRequests, paymentEmail, pendingRequestCount,
  requestTemplateName, requestThemeName, requestsForCard, type AdminResult,
} from "@/lib/store/portal";

async function call<O>(name: string, data: unknown): Promise<Result<O>> {
  const { call } = await import("./callable");
  return call<O>(name, data);
}

export async function requestTemplate(cardId: string, templateId: string, themeId: string | undefined, note: string): Promise<Result<TemplateRequest>> {
  if (!isFirebaseMode) return portal.requestTemplate(cardId, templateId, themeId, note);
  return call<TemplateRequest>("requestTemplate", { cardId, templateId, themeId, note: note.trim() || undefined });
}

export async function cancelRequest(requestId: string): Promise<Result> {
  if (!isFirebaseMode) return portal.cancelRequest(requestId);
  const r = await call<{ ok: true }>("cancelTemplateRequest", { requestId });
  return r.ok ? { ok: true, data: undefined } : r;
}

/** An admin action, with an Undo that puts the request, the unlock and the client's notification back. */
async function adminAction(name: string, data: { requestId: string } & Record<string, unknown>): Promise<AdminResult> {
  const r = await call<unknown>(name, data);
  if (!r.ok) return r;
  return { ok: true, data: { undo: () => void call("undoTemplateRequestAction", { requestId: data.requestId }) } };
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
