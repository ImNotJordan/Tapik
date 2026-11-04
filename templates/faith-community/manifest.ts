import type { TemplateManifest } from "../types";

/** M - Faith & Community. A parish bulletin: masthead, schedule, ministries. */
export const manifest: TemplateManifest = {
  id: "faith-community",
  name: "Faith & Community",
  category: "Personal brand",
  tags: ["church", "parish", "community", "schedule", "bulletin"],
  description: "Set like a parish bulletin: a masthead with the community's name, the leader's round portrait, a schedule of gatherings from your hours, ministries as a list and the next gathering called out.",
  bestFor: "Pastors, parish staff, barangay and community leaders.",
  fonts: { heading: "Alegreya", body: "Alegreya Sans" },
  fontPairingId: "parish",
  themes: [
    { id: "parchment", name: "Parchment", tokens: { background: "#F5EFE3", onBackground: "#2E2416", surface: "#FFFFFF", text: "#2E2416", primary: "#6B2A1A", onPrimary: "#FFFFFF", accent: "#8C2F1C" } },
    { id: "marian", name: "Marian", tokens: { background: "#EAEFF6", onBackground: "#1D2B4A", surface: "#FFFFFF", text: "#1D2B4A", primary: "#1D2B4A", onPrimary: "#FFFFFF", accent: "#93701F" } },
    { id: "ordinary", name: "Ordinary time", tokens: { background: "#EEF1E7", onBackground: "#22361F", surface: "#FFFFFF", text: "#22361F", primary: "#2F4A2A", onPrimary: "#FFFFFF", accent: "#8A6514" } },
    { id: "vespers", name: "Vespers", tokens: { background: "#1C1A24", onBackground: "#EEE8DA", surface: "#26232F", text: "#EEE8DA", primary: "#D4A64A", onPrimary: "#1C1A24", accent: "#D4A64A" } },
  ],
  defaultSectionOrder: ["quote", "about", "orgChart", "photos", "map", "contact", "socials"],
  supports: { coverPhoto: true, orgChartTree: true, hours: true, serviceChips: true, event: true },
  traits: ["Bulletin masthead with the community's name", "Schedule of gatherings from your hours", "Ministries list and the next gathering"],
  photoShape: "circle",
  accent: { on: "background", use: "mark" },
  buttonShape: "rounded",
  buttonFill: "solid",
  popularity: 29,
  addedAt: "2026-11-01",
  isNew: true,
};
