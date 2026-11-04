import type { TemplateManifest } from "../types";

/** L - Event / Promo. A countdown poster for a dated event or sale. */
export const manifest: TemplateManifest = {
  id: "event-promo",
  name: "Event / Promo",
  category: "Local business",
  tags: ["event", "countdown", "sale", "bazaar", "launch"],
  description: "A promo poster with a live countdown to the event date, the date set big as a tear-off calendar block, the venue and an Add to calendar button, followed by the host's contact card.",
  bestFor: "Bazaars, launches, open houses and seasonal sales.",
  fonts: { heading: "Big Shoulders", body: "Work Sans" },
  fontPairingId: "promo",
  themes: [
    { id: "parol", name: "Parol", tokens: { background: "#A3112B", onBackground: "#FFF4DE", surface: "#FFF4DE", text: "#3A0A12", primary: "#FFC93C", onPrimary: "#3A0A12", accent: "#FFC93C" } },
    { id: "night-market", name: "Night market", tokens: { background: "#16112A", onBackground: "#F6EEDC", surface: "#241C3F", text: "#F6EEDC", primary: "#FF8A3D", onPrimary: "#16112A", accent: "#FF8A3D" } },
    { id: "fiesta", name: "Fiesta", tokens: { background: "#FFE7BF", onBackground: "#3A1406", surface: "#FFFFFF", text: "#3A1406", primary: "#B8322A", onPrimary: "#FFFFFF", accent: "#B8322A" } },
    { id: "sea-breeze", name: "Sea breeze", tokens: { background: "#0F3D3E", onBackground: "#EAF6F2", surface: "#EAF6F2", text: "#0F3D3E", primary: "#F5D04C", onPrimary: "#0F3D3E", accent: "#F5D04C" } },
  ],
  defaultSectionOrder: ["about", "photos", "map", "contact", "socials", "quote", "orgChart"],
  supports: { coverPhoto: true, orgChartTree: true, event: true },
  traits: ["Live countdown to your event date", "Date as a big calendar block, Add to calendar", "Host contact card after the event"],
  photoShape: "rounded-square",
  accent: { on: "background", use: "mark" },
  buttonShape: "pill",
  buttonFill: "solid",
  popularity: 35,
  addedAt: "2026-11-01",
  isNew: true,
};
