import { makePreview } from "../preview-kit";
import { manifest } from "./manifest";

/** Isabel Lacson-Aquino: managing partner of a Makati advisory firm. */
export const preview = makePreview(manifest, {
  name: "Isabel Lacson-Aquino",
  title: "Managing Partner",
  company: "Lacson Aquino Advisory",
  quote: "Good advice is mostly the courage to say the plain thing early.",
  description:
    "Fifteen years advising family-owned companies in Luzon and the Visayas through succession, refinancing and their first outside investor. I sit with the founders, the second generation and the bank in the same room until everyone signs the same plan.\n\nMost engagements start with a two-hour conversation at our office on Ayala Avenue. There is no fee for that one.",
  phone: "+63 917 555 0119",
  messageChannel: "viber",
  email: "isabel@lacsonaquino.ph",
  address: "21/F Tower One, Ayala Triangle, Ayala Avenue, Makati City",
  mapLat: 14.5566,
  mapLng: 121.0244,
  backgroundPhotoUrl: "/mock/boardroom/office-atrium-coworking.jpg",
  backgroundPhotoAlt: "Tall office atrium with open stairways and hanging plants",
  backgroundFocalPoint: { x: 0.5, y: 0.35 },
  photoSet: "boardroom",
  album: [
    ["white-meeting-room.jpg", "The long table where every engagement starts", "Bright meeting room with white tables and chairs"],
    ["makati-skyline.jpg", "Makati from the Skyway, on the way to a client", "Makati skyline seen from an elevated highway"],
    ["office-lobby.jpg", "Our building lobby, 7:30 on a Monday", "Office lobby with stone floors and tall windows"],
    ["bgc-skyline-dusk.jpg", "BGC and Makati at dusk", "Bonifacio Global City and Makati skylines at sunset"],
    ["office-atrium-coworking.jpg", "Where we meet founders on Fridays", "Tall office atrium with open stairways"],
  ],
  links: [
    ["linkedin", "https://linkedin.com/in/isabellacsonaquino"],
    ["website", "https://lacsonaquino.ph/insights", "Insights"],
    ["youtube", "https://youtube.com/@lacsonaquinoadvisory", "Talks"],
    ["x", "https://x.com/ilacsonaquino"],
  ],
  team: [
    ["ricardo", null, "Ricardo Lacson", "Founding Partner"],
    ["isabel", "ricardo", "Isabel Lacson-Aquino", "Managing Partner"],
    ["paolo", "isabel", "Paolo Sy", "Senior Associate"],
    ["trina", "isabel", "Trina Abad", "Associate"],
    ["celine", "ricardo", "Celine Uy", "Office Manager"],
  ],
});
