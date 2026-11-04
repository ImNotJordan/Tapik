import { makePreview } from "../preview-kit";
import { manifest } from "./manifest";

/** Mika Dagohoy: a Dumaguete landscape photographer whose work does the talking. */
export const preview = makePreview(manifest, {
  name: "Mika Dagohoy",
  title: "Landscape Photographer",
  company: "Dagohoy Studio, Dumaguete City",
  credential: "Archival pigment prints, 2016–2026",
  quote: "I go back to the same ridge until the weather agrees with me.",
  description:
    "Ten years photographing the Philippine islands from the ground up: rice terraces, volcano country and the far north. Prints are made in my Dumaguete studio on cotton rag paper, signed and numbered.\n\nFor licensing, editorial assignments and print orders, message me with the photo, the size and where it will hang or run.",
  phone: "+63 966 555 0137",
  messageChannel: "messenger",
  messageTarget: "dagohoystudio",
  email: "studio@mikadagohoy.ph",
  address: "Studio 3, 214 Hibbard Avenue, Dumaguete City, Negros Oriental",
  mapLat: 9.3187,
  mapLng: 123.3054,
  photoSet: "gallery",
  album: [
    ["batad-rice-terraces-village.jpg", "Batad, Ifugao — first light on the amphitheatre", "Batad rice terraces curving around a village"],
    ["batanes-rolling-hills.jpg", "Batanes — Racuh a Payaman pasture", "Green rolling hills by the sea in Batanes"],
    ["taal-volcano-sunset-boat.jpg", "Taal, from Tanauan — the last boat in", "Boat on Taal Lake with the volcano at sunset"],
    ["siargao-surf-aerial.jpg", "Siargao — Cloud 9, from the tower", "Surfer catching a wave off Siargao"],
    ["chocolate-hills.jpg", "Bohol — Chocolate Hills in the dry season", "The Chocolate Hills of Bohol seen from above"],
    ["el-nido-sunset.jpg", "El Nido, Palawan — Bacuit Bay at dusk", "Sunset over limestone islands in El Nido"],
    ["mayon-volcano-rice-field.jpg", "Albay — Mayon over the paddies", "Mayon Volcano rising behind rice fields"],
    ["batad-terraces-homes.jpg", "Batad, Ifugao — homes on the terraces", "Houses among the Batad rice terraces"],
    ["batanes-coastline.jpg", "Batanes — the coast road north of Basco", "Rocky coastline of Batanes"],
    ["intramuros-fort-santiago.jpg", "Intramuros — Fort Santiago walls", "Stone walls and gate of Fort Santiago in Intramuros"],
  ],
  links: [
    ["instagram", "https://instagram.com/mikadagohoy"],
    ["website", "https://mikadagohoy.ph/prints", "Prints and licensing"],
    ["facebook", "https://facebook.com/dagohoystudio"],
  ],
  team: [
    ["mika", null, "Mika Dagohoy", "Photographer"],
    ["jun", "mika", "Jun Tabanao", "Studio Manager & Printer"],
  ],
});
