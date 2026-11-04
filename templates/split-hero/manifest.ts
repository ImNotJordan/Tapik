import type { TemplateManifest } from "../types";

/** J - Split Hero. Half photograph, half color slab; two columns on desktop. */
export const manifest: TemplateManifest = {
  id: "split-hero",
  name: "Split Hero",
  category: "Real estate",
  tags: ["two column", "desktop", "photo", "property", "developer"],
  description: "The first screen is split between a photograph and a solid slab of color carrying the name. On desktop the photo holds the left half while the details scroll on the right.",
  bestFor: "Developers and agents whose clients often open the link on a laptop.",
  fonts: { heading: "Hedvig Letters Serif", body: "Onest" },
  fontPairingId: "split",
  themes: [
    { id: "clay", name: "Clay", tokens: { background: "#EFE8DE", onBackground: "#2B2118", surface: "#7A3B1E", text: "#FBF3EA", primary: "#2B2118", onPrimary: "#FBF3EA", accent: "#E2B58A" } },
    { id: "lagoon", name: "Lagoon", tokens: { background: "#E4EEEA", onBackground: "#10302A", surface: "#10302A", text: "#E4F1EC", primary: "#10302A", onPrimary: "#FFFFFF", accent: "#7FD1B9" } },
    { id: "night", name: "Night", tokens: { background: "#15181B", onBackground: "#ECE8E0", surface: "#ECE8E0", text: "#15181B", primary: "#ECE8E0", onPrimary: "#15181B", accent: "#8F6234" } },
    { id: "sand", name: "Sand", tokens: { background: "#F6F1E7", onBackground: "#2A241A", surface: "#2A241A", text: "#F6F1E7", primary: "#2A241A", onPrimary: "#F6F1E7", accent: "#D9B36C" } },
  ],
  defaultSectionOrder: ["about", "photos", "map", "contact", "quote", "socials", "orgChart"],
  supports: { coverPhoto: true, orgChartTree: true },
  traits: ["Photo and a color slab share the first screen", "Two columns on desktop: the photo stays, details scroll", "Large listing photos, map beside the address"],
  photoShape: "rounded-square",
  accent: { on: "surface", use: "mark" },
  buttonShape: "rounded",
  buttonFill: "solid",
  popularity: 41,
  addedAt: "2026-11-01",
  isNew: true,
};
