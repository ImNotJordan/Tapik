import type { TemplateManifest } from "../types";

/** G - Boardroom. Brand band, employee ID card, action tiles, bordered panels. */
export const manifest: TemplateManifest = {
  id: "boardroom",
  name: "Boardroom",
  category: "Corporate",
  tags: ["company", "id card", "team", "org chart", "structured"],
  description: "A brand band with the logo, an employee ID card overlapping it (photo, name, department, employee ID), four action tiles, sections in bordered panels and an org chart tree with the card owner highlighted.",
  bestFor: "Company staff cards issued by HR or sales teams.",
  fonts: { heading: "IBM Plex Sans", body: "IBM Plex Sans", mono: "IBM Plex Mono" },
  fontPairingId: "boardroom",
  themes: [
    { id: "navy", name: "Navy", tokens: { background: "#F5F6F8", onBackground: "#1B2433", surface: "#FFFFFF", text: "#1B2433", primary: "#13294B", onPrimary: "#FFFFFF", accent: "#E07B1F" } },
    { id: "pine", name: "Pine", tokens: { background: "#F4F6F4", onBackground: "#18251F", surface: "#FFFFFF", text: "#18251F", primary: "#173D33", onPrimary: "#FFFFFF", accent: "#E3A33B" } },
    { id: "merlot", name: "Merlot", tokens: { background: "#F7F4F5", onBackground: "#2A1820", surface: "#FFFFFF", text: "#2A1820", primary: "#4A1426", onPrimary: "#FFFFFF", accent: "#E9A23B" } },
    { id: "graphite", name: "Graphite", tokens: { background: "#EEF0F2", onBackground: "#1C232B", surface: "#FFFFFF", text: "#1C232B", primary: "#22303C", onPrimary: "#FFFFFF", accent: "#5FC4B0" } },
  ],
  defaultSectionOrder: ["about", "orgChart", "contact", "map", "photos", "socials", "quote"],
  supports: { coverPhoto: false, orgChartTree: true, idCard: true },
  traits: ["Brand band with an employee ID card over it", "Four action tiles: Call, SMS, Email, Save", "Bordered panels, org chart tree with you highlighted"],
  photoShape: "square",
  accent: { on: "primary", use: "mark" },
  buttonShape: "rounded",
  buttonFill: "solid",
  popularity: 74,
  addedAt: "2026-10-15",
};
