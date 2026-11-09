import type { TemplateManifest } from "../types";

/** M - Opening Night. Date block in a big circle with the time. */
export const manifest: TemplateManifest = {
  id: "opening-night",
  name: "Opening Night",
  category: "Local business",
  tags: ["event", "promo", "restaurant", "opening", "launch", "countdown"],
  description: "A big date in a bright circle, the event headline, a live countdown to the second, Reserve a table, then a cream sheet with the owners, photos, map and crew.",
  bestFor: "Restaurant openings, launches, pop-ups and one-night events",
  fonts: { heading: "Unbounded", body: "Outfit" },
  fontPairingId: "opening",
  themes: [
    { id: "teal-coral", name: "Teal & coral", tokens: {"background":  "#0B5C5E", "onBackground":  "#FFF4E2", "surface":  "#FFF4E2", "text":  "#1B1410", "primary":  "#FF7A5C", "onPrimary":  "#1B1410", "accent":  "#FF7A5C"} },
    { id: "plum-marigold", name: "Plum & marigold", tokens: {"background":  "#3B1F5C", "onBackground":  "#FFF4E2", "surface":  "#FFF4E2", "text":  "#1B1410", "primary":  "#FFC94A", "onPrimary":  "#1B1410", "accent":  "#FFC94A"} },
    { id: "navy-mint", name: "Navy & mint", tokens: {"background":  "#1E3A5F", "onBackground":  "#FFF4E2", "surface":  "#FFF4E2", "text":  "#1B1410", "primary":  "#7EE0B5", "onPrimary":  "#1B1410", "accent":  "#7EE0B5"} },
  ],
  defaultSectionOrder: ["quote", "photos", "map", "orgChart", "socials", "contact", "about"],
  supports: { coverPhoto: true, orgChartTree: true, event: true, booking: true, bookingCta: true },
  traits: ["Date block in a big circle with the time", "Live countdown: days, hours, minutes, seconds", "Reserve first, then a cream sheet with everything else"],
  photoShape: "circle",
  accent: { on: "background", use: "mark" },
  buttonShape: "pill",
  buttonFill: "solid",
  popularity: 22,
  addedAt: "2026-11-06",
  isNew: true,
};
