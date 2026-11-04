/**
 * Function settings from functions/.env.<project> (non-secret) and Secret Manager (secrets).
 * APP_BASE_URL: where links in emails point (https://tapik.ph in production).
 * ENFORCE_APP_CHECK: turn on once the reCAPTCHA Enterprise key is set up (DEPLOY.md).
 */
import { defineString } from "firebase-functions/params";

export const APP_BASE_URL = defineString("APP_BASE_URL", { default: "https://tapik.ph" });
/** enforceAppCheck takes a plain boolean, read when functions are loaded (deploy and cold start). */
export const enforceAppCheck = process.env.ENFORCE_APP_CHECK === "true";

export const isEmulator = process.env.FUNCTIONS_EMULATOR === "true";

/** Extra app origins allowed in links (comma-separated), e.g. a local dev server talking to production. */
export const APP_ALLOWED_ORIGINS = defineString("APP_ALLOWED_ORIGINS", { default: "" });

/**
 * The app origin for links in emails. Emulators accept any localhost origin; production
 * uses the caller's origin only if it's in APP_ALLOWED_ORIGINS, otherwise APP_BASE_URL.
 */
export function appOrigin(requestOrigin?: string | null): string {
  if (isEmulator && requestOrigin && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(requestOrigin)) return requestOrigin;
  const allowed = APP_ALLOWED_ORIGINS.value().split(",").map((o) => o.trim().replace(/\/$/, "")).filter(Boolean);
  if (requestOrigin && allowed.includes(requestOrigin.replace(/\/$/, ""))) return requestOrigin.replace(/\/$/, "");
  return APP_BASE_URL.value().replace(/\/$/, "");
}
