import type { TemplateManifest } from "../types";

/** C - Place First. A full-bleed photograph of the place leads. */
export const manifest: TemplateManifest = {
  id: "place-first",
  name: "Place First",
  category: "Real estate",
  tags: ["photo", "full-bleed", "listing", "location", "serif"],
  description: "A full-bleed photograph of the place leads, with the logo on the photo and the person, Call, Viber and Save in a panel over it. Contact rows have Copy buttons.",
  bestFor: "Agents selling a place, and businesses people visit in person.",
  fonts: { heading: "Gloock", body: "Albert Sans" },
  fontPairingId: "film",
  themes: [
    { id: "dark", name: "Dusk", tokens: { background: "#2A1E17", onBackground: "#F5EFE6", surface: "#382A21", text: "#F5EFE6", primary: "#9CD3C2", onPrimary: "#1E1510", accent: "#9CD3C2" } },
    { id: "warm", name: "Warm", tokens: { background: "#55291B", onBackground: "#FBEFE3", surface: "#683726", text: "#FBEFE3", primary: "#F2B66D", onPrimary: "#2B160D", accent: "#F2B66D" } },
    { id: "light", name: "Light", tokens: { background: "#F7F6F3", onBackground: "#1F1A17", surface: "#ECE8E1", text: "#1F1A17", primary: "#1F1A17", onPrimary: "#F7F6F3", accent: "#2F7A68" } },
    { id: "ocean", name: "Ocean", tokens: { background: "#0F2A33", onBackground: "#E9F3F4", surface: "#183B46", text: "#E9F3F4", primary: "#F2C57C", onPrimary: "#1A1408", accent: "#7FD1D9" } },
    { id: "forest", name: "Forest", tokens: { background: "#18261C", onBackground: "#EEF1E6", surface: "#223326", text: "#EEF1E6", primary: "#D7E39A", onPrimary: "#18261C", accent: "#D7E39A" } },
    { id: "noir", name: "Noir", tokens: { background: "#000000", onBackground: "#F5F5F5", surface: "#1A1A1A", text: "#F5F5F5", primary: "#F5F5F5", onPrimary: "#000000", accent: "#F5F5F5" } },
  ],
  defaultSectionOrder: ["about", "contact", "photos", "map", "quote", "socials", "orgChart"],
  supports: { coverPhoto: true, orgChartTree: true },
  traits: ["Background photo fills the first screen", "Person and actions in a panel over the photo", "Contact rows with Copy buttons, masonry album, large map"],
  photoShape: "arch",
  accent: { on: "background", use: "mark" },
  buttonShape: "rounded",
  buttonFill: "solid",
  popularity: 77,
  addedAt: "2026-09-01",
};
