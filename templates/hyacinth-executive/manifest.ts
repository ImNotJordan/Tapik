import type { TemplateManifest } from "../types";
import { FONTS, THEME_TOKENS } from "./brand";

/** J - Hyacinth Executive. Black hero with a gold petal mark, Book a Strategy Call first, an off-white sheet trimmed in gold. */
export const manifest: TemplateManifest = {
  id: "hyacinth-executive",
  name: "Hyacinth Executive",
  category: "Corporate",
  tags: ["consulting", "executive", "agency", "black-gold", "booking"],
  description:
    "Black hero with a gold petal mark, a red Book a Strategy Call button first, silver details, expertise chips and an off-white sheet trimmed in gold.",
  bestFor: "Consultancies, fractional executives, agencies",
  fonts: { heading: FONTS.heading.family, body: FONTS.body.family, accent: FONTS.accent.family },
  fontPairingId: "hyacinth",
  themes: [
    { id: "hyacinth-black", name: "Hyacinth Black", tokens: THEME_TOKENS.black },
    { id: "hyacinth-charcoal", name: "Hyacinth Charcoal", tokens: THEME_TOKENS.charcoal },
    { id: "hyacinth-light", name: "Hyacinth Light", tokens: THEME_TOKENS.light },
  ],
  // The quote is the brand line in the hero; the rest run down the sheet in this order.
  defaultSectionOrder: ["quote", "about", "contact", "socials", "photos", "map", "orgChart"],
  supports: { coverPhoto: true, orgChartTree: true, serviceChips: true, booking: true, bookingCta: true, expertiseChips: true, taglines: true },
  isNew: true,
  traits: [
    "Black hero: cover photo panel with gold rings, your photo framed in gold",
    "Book a Strategy Call first, then Call and Message",
    "Expertise chips, then everything else on an off-white sheet with a gold edge",
  ],
  photoShape: "rounded-square",
  accent: { on: "background", use: "text" },
  buttonShape: "rounded",
  buttonFill: "solid",
  popularity: 41,
  addedAt: "2026-11-02",
};
