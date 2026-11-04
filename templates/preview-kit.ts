import { members, photos, socials } from "@/lib/mock/seed";
import type { Card, CardBundle, OrgChart, SocialLink } from "@/lib/types";
import type { TemplateManifest } from "./types";

const T0 = "2026-10-01T09:00:00+08:00";

export type PreviewSpec = Partial<Omit<Card, "id" | "slug">> & {
  name: string;
  /** Folder under public/mock. */
  photoSet?: string;
  album?: [file: string, caption: string, alt: string][];
  links?: [SocialLink["platform"], string, string?][];
  team?: [id: string, parent: string | null, name: string, role: string][];
};

/**
 * Builds the mock card a template's thumbnail renders. Every preview is a
 * full bundle (photos, socials, org chart) so thumbnails show the real layout.
 */
export function makePreview(t: TemplateManifest, spec: PreviewSpec): CardBundle {
  const id = `preview_${t.id}`;
  const { album = [], links = [], team = [], photoSet = "", ...rest } = spec;
  const card: Card = {
    id,
    slug: `${t.id}-sample`,
    status: "published",
    templateId: t.id,
    themeId: t.themes[0].id,
    fontPairingId: t.fontPairingId,
    buttonShape: t.buttonShape,
    buttonFill: t.buttonFill,
    motion: false,
    messageChannel: "viber",
    showDirections: true,
    overlayOpacity: 0.5,
    sectionOrder: t.defaultSectionOrder,
    hiddenSections: [],
    created_at: T0,
    updated_at: T0,
    ...rest,
  };
  const orgChart: OrgChart | undefined = team.length ? { id: `${id}_org`, cardId: id, mode: "tree", created_at: T0 } : undefined;
  return {
    card,
    photos: photos(id, photoSet, album),
    socials: socials(id, links),
    orgChart,
    orgMembers: orgChart ? members(orgChart.id, team) : [],
  };
}

/** Same content, another template: what the library shows when comparing or previewing a card. */
export function withLook(b: CardBundle, look: Partial<Card>): CardBundle {
  return { ...b, card: { ...b.card, ...look } };
}
