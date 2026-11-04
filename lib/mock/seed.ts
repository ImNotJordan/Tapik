import type {
  AlbumPhoto,
  Card,
  LibrarySettings,
  OrgChart,
  OrgMember,
  ReorderableSection,
  SocialLink,
} from "@/lib/types";

/**
 * Sample data for the UI build. Invented people and businesses in a
 * Philippine context; photos are openly licensed (see lib/mock/credits.ts).
 * TODO(backend): replace with Supabase tables of the same shape.
 */

const T0 = "2026-09-02T09:15:00+08:00";

export function photos(cardId: string, base: string, items: [file: string, caption: string, alt: string][]): AlbumPhoto[] {
  return items.map(([file, caption, alt], i) => ({
    id: `${cardId}-ph-${i + 1}`,
    cardId,
    url: `/mock/${base}/${file}`,
    caption,
    alt,
    position: i,
    isCover: i === 0,
    created_at: T0,
  }));
}

export function socials(cardId: string, items: [SocialLink["platform"], string, string?][]): SocialLink[] {
  return items.map(([platform, url, label], i) => ({
    id: `${cardId}-so-${i + 1}`,
    cardId,
    platform,
    url,
    label,
    position: i,
    visible: true,
    created_at: T0,
  }));
}

export function members(orgChartId: string, items: [id: string, parent: string | null, name: string, role: string][]): OrgMember[] {
  return items.map(([id, parentId, name, role], i) => ({
    id: `${orgChartId}-${id}`,
    orgChartId,
    parentId: parentId ? `${orgChartId}-${parentId}` : null,
    name,
    role,
    position: i,
    created_at: T0,
  }));
}

const ALL: ReorderableSection[] = ["quote", "about", "contact", "socials", "photos", "map", "orgChart"];

/* ---------------------------------------------------------------- Cards */

