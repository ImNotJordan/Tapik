import { makePreview } from "../preview-kit";
import { manifest } from "./manifest";

/** Jose Miguel Abellana, selling a beachfront villa on Mactan: the place does the talking. */
export const preview = makePreview(manifest, {
  name: "Jose Miguel Abellana",
  title: "Property Consultant",
  company: "Abellana Properties",
  credential: "PRC REB No. 0011842",
  quote: "Come see it at low tide. That’s when you understand the lot.",
  description:
    "I sell beachfront and resort properties on Mactan and Olango: villas, lots and small resorts, mostly to families and returning OFWs.\n\nEvery viewing comes with the title documents, the tax declaration and a walk along the shoreline at the time of day you’d actually use it.",
  phone: "+63 918 555 0129",
  messageChannel: "viber",
  email: "jm@abellanaproperties.ph",
  address: "Punta Engaño Road, Lapu-Lapu City, Cebu",
  mapLat: 10.3157,
  mapLng: 124.0145,
  backgroundPhotoUrl: "/mock/realty/swimming-pool-tran-le-xuan-villa-01.jpg",
  backgroundPhotoAlt: "Villa swimming pool in a landscaped garden",
  backgroundFocalPoint: { x: 0.5, y: 0.55 },
  overlayOpacity: 0.45,
  photoSet: "realty",
  album: [
    ["swimming-pool-tran-le-xuan-villa-01.jpg", "Garden pool, Punta Engaño villa", "Swimming pool in a landscaped garden"],
    ["bb-blue-waters-mactan-beach-2.jpg", "The beach in front of the lot", "Palm-lined beach on Mactan Island"],
    ["modern-luxury-living-room-with-kitchen-interior.jpg", "Living room and kitchen", "Modern kitchen with wood paneling"],
    ["bedroom-interior-of-apartment-in-brisbane-2025.jpg", "Main bedroom", "Bedroom with a double bed and lamps"],
    ["bb-blue-waters-mactan-beach-4.jpg", "View from the water at high tide", "Sea and beach seen from the water"],
  ],
  links: [
    ["facebook", "https://facebook.com/abellanaproperties"],
    ["instagram", "https://instagram.com/jm.abellana.homes"],
    ["website", "https://abellanaproperties.ph/mactan", "Mactan listings"],
  ],
  team: [
    ["jm", null, "Jose Miguel Abellana", "Property Consultant"],
    ["tess", "jm", "Tess Abellana", "Documentation"],
    ["nonoy", "jm", "Nonoy Cabahug", "Viewings and site visits"],
  ],
});
