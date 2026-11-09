import type { TemplateManifest } from "../types";

/** L - Habi Mosaic. Photo mosaic hero from your cover and album. */
export const manifest: TemplateManifest = {
  id: "mosaic",
  name: "Habi Mosaic",
  category: "Creative",
  tags: ["shop", "gallery", "maker", "boutique", "handmade", "crafts"],
  description: "The work first: a three-column photo mosaic with your label on it, a serif name beside a small round photo, Order or inquire, and a two-column masonry gallery with captions.",
  bestFor: "Weavers, makers, boutiques and small studios that sell what they make",
  fonts: { heading: "Cormorant Garamond", body: "Work Sans" },
  fontPairingId: "mosaic",
  themes: [
    { id: "indigo", name: "Indigo", tokens: {"background":  "#FFFFFF", "onBackground":  "#1F1B16", "surface":  "#F6F3EE", "text":  "#1F1B16", "primary":  "#2C3E8F", "onPrimary":  "#FFFFFF", "accent":  "#2C3E8F"} },
    { id: "madder", name: "Madder", tokens: {"background":  "#FFFFFF", "onBackground":  "#1F1B16", "surface":  "#F6F3EE", "text":  "#1F1B16", "primary":  "#8A3B2E", "onPrimary":  "#FFFFFF", "accent":  "#8A3B2E"} },
    { id: "moss", name: "Moss", tokens: {"background":  "#FFFFFF", "onBackground":  "#1F1B16", "surface":  "#F6F3EE", "text":  "#1F1B16", "primary":  "#2F5D4A", "onPrimary":  "#FFFFFF", "accent":  "#2F5D4A"} },
    { id: "ink", name: "Ink", tokens: {"background":  "#FFFFFF", "onBackground":  "#1F1B16", "surface":  "#F6F3EE", "text":  "#1F1B16", "primary":  "#1F1B16", "onPrimary":  "#FFFFFF", "accent":  "#1F1B16"} },
  ],
  defaultSectionOrder: ["quote", "photos", "about", "orgChart", "map", "contact", "socials"],
  supports: { coverPhoto: true, orgChartTree: true, booking: true, bookingCta: true, photoTags: true },
  traits: ["Photo mosaic hero from your cover and album", "Serif name beside a small round photo", "Two-column masonry gallery with captions"],
  photoShape: "circle",
  accent: { on: "background", use: "text" },
  buttonShape: "rounded",
  buttonFill: "solid",
  popularity: 24,
  addedAt: "2026-11-06",
  isNew: true,
};
