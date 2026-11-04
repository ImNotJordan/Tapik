import type { TemplateManifest } from "../types";

/** H - Clinic Calm. Arched portrait, services, booking first, clinic hours. */
export const manifest: TemplateManifest = {
  id: "clinic-calm",
  name: "Clinic Calm",
  category: "Professional",
  tags: ["clinic", "doctor", "dentist", "booking", "hours", "calm"],
  description: "An arched portrait, the name and specialty, service chips and Book an appointment as the main action, with Call and Save beside it. Clinic hours sit in a table; the team is an indented list.",
  bestFor: "Doctors, dentists, therapists and clinics that take appointments.",
  fonts: { heading: "Lora", body: "Figtree" },
  fontPairingId: "clinic",
  themes: [
    { id: "mint", name: "Mint", tokens: { background: "#EEF4F2", onBackground: "#0F4C47", surface: "#FFFFFF", text: "#17302D", primary: "#0F4C47", onPrimary: "#FFFFFF", accent: "#3A9586" } },
    { id: "blush", name: "Blush", tokens: { background: "#F7EEEB", onBackground: "#6B2E3A", surface: "#FFFFFF", text: "#3A1E24", primary: "#6B2E3A", onPrimary: "#FFFFFF", accent: "#B25F70" } },
    { id: "sky", name: "Sky", tokens: { background: "#EDF2F7", onBackground: "#1F3A5F", surface: "#FFFFFF", text: "#1A2B40", primary: "#1F3A5F", onPrimary: "#FFFFFF", accent: "#4F7CAC" } },
    { id: "sage", name: "Sage", tokens: { background: "#F0F2E8", onBackground: "#34441F", surface: "#FFFFFF", text: "#26301A", primary: "#34441F", onPrimary: "#FFFFFF", accent: "#6F8443" } },
  ],
  defaultSectionOrder: ["about", "contact", "map", "orgChart", "photos", "socials", "quote"],
  supports: { coverPhoto: false, orgChartTree: true, hours: true, serviceChips: true, booking: true },
  traits: ["Arched portrait, service chips", "Book an appointment as the main action", "Clinic hours table, team as an indented list"],
  photoShape: "arch",
  accent: { on: "background", use: "mark" },
  buttonShape: "pill",
  buttonFill: "solid",
  popularity: 69,
  addedAt: "2026-10-15",
};
