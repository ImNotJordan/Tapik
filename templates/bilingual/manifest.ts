import type { TemplateManifest } from "../types";

/** O - Bilingual. English and Filipino labels with a visitor toggle. */
export const manifest: TemplateManifest = {
  id: "bilingual",
  name: "Bilingual",
  category: "Professional",
  tags: ["filipino", "english", "tagalog", "language", "insurance"],
  description: "Every label is set in English and Filipino. Visitors switch language with a toggle in the header; section titles show both, with the other language set quietly beneath. A bold color rail runs down the left edge.",
  bestFor: "Agents and public-facing staff who serve clients in both languages.",
  fonts: { heading: "Bitter", body: "Karla" },
  fontPairingId: "bilingual",
  themes: [
    { id: "banig", name: "Banig", tokens: { background: "#F6EFE2", onBackground: "#2A1E14", surface: "#FFFFFF", text: "#2A1E14", primary: "#9E3B22", onPrimary: "#FFFFFF", accent: "#9E3B22" } },
    { id: "capiz", name: "Capiz", tokens: { background: "#F2F1EC", onBackground: "#1F2A2E", surface: "#FFFFFF", text: "#1F2A2E", primary: "#1F5560", onPrimary: "#FFFFFF", accent: "#1F5560" } },
    { id: "dagat", name: "Dagat", tokens: { background: "#E4EFEE", onBackground: "#12343B", surface: "#FFFFFF", text: "#12343B", primary: "#12343B", onPrimary: "#FFFFFF", accent: "#B24F2A" } },
    { id: "narra", name: "Narra", tokens: { background: "#3B2417", onBackground: "#F5E9D8", surface: "#4A2F1F", text: "#F5E9D8", primary: "#F0C27A", onPrimary: "#2B190E", accent: "#F0C27A" } },
  ],
  defaultSectionOrder: ["about", "contact", "socials", "photos", "map", "orgChart", "quote"],
  supports: { coverPhoto: true, orgChartTree: true },
  traits: ["English and Filipino labels with a visitor toggle", "Section titles in both languages", "Color rail down the left edge"],
  photoShape: "rounded-square",
  accent: { on: "background", use: "mark" },
  buttonShape: "rounded",
  buttonFill: "solid",
  popularity: 27,
  addedAt: "2026-11-01",
  isNew: true,
};
