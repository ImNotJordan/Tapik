import { photos } from "@/lib/mock/seed";
import { makePreview } from "../preview-kit";
import { manifest } from "./manifest";

/** Arch. Bea Villaflor, principal of a small Cebu architecture studio. Invented person and practice. */
const base = makePreview(manifest, {
  name: "Bea Villaflor",
  title: "Principal Architect",
  company: "Villaflor Atelier",
  credential: "Arch. · UAP · PRC Reg. No. 0031482",
  quote: "A good house in Cebu keeps the afternoon heat out and lets the sea breeze through.",
  description:
    "I design houses, small resorts and interiors across Metro Cebu and Bohol: tropical modern, built for our sun and rain, with deep eaves, cross ventilation and local stone and wood.\n\nEvery project starts with a site visit and a short brief. From there we take you through schematic design, permits and construction drawings, and we stay on through site supervision until turnover.",
  bookingUrl: "https://villaflor-atelier.ph/consult",
  bookingNote: "30 min · video call or at the studio",
  phone: "+63 917 555 0142",
  messageChannel: "viber",
  email: "bea@villaflor-atelier.ph",
  address: "2F Casa Lumen, 18 Gorordo Avenue, Lahug, Cebu City",
  mapLat: 10.3312,
  mapLng: 123.8986,
  logoUrl: "/mock/blueprint/logo.svg",
  logoDarkUrl: "/mock/blueprint/logo-dark.svg",
  logoAlt: "Villaflor Atelier",
  backgroundPhotoUrl: "/mock/tagaytay/modern-house-exterior.jpg",
  backgroundPhotoAlt: "Modern two-storey house with a flat roof and wide glass openings",
  backgroundFocalPoint: { x: 0.5, y: 0.55 },
  links: [
    ["website", "https://villaflor-atelier.ph", "villaflor-atelier.ph"],
    ["instagram", "https://instagram.com/villaflor.atelier"],
    ["facebook", "https://facebook.com/villafloratelier"],
    ["linkedin", "https://linkedin.com/in/beavillaflor"],
  ],
  team: [
    ["bv", null, "Bea Villaflor", "Principal Architect"],
    ["py", "bv", "Paolo Ybañez", "Project Architect"],
    ["kl", "py", "Kristine Lim", "Junior Architect"],
    ["ms", "bv", "Marga Sy", "Interior Designer"],
    ["jo", "bv", "Jun Ompad", "Site Engineer"],
  ],
});

/** Album from the openly licensed mock sets (credits in lib/mock/credits.ts), each plate tagged with a project number. */
const id = base.card.id;
const tags = ["P-024", "P-024", "P-019", "P-021", "P-027", "P-022", "P-016"];
const album = [
  ...photos(id, "tagaytay", [["modern-house-exterior.jpg", "Lahug house", "Modern two-storey house with a flat roof and wide glass openings"]]),
  ...photos(id, "realty", [
    ["modern-luxury-living-room-with-kitchen-interior.jpg", "Lahug house, living and kitchen", "Open living room with a kitchen island and pendant lights"],
    ["swimming-pool-tran-le-xuan-villa-01.jpg", "Pool court, Maria Luisa villa", "Villa with a long swimming pool and a shaded terrace"],
  ]),
  ...photos(id, "tagaytay", [["house-with-garden.jpg", "Garden house, Tagaytay", "House with a pitched roof behind a planted garden"]]),
  ...photos(id, "realty", [
    ["modern-kitchen-interior-featuring-wooden-shelving-and.jpg", "Kitchen fit-out, Banilad", "Kitchen with open wooden shelving and a stone counter"],
    ["bedroom-interior-of-apartment-in-brisbane-2025.jpg", "Guest suite, Busay retreat", "Bright bedroom with a timber floor and tall windows"],
  ]),
  ...photos(id, "tagaytay", [["townhouse-row.jpg", "Row houses, Talisay", "Row of two-storey townhouses along a street"]]),
].map((p, i) => ({ ...p, id: `${id}-ph-${i + 1}`, position: i, isCover: i === 0, tag: tags[i] }));

export const preview = { ...base, photos: album };
