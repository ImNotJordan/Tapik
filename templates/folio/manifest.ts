import type { TemplateManifest } from "../types";

/** I - Folio. Letterhead: monogram seal, serif name, ruled definition list. */
export const manifest: TemplateManifest = {
  id: "folio",
  name: "Folio",
  category: "Professional",
  tags: ["letterhead", "law", "serif", "minimal", "no photo"],
  description: "Set like letterhead: a monogram seal top left and no cover photo, a serif name with an italic surname, a small grayscale photo beside the quote, contacts as a ruled definition list and firm members as ruled rows.",
  bestFor: "Lawyers, notaries, accountants and advisers.",
  fonts: { heading: "Newsreader", body: "Public Sans" },
  fontPairingId: "folio",
  themes: [
    { id: "paper", name: "Paper", tokens: { background: "#FFFFFF", onBackground: "#111111", surface: "#F5F4F1", text: "#111111", primary: "#111111", onPrimary: "#FFFFFF", accent: "#A3241B" } },
    { id: "cream", name: "Cream", tokens: { background: "#F7F3EA", onBackground: "#1A1A1A", surface: "#EEE8DB", text: "#1A1A1A", primary: "#1A1A1A", onPrimary: "#F7F3EA", accent: "#1F4D3A" } },
    { id: "bond", name: "Bond", tokens: { background: "#F4F5F2", onBackground: "#0F1E33", surface: "#E9EBE6", text: "#0F1E33", primary: "#0F1E33", onPrimary: "#F4F5F2", accent: "#7D5F14" } },
    { id: "ink", name: "Ink", tokens: { background: "#141414", onBackground: "#F1EDE4", surface: "#1E1E1E", text: "#F1EDE4", primary: "#F1EDE4", onPrimary: "#141414", accent: "#E0675A" } },
  ],
  defaultSectionOrder: ["quote", "about", "contact", "orgChart", "map", "socials", "photos"],
  supports: { coverPhoto: false, orgChartTree: true },
  traits: ["Letterhead with a monogram seal; no cover photo", "Serif name with an italic surname, small grayscale photo", "Contacts as a ruled definition list, members as ruled rows"],
  photoShape: "square",
  accent: { on: "background", use: "text" },
  buttonShape: "square",
  buttonFill: "outline",
  popularity: 63,
  addedAt: "2026-10-15",
};
