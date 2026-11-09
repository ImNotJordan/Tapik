import type { TemplateManifest } from "../types";

/** N - Dalawang Wika. EN / FIL switch: labels and your own words change language. */
export const manifest: TemplateManifest = {
  id: "dalawang-wika",
  name: "Dalawang Wika",
  category: "Professional",
  tags: ["bilingual", "filipino", "tagalog", "advisor", "insurance", "two languages"],
  description: "English or Filipino at a tap: a blue band with a sun, an identity card with Book a free consultation, and every label, your title, quote and bio switching language.",
  bestFor: "Advisors, agents and anyone whose clients prefer Filipino",
  fonts: { heading: "Plus Jakarta Sans", body: "Plus Jakarta Sans" },
  fontPairingId: "wika",
  themes: [
    { id: "asul-araw", name: "Asul at araw", tokens: {"background":  "#F4F7FC", "onBackground":  "#0E1B33", "surface":  "#FFFFFF", "text":  "#0E1B33", "primary":  "#0B3D91", "onPrimary":  "#FFFFFF", "accent":  "#FCD116"} },
    { id: "marun-aprikot", name: "Marun at aprikot", tokens: {"background":  "#F4F7FC", "onBackground":  "#0E1B33", "surface":  "#FFFFFF", "text":  "#0E1B33", "primary":  "#7A1F3D", "onPrimary":  "#FFFFFF", "accent":  "#FFB38A"} },
    { id: "gubat-dagat", name: "Gubat at dagat", tokens: {"background":  "#F4F7FC", "onBackground":  "#0E1B33", "surface":  "#FFFFFF", "text":  "#0E1B33", "primary":  "#14532D", "onPrimary":  "#FFFFFF", "accent":  "#9BE3D8"} },
  ],
  defaultSectionOrder: ["about", "photos", "map", "orgChart", "contact", "socials", "quote"],
  supports: { coverPhoto: false, orgChartTree: true, serviceChips: true, booking: true, bookingCta: true, translations: true },
  traits: ["EN / FIL switch: labels and your own words change language", "Identity card over a blue band with a sun", "Book a free consultation first, then Call and Message"],
  photoShape: "rounded-square",
  accent: { on: "primary", use: "text" },
  buttonShape: "rounded",
  buttonFill: "solid",
  popularity: 25,
  addedAt: "2026-11-06",
  isNew: true,
};
