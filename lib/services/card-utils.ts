/**
 * Pure card helpers (no data access): message links, maps, vCard and calendar files.
 * TODO(backend, phase 7): /c/[slug]/vcard and .ics route handlers; geocoding via a server-side key.
 */
export { MESSAGE_LABEL, directionsUrl, generateCalendarFile, generateVCard, geocodeAddress, getMapEmbed, messageHref } from "@/lib/api";
