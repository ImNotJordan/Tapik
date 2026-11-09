import type { TemplateManifest } from "../types";

/** K - Dispatch. Hazard-stripe band and a square company badge. */
export const manifest: TemplateManifest = {
  id: "dispatch",
  name: "Dispatch",
  category: "Corporate",
  tags: ["logistics", "trucking", "transport", "dispatch", "freight"],
  description: "Hazard-stripe top, a signal-orange Request a Pickup button first, an On duty now status, service-area chips and a dashed route map from yard to port.",
  bestFor: "Trucking, haulers, couriers and dispatch desks",
  fonts: { heading: "Barlow Condensed", body: "Barlow" },
  fontPairingId: "transit",
  themes: [
    { id: "signal-orange", name: "Signal orange", tokens: {"background":  "#1C1F22", "onBackground":  "#F2F2EE", "surface":  "#2A2E32", "text":  "#F2F2EE", "primary":  "#FF6A13", "onPrimary":  "#1C1F22", "accent":  "#FF6A13"} },
    { id: "signal-amber", name: "Signal amber", tokens: {"background":  "#1C1F22", "onBackground":  "#F2F2EE", "surface":  "#2A2E32", "text":  "#F2F2EE", "primary":  "#FFC21A", "onPrimary":  "#1C1F22", "accent":  "#FFC21A"} },
    { id: "signal-blue", name: "Signal blue", tokens: {"background":  "#1C1F22", "onBackground":  "#F2F2EE", "surface":  "#2A2E32", "text":  "#F2F2EE", "primary":  "#4FB3FF", "onPrimary":  "#1C1F22", "accent":  "#4FB3FF"} },
  ],
  defaultSectionOrder: ["quote", "about", "map", "photos", "orgChart", "contact", "socials"],
  supports: { coverPhoto: true, orgChartTree: true, serviceAreas: true, booking: true, bookingCta: true, statusChip: true },
  traits: ["Hazard-stripe band and a square company badge", "Request a pickup first, then Call, message and Save tiles", "Service areas as chips and a dashed yard-to-port route map"],
  photoShape: "square",
  accent: { on: "background", use: "text" },
  buttonShape: "square",
  buttonFill: "solid",
  popularity: 27,
  addedAt: "2026-11-06",
  isNew: true,
};
