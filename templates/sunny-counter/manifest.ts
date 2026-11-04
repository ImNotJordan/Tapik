import type { TemplateManifest } from "../types";

/** E - Sunny Counter. A cheerful shopfront: collage, round owner photo, open-today status. */
export const manifest: TemplateManifest = {
  id: "sunny-counter",
  name: "Sunny Counter",
  category: "Local business",
  tags: ["shop", "food", "playful", "hours", "collage"],
  description: "A photo collage on top with the owner's round photo overlapping its edge, an Open today status, the business name as a heavy headline, inked pill buttons, tilted album tiles and the crew in a row.",
  bestFor: "Carinderias, bakeries, salons and shops people walk into.",
  fonts: { heading: "Bricolage Grotesque", body: "Bricolage Grotesque" },
  fontPairingId: "counter",
  themes: [
    { id: "sunny", name: "Sunny", tokens: { background: "#FFD84D", onBackground: "#1E1A14", surface: "#FFFFFF", text: "#1E1A14", primary: "#1E1A14", onPrimary: "#FFFFFF", accent: "#1A6B35" } },
    { id: "calamansi", name: "Calamansi", tokens: { background: "#CDEB7A", onBackground: "#18230D", surface: "#FFFFFF", text: "#18230D", primary: "#18230D", onPrimary: "#FFFFFF", accent: "#B23A1D" } },
    { id: "ube", name: "Ube", tokens: { background: "#CBB8F0", onBackground: "#221433", surface: "#FFFFFF", text: "#221433", primary: "#221433", onPrimary: "#FFFFFF", accent: "#14552B" } },
    { id: "tomato", name: "Tomato", tokens: { background: "#FF8466", onBackground: "#1E1A14", surface: "#FFF6EE", text: "#1E1A14", primary: "#1E1A14", onPrimary: "#FFF6EE", accent: "#0E4D2B" } },
  ],
  defaultSectionOrder: ["about", "photos", "map", "orgChart", "socials", "contact", "quote"],
  supports: { coverPhoto: true, orgChartTree: true, hours: true, serviceChips: true },
  traits: ["Photo collage with a round owner photo over its edge", "Open today status from your hours, heavy headline name", "Inked pill buttons, tilted album tiles, crew as round avatars"],
  photoShape: "circle",
  accent: { on: "background", use: "mark" },
  buttonShape: "pill",
  buttonFill: "solid",
  popularity: 66,
  addedAt: "2026-10-15",
};