export const SEED_CARDS: Card[] = [
  {
    id: "card_carmela",
    slug: "carmela-reyes-tan",
    status: "published",
    templateId: "keepsake",
    themeId: "forest",
    fontPairingId: "printed",
    buttonShape: "rounded",
    buttonFill: "solid",
    motion: true,
    name: "Carmela Reyes-Tan",
    title: "Licensed Real Estate Broker",
    company: "Tan & Ocampo Realty",
    credential: "PRC REB No. 0004127",
    quote: "I sell homes the way I’d want my own sold: honestly, and never in a hurry.",
    description:
      "Twelve years matching families and investors with homes across Cebu, from Talamban townhouses to Mactan beachfront lots. I handle the bank, the BIR and the paperwork so you can focus on choosing.\n\nI work with first-time buyers, OFW families buying from abroad, and owners who want their property sold without a dozen strangers walking through it. Every viewing is scheduled, every offer is in writing, and you will always know where your papers are.",
    phone: "+63 917 555 0142",
    messageChannel: "viber",
    email: "carmela@tanocampo.ph",
    address: "Unit 1204, Lahug Corporate Center, Cebu IT Park, Lahug, Cebu City",
    mapLat: 10.3302,
    mapLng: 123.9068,
    showDirections: true,
    agentPhotoAlt: "Carmela Reyes-Tan",
    backgroundPhotoUrl: "/mock/realty/cebu-it-park-top-view-padrigas-lahug.jpg",
    backgroundPhotoAlt: "Cebu IT Park towers seen from above at dusk",
    backgroundFocalPoint: { x: 0.55, y: 0.45 },
    overlayOpacity: 0.62,
    logoUrl: "/mock/realty/logo.svg",
    logoDarkUrl: "/mock/realty/logo-dark.svg",
    logoAlt: "Tan & Ocampo Realty",
    sectionOrder: ALL,
    hiddenSections: [],
    created_at: T0,
    updated_at: "2026-10-28T16:40:00+08:00",
    published_at: "2026-10-28T16:40:00+08:00",
  },
  {
    id: "card_joel",
    slug: "joel-mercado",
    status: "published",
    templateId: "landmark",
    themeId: "dark",
    fontPairingId: "landmark",
    buttonShape: "pill",
    buttonFill: "solid",
    motion: true,
    name: "Joel Mercado",
    title: "Operations Manager",
    company: "Pasig Freight Lines",
    quote: "If it left our warehouse, I know where it is.",
    description:
      "I run dispatch, warehousing and customs coordination for Pasig Freight Lines: 40 trucks moving containers between the Manila port terminals and warehouses across Metro Manila, Laguna and Cavite.\n\nCall me for rate quotes, delivery schedules or anything stuck at the port. For urgent shipments after 6 PM, message on WhatsApp and dispatch will pick it up.",
    phone: "+63 918 555 0187",
    messageChannel: "whatsapp",
    email: "joel.mercado@pasigfreight.ph",
    address: "Warehouse 4, 120 Pasig Blvd Extension, Bagong Ilog, Pasig City",
    mapLat: 14.5653,
    mapLng: 121.0687,
    showDirections: true,
    agentPhotoAlt: "Joel Mercado",
    backgroundPhotoUrl: "/mock/freight/manila-international-container-terminal-cranes-sunrise-tondo.jpg",
    backgroundPhotoAlt: "Container cranes at the Manila International Container Terminal at sunrise",
    backgroundFocalPoint: { x: 0.6, y: 0.5 },
    overlayOpacity: 0.35,
    logoUrl: "/mock/freight/logo.svg",
    logoDarkUrl: "/mock/freight/logo-dark.svg",
    logoAlt: "Pasig Freight Lines",
    sectionOrder: ["about", "contact", "orgChart", "photos", "map", "socials", "quote"],
    hiddenSections: [],
    created_at: "2026-09-10T08:00:00+08:00",
    updated_at: "2026-10-30T11:05:00+08:00",
    published_at: "2026-10-21T10:00:00+08:00",
  },
  {
    id: "card_lia",
    slug: "kapehan-sa-calle-real",
    status: "published",
    templateId: "place-first",
    themeId: "warm",
    fontPairingId: "film",
    buttonShape: "pill",
    buttonFill: "solid",
    motion: true,
    name: "Lia Soriano",
    title: "Owner",
    company: "Kapehan sa Calle Real",
    quote: "Pandesal from the oven at six, barako in the cup by seven.",
    description:
      "A small café on J.M. Basa Street in Iloilo City Proper. We roast Batangas barako and Benguet arabica in small batches, bake pandesal and ensaymada every morning, and keep the long table free for anyone who needs to work.\n\nOpen Tuesday to Sunday, 6 AM to 8 PM. We take orders for office meetings of up to 40 people; message us a day ahead.",
    phone: "+63 927 555 0163",
    messageChannel: "messenger",
    messageTarget: "kapehansacallereal",
    email: "hello@kapehan.ph",
    address: "38 J.M. Basa Street (Calle Real), Iloilo City Proper, Iloilo",
    mapLat: 10.6947,
    mapLng: 122.5696,
    showDirections: true,
    agentPhotoAlt: "Lia Soriano",
    backgroundPhotoUrl: "/mock/cafe/interior-of-1up-cafe-2024-02-18.jpg",
    backgroundPhotoAlt: "Café interior with brick wall, armchairs and a window onto the street",
    backgroundFocalPoint: { x: 0.45, y: 0.55 },
    overlayOpacity: 0.7,
    logoUrl: "/mock/cafe/logo.svg",
    logoDarkUrl: "/mock/cafe/logo-dark.svg",
    logoAlt: "Kapehan sa Calle Real",
    sectionOrder: ["photos", "map", "about", "quote", "contact", "socials", "orgChart"],
    hiddenSections: [],
    created_at: "2026-09-18T07:30:00+08:00",
    updated_at: "2026-10-25T19:20:00+08:00",
    published_at: "2026-10-25T19:20:00+08:00",
  },
  {
    id: "card_maria",
    slug: "maria-concepcion-villanueva-santiago",
    status: "draft",
    templateId: "landmark",
    themeId: "light",
    fontPairingId: "gallery",
    buttonShape: "square",
    buttonFill: "outline",
    motion: true,
    name: "Maria Concepcion Villanueva-Santiago",
    title: "Independent Insurance Advisor",
    phone: "+63 945 555 0128",
    messageChannel: "sms",
    email: "mcvsantiago.advisor@gmail.com",
    showDirections: false,
    sectionOrder: ["about", "contact", "socials", "quote", "photos", "map", "orgChart"],
    hiddenSections: [],
    created_at: "2026-10-31T14:02:00+08:00",
    updated_at: "2026-10-31T14:10:00+08:00",
  },
];

