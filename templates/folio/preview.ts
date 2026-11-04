import { makePreview } from "../preview-kit";
import { manifest } from "./manifest";

/** Atty. Gabriel Aquino-Reyes: partner at a small Pasig law office. */
export const preview = makePreview(manifest, {
  name: "Atty. Gabriel Aquino-Reyes",
  title: "Partner",
  company: "Aquino Reyes & Associates Law Offices",
  credential: "Roll of Attorneys No. 61234",
  quote: "Most disputes are settled by the paperwork done long before them.",
  description:
    "I handle corporate housekeeping, property transfers and contract review for small and family-owned businesses in Pasig, Mandaluyong and Rizal. Clients come to me before they sign, not after.\n\nConsultations are by appointment, in person at Ortigas Center or by video call. Notarial services are available on weekdays from 9 AM to 4 PM.",
  phone: "+63 918 555 0136",
  messageChannel: "viber",
  email: "gaquinoreyes@aquinoreyes.ph",
  address: "Unit 2408, Emerald Avenue, Ortigas Center, Pasig City",
  mapLat: 14.5866,
  mapLng: 121.0614,
  showDirections: true,
  photoSet: "law",
  album: [
    ["law-library-books.jpg", "The firm library: SCRA reports back to 1901", "Shelves of old leather-bound law books"],
    ["fountain-pen-on-letter.jpg", "Every engagement letter is signed in ink", "Fountain pen resting on a handwritten letter"],
    ["calvo-building-escolta.jpg", "Our first office, on Escolta, from 1978 to 1996", "Pre-war Calvo Building on Escolta Street, Manila"],
    ["manila-city-hall-dusk.jpg", "Manila City Hall, where most of our filings start", "Manila City Hall clock tower at dusk"],
  ],
  links: [
    ["website", "https://aquinoreyes.ph", "aquinoreyes.ph"],
    ["linkedin", "https://linkedin.com/in/gabrielaquinoreyes"],
    ["facebook", "https://facebook.com/aquinoreyeslaw"],
    ["x", "https://x.com/atty_gar"],
  ],
  team: [
    ["mercedes", null, "Atty. Mercedes Aquino", "Senior Partner"],
    ["gabriel", "mercedes", "Atty. Gabriel Aquino-Reyes", "Partner"],
    ["lourdes", "mercedes", "Atty. Lourdes Reyes-Tolentino", "Partner"],
    ["jerome", "gabriel", "Atty. Jerome Bautista", "Associate"],
    ["nina", "lourdes", "Nina Castillo", "Paralegal"],
  ],
});
