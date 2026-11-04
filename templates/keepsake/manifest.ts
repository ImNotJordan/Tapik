import type { TemplateManifest } from "../types";

/** A - Keepsake (default). Opens as the physical calling card that was just tapped. */
export const manifest: TemplateManifest = {
  id: "keepsake",
  name: "Keepsake",
  category: "Real estate",
  tags: ["calling card", "classic", "serif", "nfc", "broker"],
  description: "Opens as the physical calling card that was just tapped: photo, name, licence number and the NFC mark, tilted on a deep ground. The details sit on a light sheet below, like the back of the card.",
  bestFor: "Brokers, agents and any professional whose card is the first thing clients keep.",
  fonts: { heading: "Young Serif", body: "Hanken Grotesk" },
  fontPairingId: "printed",
  themes: [
    { id: "forest", name: "Forest", tokens: { background: "#183A2E", onBackground: "#F1F2EE", surface: "#F1F2EE", text: "#1B2420", primary: "#F1F2EE", onPrimary: "#183A2E", accent: "#A9842F" } },
    { id: "ocean", name: "Ocean", tokens: { background: "#1D2B45", onBackground: "#EEF1F5", surface: "#F2F4F7", text: "#18202D", primary: "#EEF1F5", onPrimary: "#1D2B45", accent: "#5F7593" } },
    { id: "warm", name: "Warm", tokens: { background: "#4A2C20", onBackground: "#F6EFE6", surface: "#F6EFE6", text: "#2A1C16", primary: "#F6EFE6", onPrimary: "#4A2C20", accent: "#B5654A" } },
    { id: "noir", name: "Noir", tokens: { background: "#161616", onBackground: "#F2F2F0", surface: "#FAFAF8", text: "#141414", primary: "#FAFAF8", onPrimary: "#161616", accent: "#9C8455" } },
    { id: "light", name: "Light", tokens: { background: "#E3E6E0", onBackground: "#1B2420", surface: "#FFFFFF", text: "#1B2420", primary: "#183A2E", onPrimary: "#FFFFFF", accent: "#9A7728" } },
    { id: "dark", name: "Dark", tokens: { background: "#101412", onBackground: "#E8EBE7", surface: "#1C221F", text: "#E8EBE7", primary: "#E8EBE7", onPrimary: "#101412", accent: "#C9A65A" } },
  ],
  defaultSectionOrder: ["quote", "about", "contact", "socials", "photos", "map", "orgChart"],
  supports: { coverPhoto: true, orgChartTree: true },
  traits: ["Name, photo and licence printed on a tilted card", "Sections on a light sheet below, like the back of the card", "Rounded-square photo, photo grid album"],
  photoShape: "rounded-square",
  accent: { on: "surface", use: "mark" },
  buttonShape: "rounded",
  buttonFill: "solid",
  popularity: 98,
  addedAt: "2026-09-01",
};
