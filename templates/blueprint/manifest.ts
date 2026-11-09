import type { TemplateManifest } from "../types";

/** O - Blueprint. Drawing-sheet grid, white frames and a dimension line. */
export const manifest: TemplateManifest = {
  id: "blueprint",
  name: "Blueprint",
  category: "Professional",
  tags: ["architect", "engineer", "builder", "design", "construction"],
  description: "A drawing sheet with a faint grid: the project photo framed with a dimension line, numbered sections, projects as captioned plates and the team as a line diagram.",
  bestFor: "Architects, engineers, builders and interior designers",
  fonts: { heading: "Space Grotesk", body: "Space Grotesk", mono: "JetBrains Mono" },
  fontPairingId: "blueprint",
  themes: [
    { id: "blueprint", name: "Blueprint", tokens: {"background":  "#1D4E89", "onBackground":  "#FFFFFF", "surface":  "#1A4679", "text":  "#FFFFFF", "primary":  "#FFFFFF", "onPrimary":  "#1D4E89", "accent":  "#FFD166"} },
    { id: "graphite", name: "Graphite", tokens: {"background":  "#22313F", "onBackground":  "#FFFFFF", "surface":  "#1E2C38", "text":  "#FFFFFF", "primary":  "#FFFFFF", "onPrimary":  "#22313F", "accent":  "#FF9F80"} },
    { id: "survey", name: "Survey green", tokens: {"background":  "#2E4B3C", "onBackground":  "#FFFFFF", "surface":  "#294336", "text":  "#FFFFFF", "primary":  "#FFFFFF", "onPrimary":  "#2E4B3C", "accent":  "#9EF0D1"} },
  ],
  defaultSectionOrder: ["about", "photos", "quote", "map", "orgChart", "contact", "socials"],
  supports: { coverPhoto: true, orgChartTree: true, booking: true, bookingCta: true, photoTags: true },
  traits: ["Drawing-sheet grid, white frames and a dimension line", "Numbered sections: 01 / Brief, 02 / Projects", "Projects as captioned plates, the team as a line diagram"],
  photoShape: "square",
  accent: { on: "background", use: "mark" },
  buttonShape: "square",
  buttonFill: "solid",
  popularity: 23,
  addedAt: "2026-11-06",
  isNew: true,
};
