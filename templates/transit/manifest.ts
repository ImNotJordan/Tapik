import type { TemplateManifest } from "../types";

/** N - Transport & Logistics. Road-sign header, route of service areas, dispatch hours. */
export const manifest: TemplateManifest = {
  id: "transit",
  name: "Transport & Logistics",
  category: "Corporate",
  tags: ["driver", "dispatcher", "trucking", "routes", "service areas"],
  description: "A header set like a highway sign, a Call dispatch button big enough for gloved hands, service areas drawn as stops along a route, dispatch hours and the fleet's photos.",
  bestFor: "Drivers, dispatchers, movers, couriers and trucking companies.",
  fonts: { heading: "Barlow Condensed", body: "Barlow", mono: "JetBrains Mono" },
  fontPairingId: "transit",
  themes: [
    { id: "highway", name: "Highway", tokens: { background: "#F2F3EF", onBackground: "#121A14", surface: "#FFFFFF", text: "#121A14", primary: "#0B5D3B", onPrimary: "#FFFFFF", accent: "#F2B705" } },
    { id: "hazard", name: "Hazard", tokens: { background: "#FFC400", onBackground: "#111111", surface: "#FFFFFF", text: "#111111", primary: "#111111", onPrimary: "#FFC400", accent: "#FFC400" } },
    { id: "night-shift", name: "Night shift", tokens: { background: "#121417", onBackground: "#E9ECEF", surface: "#1C2024", text: "#E9ECEF", primary: "#FFB000", onPrimary: "#121417", accent: "#121417" } },
    { id: "port", name: "Port", tokens: { background: "#EAF0F3", onBackground: "#0E2A3B", surface: "#FFFFFF", text: "#0E2A3B", primary: "#0E2A3B", onPrimary: "#FFFFFF", accent: "#F28C28" } },
  ],
  defaultSectionOrder: ["about", "contact", "map", "orgChart", "photos", "socials", "quote"],
  supports: { coverPhoto: true, orgChartTree: true, hours: true, serviceAreas: true },
  traits: ["Highway-sign header", "Service areas as stops along a route", "Dispatch hours, oversized Call dispatch button"],
  photoShape: "rounded-square",
  accent: { on: "primary", use: "mark" },
  buttonShape: "square",
  buttonFill: "solid",
  popularity: 33,
  addedAt: "2026-11-01",
  isNew: true,
};
