import type { TemplateManifest } from "../types";

/** D - Noir Ledger. Black-and-white portrait, serif name, ruled rows and numbered sections. */
export const manifest: TemplateManifest = {
  id: "noir-ledger",
  name: "Noir Ledger",
  category: "Corporate",
  tags: ["black and white", "editorial", "serif", "ruled", "executive"],
  description: "A tall black-and-white portrait with a large serif name fading into black. Actions are full-width ruled rows, sections are numbered like a ledger, and the team is an indented ruled list.",
  bestFor: "Executives, partners and consultants who want restraint over color.",
  fonts: { heading: "Instrument Serif", body: "Geist" },
  fontPairingId: "noir",
  themes: [
    { id: "noir", name: "Noir", tokens: { background: "#0E0E0E", onBackground: "#F2F0EB", surface: "#181818", text: "#F2F0EB", primary: "#F2F0EB", onPrimary: "#0E0E0E", accent: "#B8C4CF" } },
    { id: "ivory", name: "Ivory", tokens: { background: "#F2F0EB", onBackground: "#141414", surface: "#E8E5DE", text: "#141414", primary: "#141414", onPrimary: "#F2F0EB", accent: "#4A5866" } },
    { id: "oxblood", name: "Oxblood", tokens: { background: "#1A0E0F", onBackground: "#F2E9E4", surface: "#251516", text: "#F2E9E4", primary: "#F2E9E4", onPrimary: "#1A0E0F", accent: "#D9A7A0" } },
    { id: "graphite", name: "Graphite", tokens: { background: "#1D2023", onBackground: "#ECEBE6", surface: "#262A2E", text: "#ECEBE6", primary: "#ECEBE6", onPrimary: "#1D2023", accent: "#A9C4B4" } },
  ],
  defaultSectionOrder: ["quote", "about", "photos", "orgChart", "map", "contact", "socials"],
  supports: { coverPhoto: true, orgChartTree: true },
  traits: ["Black-and-white portrait with a serif name fading into the ground", "Actions as full-width ruled rows", "Numbered sections, team as an indented ruled list, socials as text links"],
  photoShape: "full-bleed-portrait",
  accent: { on: "background", use: "text" },
  buttonShape: "square",
  buttonFill: "outline",
  popularity: 71,
  addedAt: "2026-10-15",
};
