import { photos } from "@/lib/mock/seed";
import { makePreview } from "../preview-kit";
import { manifest } from "./manifest";

/**
 * Joshua Reyes, a fictional full stack developer in Davao City who runs a
 * small studio. Projects are drawn interface stills (public/mock/commit),
 * not screenshots of real products.
 */
const base = makePreview(manifest, {
  name: "Joshua Reyes",
  title: "Full Stack Developer",
  company: "Lakbay Studio",
  quote: "Ship small, ship often, and write down why.",
  description:
    "I build web apps and the APIs behind them for Mindanao businesses: delivery tracking for fruit exporters, a counter app for a café chain, the lobby screen at a Matina clinic. Most projects start as a call and a whiteboard, and ship in two-week slices you can click through.\n\nBefore going independent I spent five years on a logistics platform team in Cebu. Now I run Lakbay Studio with a designer and two engineers, take on two or three projects at a time, and stay on for support after launch.",
  statusChip: { label: "Open to projects", tone: "live" },
  stackRows: [
    { label: "Frontend", value: "Next.js · React · Tailwind" },
    { label: "Backend", value: "Node.js · NestJS · Go" },
    { label: "Data", value: "PostgreSQL · Redis · Supabase" },
    { label: "DevOps", value: "Docker · AWS · GitHub Actions" },
  ],
  services: ["web apps", "APIs", "dashboards"],
  githubUsername: "joshuareyes-dev",
  bookingUrl: "https://joshuareyes.dev/hire",
  bookingNote: "Two-week sprints · Fixed quotes",
  phone: "+63 917 555 0142",
  messageChannel: "viber",
  email: "joshua@lakbaystudio.ph",
  address: "Unit 5B, Ecoland Drive, Matina, Davao City, 8000 Davao del Sur",
  mapLat: 7.0559,
  mapLng: 125.5951,
  logoUrl: "/mock/commit/logo.svg",
  logoAlt: "Lakbay Studio",
  backgroundPhotoUrl: "/mock/commit/cover-editor.svg",
  backgroundPhotoAlt: "Code editor on a dark background beside a grid of green squares",
  backgroundFocalPoint: { x: 0.5, y: 0.5 },
  links: [
    ["custom", "https://github.com/joshuareyes-dev", "GitHub"],
    ["linkedin", "https://www.linkedin.com/in/joshuareyes-dev"],
    ["website", "https://joshuareyes.dev", "Portfolio"],
  ],
  team: [
    ["lead", null, "Joshua Reyes", "Lead developer"],
    ["m1", "lead", "Andrea Lim", "Product designer"],
    ["m2", "lead", "Paolo Dizon", "Backend engineer"],
    ["m3", "lead", "Kim Bautista", "Frontend engineer"],
    ["m4", "m2", "Rafael Uy", "DevOps, part-time"],
  ],
});

const id = base.card.id;
const TAGS = ["Next.js · PostGIS", "React Native · Node", "Vue · Laravel", "Next.js · PostgreSQL", "Go · Redis", "SvelteKit · Python"];
const album = photos(id, "commit", [
  ["project-route.svg", "Durian Route: live delivery tracking for fruit exporters", "Map with a green delivery route and a list of four stops"],
  ["project-pos.svg", "Kape Ledger: counter app for a café chain", "Point-of-sale screen with drink tiles and an order total"],
  ["project-queue.svg", "Lobby queue screen for a Matina clinic", "Dark screen showing queue numbers A-024 and B-011"],
  ["project-permits.svg", "Business permit application, four steps", "Form on step two of four, owner details"],
  ["project-api.svg", "Ride quote API with sub-40 ms responses", "Terminal showing a JSON fare quote and passing tests"],
  ["project-tides.svg", "Tide and ferry times for Samal Island", "Dashboard with a tide chart for the week"],
]).map((p, i) => ({ ...p, tag: TAGS[i] }));

export const preview = { ...base, photos: album };
