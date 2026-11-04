import type { CardBundle, ReorderableSection } from "@/lib/types";

export const DEFAULT_SECTION_ORDER: ReorderableSection[] = ["quote", "about", "contact", "socials", "photos", "map", "orgChart"];

export const SECTION_LABELS: Record<ReorderableSection, string> = {
  quote: "Quote",
  about: "About",
  contact: "Contact details",
  socials: "Social links",
  photos: "Photos",
  map: "Map",
  orgChart: "Organization chart",
};

/** Whether a section has anything to show. Empty sections hide on the public card. */
export function hasContent(key: ReorderableSection, b: CardBundle): boolean {
  const c = b.card;
  switch (key) {
    case "quote":
      return !!c.quote?.trim();
    case "about":
      return !!c.description?.trim();
    case "contact":
      return !!(c.phone || c.email);
    case "socials":
      return b.socials.some((s) => s.visible);
    case "photos":
      return b.photos.length > 0;
    case "map":
      return !!c.address?.trim();
    case "orgChart":
      if (!b.orgChart) return false;
      return b.orgChart.mode === "upload" ? !!b.orgChart.fileUrl : b.orgMembers.length > 0;
  }
}

export function visibleSections(b: CardBundle): ReorderableSection[] {
  return b.card.sectionOrder.filter((k) => !b.card.hiddenSections.includes(k) && hasContent(k, b));
}
