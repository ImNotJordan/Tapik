import type { TemplateManifest } from "../types";

/** B - Landmark. The name set huge and condensed becomes the page's architecture. */
export const manifest: TemplateManifest = {
  id: "landmark",
  name: "Landmark",
  category: "Personal brand",
  tags: ["bold", "type-led", "condensed", "colorful", "creator"],
  description: "The name set huge in a wide and a condensed cut is the hero, with the portrait beneath it, full-width Call and Message buttons and a swipeable photo carousel.",
  bestFor: "Coaches, creators and founders who want to be remembered by name.",
  fonts: { heading: "Archivo", body: "Archivo" },
  fontPairingId: "landmark",
  themes: [
    { id: "warm", name: "Mango", tokens: { background: "#F3C33C", onBackground: "#2A1533", surface: "#2A1533", text: "#F3C33C", primary: "#2A1533", onPrimary: "#F3C33C", accent: "#6B2A7B" } },
    { id: "light", name: "Paper", tokens: { background: "#F4F4F1", onBackground: "#111111", surface: "#111111", text: "#F4F4F1", primary: "#111111", onPrimary: "#F4F4F1", accent: "#111111" } },
    { id: "ocean", name: "Mint", tokens: { background: "#9FD3C7", onBackground: "#10302B", surface: "#10302B", text: "#9FD3C7", primary: "#10302B", onPrimary: "#9FD3C7", accent: "#1F5C7A" } },
    { id: "forest", name: "Forest", tokens: { background: "#1F3B2C", onBackground: "#E9F0C9", surface: "#E9F0C9", text: "#1F3B2C", primary: "#E9F0C9", onPrimary: "#1F3B2C", accent: "#C8D96F" } },
    { id: "dark", name: "Dark", tokens: { background: "#141414", onBackground: "#F2F0EA", surface: "#F2F0EA", text: "#141414", primary: "#F2F0EA", onPrimary: "#141414", accent: "#F3C33C" } },
    { id: "noir", name: "Noir", tokens: { background: "#000000", onBackground: "#FFFFFF", surface: "#FFFFFF", text: "#000000", primary: "#FFFFFF", onPrimary: "#000000", accent: "#F2A7B5" } },
  ],
  defaultSectionOrder: ["quote", "about", "photos", "contact", "socials", "map", "orgChart"],
  supports: { coverPhoto: true, orgChartTree: true },
  traits: ["Oversized two-line name; type carries the page", "Full-bleed portrait under the name", "Full-width Call and Message buttons, Save and Email links, photo carousel"],
  photoShape: "full-bleed-portrait",
  accent: { on: "background", use: "mark" },
  buttonShape: "pill",
  buttonFill: "solid",
  popularity: 84,
  addedAt: "2026-09-01",
};
