import type { TemplateManifest } from "../types";

/** F - Reel. A poster for a creative: huge uppercase name, neon line, film-strip album. */
export const manifest: TemplateManifest = {
  id: "reel",
  name: "Reel",
  category: "Creative",
  tags: ["poster", "uppercase", "neon", "film", "mono"],
  description: "A tall background photo with the name in huge uppercase and its last line in neon, a tilted portrait with a neon border, square buttons, a horizontal film-strip album and socials as big type rows.",
  bestFor: "Filmmakers, photographers, DJs and studios with a loud portfolio.",
  fonts: { heading: "Anton", body: "DM Sans", mono: "DM Mono" },
  fontPairingId: "reel",
  themes: [
    { id: "neon", name: "Neon", tokens: { background: "#121212", onBackground: "#F4F4F0", surface: "#1E1E1E", text: "#F4F4F0", primary: "#D7FF3A", onPrimary: "#121212", accent: "#D7FF3A" } },
    { id: "magenta", name: "Magenta", tokens: { background: "#121212", onBackground: "#F4F4F0", surface: "#1E1E1E", text: "#F4F4F0", primary: "#FF5BD6", onPrimary: "#121212", accent: "#FF5BD6" } },
    { id: "cyan", name: "Cyan", tokens: { background: "#0D1417", onBackground: "#EEF4F4", surface: "#172126", text: "#EEF4F4", primary: "#5CE1E6", onPrimary: "#0D1417", accent: "#5CE1E6" } },
    { id: "daylight", name: "Daylight", tokens: { background: "#F4F4F0", onBackground: "#121212", surface: "#E6E6E0", text: "#121212", primary: "#121212", onPrimary: "#F4F4F0", accent: "#C9361A" } },
  ],
  defaultSectionOrder: ["quote", "about", "photos", "socials", "contact", "map", "orgChart"],
  supports: { coverPhoto: true, orgChartTree: true },
  traits: ["Tall photo with a huge uppercase name, last line in neon", "Tilted portrait with a neon border, square buttons", "Film-strip album, socials as big type rows, mono labels"],
  photoShape: "square",
  accent: { on: "background", use: "mark" },
  buttonShape: "square",
  buttonFill: "solid",
  popularity: 58,
  addedAt: "2026-10-15",
};
