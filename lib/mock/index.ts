import type {
  CardBundle,
  CardEntitlements,
  ChangeLog,
  Client,
  ClientNotification,
  Invite,
  LibrarySettings,
  PricingOverrides,
  TemplateRequest,
} from "@/lib/types";
import {
  CLIENT_BUNDLES,
  SEED_CARD_CLIENTS,
  SEED_CHANGE_LOG,
  SEED_CLIENTS,
  SEED_ENTITLEMENTS,
  SEED_INVITES,
  SEED_NOTIFICATIONS,
  SEED_PRICING,
  SEED_TEMPLATE_REQUESTS,
} from "./clients";
import {
  SEED_CARDS,
  SEED_LIBRARY,
  SEED_ORG_CHARTS,
  SEED_ORG_MEMBERS,
  SEED_PHOTOS,
  SEED_SOCIALS,
} from "./seed";

export type MockDB = {
  cards: typeof SEED_CARDS;
  socialLinks: typeof SEED_SOCIALS;
  albumPhotos: typeof SEED_PHOTOS;
  orgCharts: typeof SEED_ORG_CHARTS;
  orgMembers: typeof SEED_ORG_MEMBERS;
  library: LibrarySettings;
  /** Published snapshots by card id; the public page renders these, never the draft. */
  snapshots: Record<string, CardBundle>;
  clients: Client[];
  invites: Invite[];
  templateRequests: TemplateRequest[];
  entitlements: CardEntitlements[];
  changeLog: ChangeLog[];
  notifications: ClientNotification[];
  /** Admin overrides on template prices. The Default (free) template is library.defaultTemplateId. */
  pricing: PricingOverrides;
};

export function createSeedDB(): MockDB {
  // structuredClone keeps the seed constants untouched when the client store mutates.
  const cards = [
    ...SEED_CARDS.map((c) => (SEED_CARD_CLIENTS[c.id] ? { ...c, ...SEED_CARD_CLIENTS[c.id] } : c)),
    ...CLIENT_BUNDLES.map((b) => b.card),
  ];
  return structuredClone({
    cards,
    socialLinks: [...SEED_SOCIALS, ...CLIENT_BUNDLES.flatMap((b) => b.socials)],
    albumPhotos: [...SEED_PHOTOS, ...CLIENT_BUNDLES.flatMap((b) => b.photos)],
    orgCharts: [...SEED_ORG_CHARTS, ...CLIENT_BUNDLES.flatMap((b) => (b.orgChart ? [b.orgChart] : []))],
    orgMembers: [...SEED_ORG_MEMBERS, ...CLIENT_BUNDLES.flatMap((b) => b.orgMembers)],
    library: SEED_LIBRARY,
    snapshots: {},
    clients: SEED_CLIENTS,
    invites: SEED_INVITES,
    templateRequests: SEED_TEMPLATE_REQUESTS,
    entitlements: SEED_ENTITLEMENTS,
    changeLog: SEED_CHANGE_LOG,
    notifications: SEED_NOTIFICATIONS,
    pricing: SEED_PRICING,
  });
}

export function bundleFromDB(db: MockDB, cardId: string): CardBundle | null {
  const card = db.cards.find((c) => c.id === cardId);
  if (!card) return null;
  const orgChart = db.orgCharts.find((o) => o.cardId === card.id);
  return {
    card,
    socials: db.socialLinks.filter((s) => s.cardId === card.id).sort((a, b) => a.position - b.position),
    photos: db.albumPhotos.filter((p) => p.cardId === card.id).sort((a, b) => a.position - b.position),
    orgChart,
    orgMembers: orgChart
      ? db.orgMembers.filter((m) => m.orgChartId === orgChart.id).sort((a, b) => a.position - b.position)
      : [],
  };
}

/** Sample content used by template galleries and the style guide. */
export function sampleBundle(): CardBundle {
  return bundleFromDB(createSeedDB(), "card_carmela")!;
}
