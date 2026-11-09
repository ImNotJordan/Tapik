import type { TemplateManifest } from "../types";

/** P - Prompt. Chat window hero: the ask, your reply and Deployed. */
export const manifest: TemplateManifest = {
  id: "prompt",
  name: "Prompt",
  category: "Creative",
  tags: ["developer", "ai", "vibe-coding", "freelancer", "builder", "no-code"],
  description: "A chat window as the hero: the client's ask, your reply in code and a Deployed line. Then Book a build sprint, tool chips, shipped projects and code-comment headings.",
  bestFor: "Vibe coders, AI builders and freelance developers who ship fast",
  fonts: { heading: "Geist", body: "Geist", mono: "Geist Mono" },
  fontPairingId: "prompt",
  themes: [
    { id: "violet-mint", name: "Violet & mint", tokens: {"background":  "#101014", "onBackground":  "#F4F3FA", "surface":  "#1C1C22", "text":  "#F4F3FA", "primary":  "#5EEAD4", "onPrimary":  "#101014", "accent":  "#7C4DEB"} },
    { id: "rose-lemon", name: "Rose & lemon", tokens: {"background":  "#101014", "onBackground":  "#F4F3FA", "surface":  "#1C1C22", "text":  "#F4F3FA", "primary":  "#FDE047", "onPrimary":  "#101014", "accent":  "#E0457B"} },
    { id: "blue-peach", name: "Blue & peach", tokens: {"background":  "#101014", "onBackground":  "#F4F3FA", "surface":  "#1C1C22", "text":  "#F4F3FA", "primary":  "#FDBA74", "onPrimary":  "#101014", "accent":  "#2F80ED"} },
  ],
  defaultSectionOrder: ["quote", "about", "photos", "orgChart", "map", "socials", "contact"],
  supports: { coverPhoto: true, orgChartTree: true, expertiseChips: true, serviceAreas: true, booking: true, bookingCta: true, promptDemo: true, photoTags: true },
  traits: ["Chat window hero: the ask, your reply and Deployed", "Book a build sprint first, tool chips in mono", "Headings as code comments, shipped projects as screenshot plates"],
  photoShape: "rounded-square",
  accent: { on: "background", use: "mark" },
  buttonShape: "rounded",
  buttonFill: "solid",
  popularity: 26,
  addedAt: "2026-11-06",
  isNew: true,
};
