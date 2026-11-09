import type { TemplateManifest } from "../types";

/** Q - Commit. Repo path header and an Open to projects status. */
export const manifest: TemplateManifest = {
  id: "commit",
  name: "Commit",
  category: "Professional",
  tags: ["developer", "engineer", "portfolio", "full stack", "software", "github"],
  description: "A README with a person behind it: a repo path, an Open to projects status, an intro as a code block, a commit activity graph, a stack table and the team as a file tree.",
  bestFor: "Full stack developers, software engineers and technical freelancers",
  fonts: { heading: "DM Sans", body: "DM Sans", mono: "Fira Code" },
  fontPairingId: "commit",
  themes: [
    { id: "green", name: "Main branch", tokens: {"background":  "#FFFFFF", "onBackground":  "#0F172A", "surface":  "#F8FAFC", "text":  "#0F172A", "primary":  "#0F172A", "onPrimary":  "#FFFFFF", "accent":  "#16A34A"} },
    { id: "blue", name: "Blue", tokens: {"background":  "#FFFFFF", "onBackground":  "#0F172A", "surface":  "#F8FAFC", "text":  "#0F172A", "primary":  "#0F172A", "onPrimary":  "#FFFFFF", "accent":  "#2563EB"} },
    { id: "purple", name: "Purple", tokens: {"background":  "#FFFFFF", "onBackground":  "#0F172A", "surface":  "#F8FAFC", "text":  "#0F172A", "primary":  "#0F172A", "onPrimary":  "#FFFFFF", "accent":  "#9333EA"} },
  ],
  defaultSectionOrder: ["quote", "about", "photos", "orgChart", "map", "contact", "socials"],
  supports: { coverPhoto: true, orgChartTree: true, serviceChips: true, booking: true, bookingCta: true, statusChip: true, stackRows: true, githubActivity: true, photoTags: true },
  traits: ["Repo path header and an Open to projects status", "Intro as a code block, a commit graph and a stack table", "Projects with tech labels, the team as a file tree"],
  photoShape: "circle",
  accent: { on: "background", use: "mark" },
  buttonShape: "rounded",
  buttonFill: "solid",
  popularity: 21,
  addedAt: "2026-11-06",
  isNew: true,
};
