export type FontPairing = {
  id: string;
  name: string;
  /** CSS font stacks; the variables come from next/font in app/fonts.ts. */
  display: string;
  body: string;
  /** Labels, numbers and IDs. Falls back to the body face. */
  mono?: string;
  /** Quotes and leads. Falls back to the display face. */
  accent?: string;
  /** Weight used for names and headings. */
  displayWeight: number;
  /** Letter spacing for display text, in em. */
  displayTracking: string;
  /** One line on where the pairing fits, shown in the font picker. */
  note: string;
  /** Short sample used in the picker specimen. */
  sample: string;
};

export const FONT_PAIRINGS: FontPairing[] = [
  {
    id: "printed",
    name: "Printed card",
    display: "var(--font-young-serif), Georgia, serif",
    body: "var(--font-hanken), system-ui, sans-serif",
    displayWeight: 400,
    displayTracking: "-0.01em",
    note: "Sturdy serif names with a clear grotesk for details. The default.",
    sample: "Reyes-Tan",
  },
  {
    id: "landmark",
    name: "Landmark",
    display: "var(--font-archivo), 'Arial Narrow', sans-serif",
    body: "var(--font-archivo), system-ui, sans-serif",
    displayWeight: 850,
    displayTracking: "-0.03em",
    note: "One family stretched wide and narrow. Loud, confident names.",
    sample: "Mercado",
  },
  {
    id: "film",
    name: "Film title",
    display: "var(--font-gloock), Georgia, serif",
    body: "var(--font-albert), system-ui, sans-serif",
    displayWeight: 400,
    displayTracking: "-0.015em",
    note: "High-contrast serif that sits well over photographs.",
    sample: "Kapehan",
  },
  {
    id: "editorial",
    name: "Editorial",
    display: "var(--font-bodoni), 'Didot', serif",
    body: "var(--font-jost), system-ui, sans-serif",
    displayWeight: 500,
    displayTracking: "-0.01em",
    note: "Refined and quiet. Suits executives and consultancies.",
    sample: "Villaruel",
  },
  {
    id: "plain",
    name: "Plain-spoken",
    display: "var(--font-schibsted), system-ui, sans-serif",
    body: "var(--font-schibsted), system-ui, sans-serif",
    displayWeight: 700,
    displayTracking: "-0.02em",
    note: "Friendly, direct sans. Easy to read on any phone.",
    sample: "Soriano",
  },
  {
    id: "gallery",
    name: "Gallery",
    display: "var(--font-instrument-serif), Georgia, serif",
    body: "var(--font-instrument-sans), system-ui, sans-serif",
    displayWeight: 400,
    displayTracking: "-0.01em",
    note: "Light, airy serif with a neat sans. Works in black and white.",
    sample: "Abellana",
  },
  {
    id: "noir",
    name: "Ledger",
    display: "var(--font-instrument-serif), Georgia, serif",
    body: "var(--font-geist), system-ui, sans-serif",
    displayWeight: 400,
    displayTracking: "-0.015em",
    note: "Instrument Serif over Geist. Quiet luxury in black and white.",
    sample: "Lacson",
  },
  {
    id: "counter",
    name: "Shopfront",
    display: "var(--font-bricolage), system-ui, sans-serif",
    body: "var(--font-bricolage), system-ui, sans-serif",
    displayWeight: 800,
    displayTracking: "-0.035em",
    note: "Bricolage Grotesque, heavy and friendly, like a painted sign.",
    sample: "Lutong Bahay",
  },
  {
    id: "reel",
    name: "Poster",
    display: "var(--font-anton), Impact, sans-serif",
    body: "var(--font-dm-sans), system-ui, sans-serif",
    mono: "var(--font-dm-mono), ui-monospace, monospace",
    displayWeight: 400,
    displayTracking: "0",
    note: "Anton in capitals, DM Sans and DM Mono. Loud and filmic.",
    sample: "PASCUAL",
  },
  {
    id: "boardroom",
    name: "Corporate",
    display: "var(--font-plex-sans), system-ui, sans-serif",
    body: "var(--font-plex-sans), system-ui, sans-serif",
    mono: "var(--font-plex-mono), ui-monospace, monospace",
    displayWeight: 600,
    displayTracking: "-0.015em",
    note: "IBM Plex Sans with Plex Mono for IDs. Orderly and neutral.",
    sample: "Dimaculangan",
  },
  {
    id: "clinic",
    name: "Bedside",
    display: "var(--font-lora), Georgia, serif",
    body: "var(--font-figtree), system-ui, sans-serif",
    displayWeight: 500,
    displayTracking: "-0.01em",
    note: "Lora with Figtree. Warm, calm and easy to read.",
    sample: "Dr. Salonga",
  },
  {
    id: "folio",
    name: "Letterhead",
    display: "var(--font-newsreader), Georgia, serif",
    body: "var(--font-public-sans), system-ui, sans-serif",
    displayWeight: 400,
    displayTracking: "-0.015em",
    note: "Newsreader with Public Sans. Formal, like a firm's stationery.",
    sample: "Aquino-Reyes",
  },
  {
    id: "split",
    name: "Developer",
    display: "var(--font-hedvig), Georgia, serif",
    body: "var(--font-onest), system-ui, sans-serif",
    displayWeight: 400,
    displayTracking: "-0.02em",
    note: "Hedvig Letters Serif with Onest. Crisp, modern property type.",
    sample: "Ledesma",
  },
  {
    id: "wall",
    name: "Gallery label",
    display: "var(--font-familjen), system-ui, sans-serif",
    body: "var(--font-familjen), system-ui, sans-serif",
    displayWeight: 600,
    displayTracking: "-0.02em",
    note: "Familjen Grotesk throughout. Steps back so the work shows.",
    sample: "Dagohoy",
  },
  {
    id: "promo",
    name: "Billboard",
    display: "var(--font-big-shoulders), Impact, sans-serif",
    body: "var(--font-work-sans), system-ui, sans-serif",
    displayWeight: 800,
    displayTracking: "-0.01em",
    note: "Big Shoulders with Work Sans. Made for dates and big numbers.",
    sample: "BAZAAR",
  },
  {
    id: "parish",
    name: "Bulletin",
    display: "var(--font-alegreya), Georgia, serif",
    body: "var(--font-alegreya-sans), system-ui, sans-serif",
    displayWeight: 500,
    displayTracking: "-0.005em",
    note: "Alegreya with Alegreya Sans. Warm and literary, like a printed bulletin.",
    sample: "Fr. Belmonte",
  },
  {
    id: "transit",
    name: "Road sign",
    display: "var(--font-barlow-condensed), 'Arial Narrow', sans-serif",
    body: "var(--font-barlow), system-ui, sans-serif",
    mono: "var(--font-jetbrains), ui-monospace, monospace",
    displayWeight: 700,
    displayTracking: "0",
    note: "Barlow Condensed like highway signage, Barlow and JetBrains Mono.",
    sample: "Dispatch",
  },
  {
    id: "bilingual",
    name: "Two languages",
    display: "var(--font-bitter), Georgia, serif",
    body: "var(--font-karla), system-ui, sans-serif",
    displayWeight: 600,
    displayTracking: "-0.01em",
    note: "Bitter with Karla. Sturdy slab serif, clear for long Filipino words.",
    sample: "Dimagiba",
  },
  {
    id: "hyacinth",
    name: "Executive",
    display: "var(--font-montserrat), 'Segoe UI', system-ui, sans-serif",
    body: "var(--font-lexend), system-ui, sans-serif",
    accent: "var(--font-playfair), Georgia, serif",
    displayWeight: 800,
    displayTracking: "-0.03em",
    note: "Montserrat with Lexend, Playfair Display for quotes. Hyacinth Industries’ own type.",
    sample: "Execute",
  },
];

export function getFontPairing(id: string | undefined): FontPairing {
  return FONT_PAIRINGS.find((f) => f.id === id) ?? FONT_PAIRINGS[0];
}
