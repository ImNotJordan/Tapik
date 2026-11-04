import { photos } from "@/lib/mock/seed";
import { makePreview } from "../preview-kit";
import { VOICE } from "./brand";
import { manifest } from "./manifest";

/**
 * Hyacinth Industries, LLC: company details from the public site
 * (hyacinthindustriesllc.com). The person and the office address are
 * placeholders on purpose: no real employee is named.
 */
const base = makePreview(manifest, {
  name: "[Executive Name]",
  title: "[Title]",
  company: "Hyacinth Industries, LLC",
  tagline: VOICE.tagline,
  eyebrow: VOICE.eyebrow,
  quote: VOICE.headline,
  description: `${VOICE.support}\n\n${VOICE.proof} We work as an extension of your leadership team, in short engagements or ongoing, across seven industries from healthcare operations to digital delivery.\n\n[A short bio for the executive goes here: background, the kinds of companies they help, and how to start.]`,
  expertiseChips: [...VOICE.expertise],
  bookingUrl: "https://hyacinthindustriesllc.com/contact/",
  bookingLabel: VOICE.cta,
  bookingNote: VOICE.ctaNote,
  phone: "+1 (813) 213-3276",
  messageChannel: "sms",
  email: "info@hyacinthindustriesllc.com",
  address: "[Office address], Riverview, FL",
  mapLat: 27.8661,
  mapLng: -82.3265,
  logoDarkUrl: "/mock/hyacinth/logo-dark.webp",
  logoAlt: "Hyacinth Industries, LLC",
  backgroundPhotoUrl: "/mock/hyacinth/cover-waves.webp",
  backgroundPhotoAlt: "Red, gold and black waves: Hyacinth Industries brand artwork",
  links: [
    ["website", "https://hyacinthindustriesllc.com", "hyacinthindustriesllc.com"],
    ["facebook", "https://www.facebook.com/share/1NFwnjFHaA/"],
    ["instagram", "https://www.instagram.com/hyacinthindustriesllc/"],
    ["linkedin", "https://www.linkedin.com/company/hyacinth-industries-llc/"],
    ["x", "https://x.com/HyacinthILLC"],
  ],
  team: [
    ["lead", null, "[Executive Name]", "[Title]"],
    ["m1", "lead", "[Team Member]", "Client Success"],
    ["m2", "lead", "[Team Member]", "Operations & Logistics"],
    ["m3", "lead", "[Team Member]", "Marketing & Web Design"],
  ],
});

/** Sample album from the openly licensed mock sets (credits in lib/mock/credits.ts). Captions make no claims about the company. */
const id = base.card.id;
const album = [
  ...photos(id, "boardroom", [
    ["white-meeting-room.jpg", "Client briefing room", "Bright meeting room with a long white table"],
    ["office-atrium-coworking.jpg", "Where the team works", "Tall office atrium with open stairways"],
  ]),
  ...photos(id, "coach", [["seminar-audience-from-back.jpg", "Leadership workshop", "Audience at a seminar, seen from the back"]]),
  ...photos(id, "law", [["fountain-pen-on-letter.jpg", "Engagement letters, signed", "Fountain pen resting on a letter"]]),
  ...photos(id, "baguio", [["laptop-coffee-desk.jpg", "Weekly report day", "Laptop and coffee on a wooden desk"]]),
  ...photos(id, "boardroom", [
    ["office-lobby.jpg", "Reception", "Office lobby with stone floors and tall windows"],
    ["makati-skyline.jpg", "City office views", "City skyline of office towers"],
  ]),
].map((p, i) => ({ ...p, id: `${id}-ph-${i + 1}`, position: i, isCover: i === 0 }));

export const preview = { ...base, photos: album };