/* --------------------------------------------------------------- Photos */

export const SEED_PHOTOS: AlbumPhoto[] = [
  ...photos("card_carmela", "realty", [
    ["swimming-pool-tran-le-xuan-villa-01.jpg", "Garden pool, Maria Luisa Estate, Banilad", "Swimming pool in a landscaped garden"],
    ["modern-luxury-living-room-with-kitchen-interior.jpg", "Kitchen and living area, 2BR condo in Cebu Business Park", "Modern kitchen with wood paneling"],
    ["bb-blue-waters-mactan-beach-2.jpg", "Beachfront lot for sale, Mactan", "Palm-lined beach on Mactan Island"],
    ["living-room-in-apartment-of-condominio-do.jpg", "Corner unit living room with city view", "Living room with white sofas"],
    ["bedroom-interior-of-apartment-in-brisbane-2025.jpg", "Master bedroom, Talamban townhouse", "Bedroom with a double bed and lamps"],
    ["modern-kitchen-interior-featuring-wooden-shelving-and.jpg", "Pantry shelving, renovated Lahug house", "Kitchen shelves with dishes"],
    ["bb-blue-waters-mactan-beach-4.jpg", "View from the Mactan lot at high tide", "Sea and beach seen from the water"],
    ["cebu-business-park-condominium-09-09-2022.jpg", "Condominium towers in Cebu Business Park", "Condominium tower behind palm trees"],
    ["cebu-business-park-skyscrapers-queen-city-memorial.jpg", "Cebu Business Park skyline", "City skyline under clouds"],
  ]),
  ...photos("card_joel", "freight", [
    ["manila-international-container-terminal-cranes-manila-01.jpg", "Our usual berth at MICT", "Orange container cranes over the harbor"],
    ["modern-warehouse-with-pallet-rack-storage-system.jpg", "Pallet racking in Warehouse 4", "Warehouse with tall pallet racks"],
    ["aerial-view-of-manila-port-s-international.jpg", "Manila port from above", "Aerial view of the container terminal"],
    ["trucks-in-the-philippines-6.jpg", "Flatbed recovery on C-5", "Flatbed truck on a city street"],
    ["north-harbor-manila-international-container-terminal-tondo.jpg", "North Harbor and the terminal", "Port and river seen from a hill"],
  ]),
  ...photos("card_lia", "cafe", [
    ["pinoy-pandesal.jpg", "Morning pandesal with barako", "Pandesal rolls beside a cup of coffee"],
    ["barista-prepares-espresso-at-coffee-shop.jpg", "Pulling the first shot of the day", "Barista tamping espresso"],
    ["roasted-coffee-beans-on-the-surface-01.jpg", "This week’s Benguet arabica", "Dark roasted coffee beans"],
    ["pandesal-bread-rolls.jpg", "Fresh tray at 6 AM", "Tray of baked bread rolls"],
    ["a-small-cup-of-coffee.jpg", "Black barako, no sugar", "Cup of black coffee on a saucer"],
    ["dsc-6320-a-barista-reaching-to-adjust.jpg", "Behind the bar", "Barista adjusting the espresso machine"],
    ["iloilo-calle-real-jm-basa-northbound-iloilo.jpg", "Calle Real on a Sunday", "Street with heritage buildings and people walking"],
    ["iloilo-river-esplanade-sunrise.jpg", "Sunrise at the Esplanade, ten minutes away", "River esplanade at sunrise"],
    ["molo-church-molo-iloilo-city-04-03.jpg", "Molo Church, a short jeepney ride away", "Twin-spired stone church"],
  ]),
];

