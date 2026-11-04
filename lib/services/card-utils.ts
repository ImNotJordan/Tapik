/**
 * Pure card helpers (no data access): message links, maps, vCard and calendar files.
 * TODO(backend, phase 7): /c/[slug]/vcard and .ics route handlers; geocoding via a server-side key.
 */
export { MESSAGE_LABEL, directionsUrl, generateCalendarFile, generateVCard, geocodeAddress, messageHref } from "@/lib/api";

/** Absolute public link for a card (server side: APP_BASE_URL, else the placeholder domain). */
export function publicCardUrlFor(slug: string): string {
  const base = (process.env.APP_BASE_URL || "https://tapik.ph").replace(/\/$/, "");
  return `${base}/c/${slug}`;
}
