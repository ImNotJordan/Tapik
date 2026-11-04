/**
 * Tapik Cloud Functions (2nd gen, Node 24, asia-southeast1).
 * Each callable checks the caller's role, validates with the shared zod
 * schemas and throws HttpsError with a friendly message on failure.
 */
import "./setup";
import { onCall } from "firebase-functions/v2/https";
import { caller } from "./guards";
import { REGION } from "./setup";

/** Smoke test for the wiring: who am I, and is the backend reachable? */
export const whoami = onCall((req) => {
  const c = caller(req);
  return { role: c.role, uid: c.uid, region: REGION, at: new Date().toISOString() };
});

export { sendSignInLink, setClientDisabled } from "./auth";
export { createCardFromBundle, checkSlug, changeSlug, onCardWritten } from "./cards";
export { onPhotoUpload, onPhotoCreated } from "./media";
export { createClientCard, sendInvite, resendInvite, revokeInvite, getInvite, acceptInvite, expireInvites } from "./invites";