/* -------------------------------------------------------------- Socials */

export const SEED_SOCIALS: SocialLink[] = [
  ...socials("card_carmela", [
    ["facebook", "https://facebook.com/carmelasellscebu"],
    ["instagram", "https://instagram.com/carmela.sells.cebu"],
    ["linkedin", "https://linkedin.com/in/carmelareyestan"],
    ["website", "https://tanocampo.ph/listings", "Current listings"],
  ]),
  ...socials("card_joel", [
    ["linkedin", "https://linkedin.com/in/joelmercado-pfl"],
    ["website", "https://pasigfreight.ph", "Rates and coverage"],
    ["facebook", "https://facebook.com/pasigfreightlines"],
    ["telegram", "https://t.me/pfl_dispatch", "Dispatch channel"],
  ]),
  ...socials("card_lia", [
    ["instagram", "https://instagram.com/kapehansacallereal"],
    ["facebook", "https://facebook.com/kapehansacallereal"],
    ["tiktok", "https://tiktok.com/@kapehan.iloilo"],
    ["custom", "https://kapehan.ph/menu", "Menu and prices"],
  ]),
  ...socials("card_maria", [["linkedin", "https://linkedin.com/in/mcvsantiago"]]),
];

/* ------------------------------------------------------------ Org charts */

export const SEED_ORG_CHARTS: OrgChart[] = [
  { id: "org_carmela", cardId: "card_carmela", mode: "tree", created_at: T0 },
  { id: "org_joel", cardId: "card_joel", mode: "tree", created_at: T0 },
  {
    id: "org_lia",
    cardId: "card_lia",
    mode: "upload",
    fileUrl: "/mock/cafe/org-chart.svg",
    fileType: "image",
    fileName: "kapehan-team.svg",
    fileAlt: "Team chart: Lia Soriano, owner, with the head barista, pastry chef, shift lead, bookkeeper and cashier",
    created_at: T0,
  },
];

export const SEED_ORG_MEMBERS: OrgMember[] = [
  ...members("org_carmela", [
    ["ramon", null, "Ramon Ocampo", "Managing Broker"],
    ["carmela", "ramon", "Carmela Reyes-Tan", "Broker"],
    ["kristine", "carmela", "Kristine Go", "Sales Agent"],
    ["jun", "ramon", "Jun Abellana", "Sales Agent"],
    ["pia", "ramon", "Pia Sarmiento", "Documentation Officer"],
  ]),
  ...members("org_joel", [
    ["edgardo", null, "Edgardo Lim", "General Manager"],
    ["joel", "edgardo", "Joel Mercado", "Operations Manager"],
    ["rhea", "joel", "Rhea Bautista", "Dispatch Supervisor"],
    ["mark", "rhea", "Mark Villareal", "Dispatcher"],
    ["aileen", "rhea", "Aileen Cruz", "Dispatcher"],
    ["nestor", "joel", "Nestor Pangilinan", "Warehouse Supervisor"],
    ["ronald", "nestor", "Ronald dela Cruz", "Forklift Lead"],
    ["grace", "joel", "Grace Tolentino", "Customs Liaison"],
    ["liza", "edgardo", "Liza Ramos", "Finance Manager"],
  ]),
];

export const SEED_LIBRARY: LibrarySettings = {
  defaultTemplateId: "keepsake",
  disabledTemplates: [],
  disabledThemes: [],
  favoriteTemplates: ["keepsake", "folio"],
  savedTemplates: [],
};
