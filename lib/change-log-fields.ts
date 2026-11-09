/**
 * Card fields as people name them in the change log. Shared by the browser
 * (mock store) and the onCardWritten trigger, so both log the same labels.
 * Fields not listed aren't logged.
 */
import type { Card } from "@/lib/types";

export const FIELD_LABELS: Partial<Record<keyof Card, string>> = {
  name: "Name",
  title: "Title",
  company: "Company",
  credential: "Licence line",
  quote: "Quote",
  description: "About",
  phone: "Phone",
  messageChannel: "Message button",
  messageTarget: "Message button",
  email: "Email",
  address: "Map",
  mapLat: "Map",
  mapLng: "Map",
  showDirections: "Map",
  agentPhotoUrl: "Photo",
  agentPhotoCrop: "Photo",
  agentPhotoAlt: "Photo",
  backgroundPhotoUrl: "Cover photo",
  backgroundFocalPoint: "Cover photo",
  backgroundPhotoAlt: "Cover photo",
  overlayOpacity: "Cover photo",
  logoUrl: "Logo",
  logoDarkUrl: "Logo",
  logoAlt: "Logo",
  hours: "Opening hours",
  services: "Services",
  serviceAreas: "Service areas",
  bookingUrl: "Booking link",
  bookingLabel: "Booking button",
  bookingNote: "Booking button",
  expertiseChips: "Expertise",
  tagline: "Tagline",
  eyebrow: "Tagline",
  department: "ID card",
  employeeId: "ID card",
  event: "Event",
  statusChip: "Status",
  translations: "Filipino version",
  stackRows: "Tech stack",
  githubUsername: "GitHub username",
  promptDemo: "Chat demo",
  sectionOrder: "Section order",
  hiddenSections: "Section order",
  templateId: "Template",
  themeId: "Theme",
  customTokens: "Theme",
  fontPairingId: "Fonts",
  buttonShape: "Buttons",
  buttonFill: "Buttons",
  motion: "Motion",
  slug: "Link",
};


/** Labels for edits that live outside the card document (sent as lastEditedSections). */
export const SECTION_LABELS = ["Socials", "Album", "Org chart"] as const;

/** Labels for a set of changed card keys, de-duplicated, in field order. */
export function labelsFor(keys: Iterable<string>): string[] {
  const out: string[] = [];
  for (const k of keys) {
    const l = FIELD_LABELS[k as keyof Card];
    if (l && !out.includes(l)) out.push(l);
  }
  return out;
}
