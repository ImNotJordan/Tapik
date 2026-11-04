/**
 * Template requests and client notifications.
 * TODO(backend, phase 6): createTemplateRequest / cancel / sendPaymentDetails / markPaid / approve / decline callables.
 */
export {
  cancelRequest, markAllRead, openRequests, paymentEmail, pendingRequestCount, requestTemplate,
  requestTemplateName, requestThemeName, requestsForCard,
  sendPaymentDetailsFor, markRequestPaid, compRequest, declineRequest, type AdminResult,
} from "@/lib/store/portal";
