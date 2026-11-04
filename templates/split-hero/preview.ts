import { makePreview } from "../preview-kit";
import { manifest } from "./manifest";

/** Lorenzo Ledesma: sales director of a Tagaytay developer whose buyers browse on laptops. */
export const preview = makePreview(manifest, {
  name: "Lorenzo Ledesma",
  title: "Sales Director",
  company: "Ledesma Land",
  credential: "PRC REB No. 0009318",
  quote: "Buy the view first. We’ll build the house around it.",
  description:
    "Ledesma Land builds ridge-top homes and townhouses in Tagaytay and Alfonso, Cavite, most of them with a clear line to Taal Lake. I run the sales team and walk every buyer through the lot, the plans and the payment terms myself.\n\nThe showroom on the Tagaytay–Nasugbu Highway is open daily from 9 AM to 6 PM. Weekend viewings fill up, so message ahead and I’ll hold a slot.",
  phone: "+63 918 555 0174",
  messageChannel: "viber",
  email: "lorenzo.ledesma@ledesmaland.ph",
  address: "Ledesma Land Showroom, Km 58 Tagaytay–Nasugbu Highway, Tagaytay City, Cavite",
  mapLat: 14.1053,
  mapLng: 120.9312,
  backgroundPhotoUrl: "/mock/tagaytay/taal-lake-view-tagaytay.jpg",
  backgroundPhotoAlt: "Taal Lake and Volcano seen from the Tagaytay ridge",
  backgroundFocalPoint: { x: 0.5, y: 0.55 },
  overlayOpacity: 0.2,
  photoSet: "tagaytay",
  album: [
    ["modern-house-exterior.jpg", "Model A, three bedrooms, 210 sqm lot", "Contemporary two-storey house with a flat roof"],
    ["house-with-garden.jpg", "Model C with the landscaped front garden", "House with a red roof and a landscaped garden"],
    ["subdivision-house.jpg", "Corner unit, Phase 2", "Orange house on a corner lot in a subdivision"],
    ["townhouse-row.jpg", "Townhouse row, Alfonso", "Row of two-storey townhouses"],
    ["taal-lake-view-tagaytay.jpg", "The view from the Phase 3 lots", "Taal Lake and Volcano from the ridge"],
  ],
  links: [
    ["facebook", "https://facebook.com/ledesmaland"],
    ["instagram", "https://instagram.com/ledesmaland.tagaytay"],
    ["website", "https://ledesmaland.ph/models", "House models and prices"],
  ],
  team: [
    ["ramon", null, "Ramon Ledesma", "President"],
    ["lorenzo", "ramon", "Lorenzo Ledesma", "Sales Director"],
    ["camille", "lorenzo", "Camille Ocampo", "Sales Manager"],
    ["jayson", "camille", "Jayson Ibarra", "Property Specialist"],
    ["aira", "lorenzo", "Aira Panganiban", "Documentation Officer"],
  ],
});
