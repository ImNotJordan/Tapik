import type { TemplateManifest } from "../types";

/** K - Gallery Wall. Album first: the work is the hero. */
export const manifest: TemplateManifest = {
  id: "gallery-wall",
  name: "Gallery Wall",
  category: "Creative",
  tags: ["portfolio", "album first", "photographer", "store", "grid"],
  description: "The photo album is the hero: the work hangs edge to edge as a wall of pictures, with the name set small like a gallery label and contact details after the work.",
  bestFor: "Photographers, artists and shops whose products sell themselves.",
  fonts: { heading: "Familjen Grotesk", body: "Familjen Grotesk" },
  fontPairingId: "wall",
  themes: [
    { id: "white", name: "White wall", tokens: { background: "#FAFAF7", onBackground: "#141414", surface: "#EFEFEA", text: "#141414", primary: "#141414", onPrimary: "#FAFAF7", accent: "#B83A0B" } },
    { id: "darkroom", name: "Darkroom", tokens: { background: "#0B0B0B", onBackground: "#EAEAEA", surface: "#161616", text: "#EAEAEA", primary: "#EAEAEA", onPrimary: "#0B0B0B", accent: "#FF5A4E" } },
    { id: "concrete", name: "Concrete", tokens: { background: "#D8D8D3", onBackground: "#161616", surface: "#E8E8E4", text: "#161616", primary: "#161616", onPrimary: "#E8E8E4", accent: "#2F4F7A" } },
    { id: "linen", name: "Linen", tokens: { background: "#F1EADF", onBackground: "#2A2219", surface: "#E6DCCB", text: "#2A2219", primary: "#2A2219", onPrimary: "#F1EADF", accent: "#8A4B2A" } },
  ],
  defaultSectionOrder: ["photos", "about", "quote", "contact", "socials", "map", "orgChart"],
  supports: { coverPhoto: false, orgChartTree: true },
  traits: ["Photo wall first, edge to edge", "Name set small like a gallery label", "Contact details after the work"],
  photoShape: "square",
  accent: { on: "background", use: "mark" },
  buttonShape: "square",
  buttonFill: "solid",
  popularity: 38,
  addedAt: "2026-11-01",
  isNew: true,
};
