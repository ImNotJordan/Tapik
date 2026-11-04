import { makePreview } from "../preview-kit";
import { manifest } from "./manifest";

const day = (d: number, open: string, close: string, closed?: boolean) => ({ day: d, open, close, closed });

/** A family dentist in Antipolo. */
export const preview = makePreview(manifest, {
  name: "Dr. Bianca Salonga",
  title: "Dentist, DMD",
  company: "Salonga Family Dental",
  credential: "PRC Lic. No. 0041287",
  quote: "Nobody should be scared of the dentist. Least of all the kids.",
  description:
    "General and family dentistry in Antipolo for over ten years. I see kids from their first tooth, adults for cleanings, fillings and root canals, and lolos and lolas for dentures that actually fit.\n\nBook online or message the clinic. HMO cards accepted: Maxicare, Intellicare and Medicard.",
  phone: "+63 917 555 0174",
  messageChannel: "viber",
  email: "clinic@salongadental.ph",
  bookingUrl: "https://salongadental.ph/book",
  address: "2F Sumulong Arcade, 118 Sumulong Highway, Barangay Mambugan, Antipolo City, Rizal",
  mapLat: 14.6142,
  mapLng: 121.1471,
  agentPhotoAlt: "Dr. Bianca Salonga",
  photoSet: "clinic",
  hours: [day(1, "09:00", "18:00"), day(2, "09:00", "18:00"), day(3, "09:00", "18:00"), day(4, "09:00", "18:00"), day(5, "09:00", "18:00"), day(6, "09:00", "13:00"), day(0, "00:00", "00:00", true)],
  services: ["Cleaning", "Braces", "Root canal", "Kids’ dentistry", "Dentures"],
  album: [
    ["modern-clinic-interior.jpg", "Reception and waiting area", "Bright clinic interior with a reception desk and seating"],
    ["blue-dental-chair.jpg", "Treatment room 1", "Blue dental chair with an overhead lamp"],
    ["dental-chair-treatment-room.jpg", "Treatment room 2, for kids and nervous patients", "Dental chair in a calm treatment room"],
    ["clinic-waiting-area.jpg", "Waiting area with a play corner", "Clinic waiting area with rows of chairs"],
    ["dental-clinic-storefront-baliuag.jpg", "Look for the clinic sign on the second floor", "Dental clinic storefront on a town street"],
  ],
  links: [
    ["facebook", "https://facebook.com/salongafamilydental"],
    ["instagram", "https://instagram.com/salonga.dental"],
    ["website", "https://salongadental.ph", "Clinic website"],
  ],
  team: [
    ["bianca", null, "Dr. Bianca Salonga", "Dentist and clinic head"],
    ["paolo", "bianca", "Dr. Paolo Agustin", "Orthodontist, Saturdays"],
    ["mae", "bianca", "Mae Villafuerte", "Dental assistant"],
    ["rina", "mae", "Rina Cortez", "Front desk and HMO claims"],
  ],
});
