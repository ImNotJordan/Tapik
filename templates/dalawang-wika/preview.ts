import { photos } from "@/lib/mock/seed";
import { makePreview } from "../preview-kit";
import { manifest } from "./manifest";

/** Mark Anthony dela Cruz, a licensed financial advisor in Zamboanga City. Invented person and company. */
const base = makePreview(manifest, {
  name: "Mark Anthony dela Cruz",
  title: "Licensed Financial Advisor",
  company: "Tala Life Advisors",
  credential: "IC License No. 2026-11408",
  quote: "Plan while you’re healthy, so your family never has to worry.",
  description:
    "I help Zamboangueño families and small business owners protect what they’ve worked for: life and health cover, education plans for the kids, and a retirement fund that grows on a monthly amount that fits the budget.\n\nOur first meeting is a free consultation, in English, Filipino or Chavacano. I look at the plans you already have, explain your options in plain words, and you decide in your own time.",
  services: ["Retirement planning", "Education plans", "Health and critical illness cover", "Life insurance", "Estate planning", "OFW family plans"],
  translations: {
    fil: {
      title: "Lisensyadong Financial Advisor",
      quote: "Magplano habang malakas pa, para hindi na mag-alala ang pamilya mo.",
      description:
        "Tinutulungan ko ang mga pamilyang Zamboangueño at maliliit na negosyante na protektahan ang kanilang pinaghirapan: seguro sa buhay at kalusugan, plano para sa pag-aaral ng mga anak, at pondo sa pagreretiro na lumalago sa buwanang hulog na kaya ng budget.\n\nLibre ang una nating pag-uusap, sa English, Filipino o Chavacano. Titingnan ko ang mga plano mo ngayon, ipapaliwanag ko ang mga pagpipilian sa simpleng salita, at ikaw ang magpapasya sa sarili mong oras.",
      chips: ["Pagpaplano sa pagreretiro", "Plano sa pag-aaral", "Proteksyon sa kalusugan at malubhang sakit", "Seguro sa buhay", "Pagpaplano ng mana", "Plano para sa pamilyang OFW"],
    },
  },
  bookingUrl: "https://talalife.ph/book/markdelacruz",
  phone: "+63 917 555 0142",
  messageChannel: "viber",
  email: "mark.delacruz@talalife.ph",
  address: "3F Tala Building, Mayor Jaldon Street, Zamboanga City",
  mapLat: 6.9068,
  mapLng: 122.0779,
  logoUrl: "/mock/dalawang-wika/logo.svg",
  logoAlt: "Tala Life Advisors",
  links: [
    ["facebook", "https://facebook.com/markdelacruz.tala"],
    ["linkedin", "https://linkedin.com/in/markanthonydelacruz"],
    ["viber", "https://vb.me/markdelacruztala", "Viber"],
    ["website", "https://talalife.ph"],
  ],
  team: [
    ["ta", null, "Teresita Arquiza", "Agency Director"],
    ["ma", "ta", "Mark Anthony dela Cruz", "Licensed Financial Advisor"],
    ["kl", "ta", "Karen Lim-Sebastian", "Licensed Financial Advisor"],
    ["rf", "ma", "Rhea Joy Fernandez", "Client Care Associate"],
    ["jm", "ma", "Jomar Tan", "Associate Advisor"],
  ],
});

// The album mixes two photo folders, so it's built here rather than through photoSet.
const album = [
  ...photos(base.card.id, "boardroom", [
    ["white-meeting-room.jpg", "Our consultation room, third floor", "Long white table and chairs in a bright meeting room"],
    ["office-lobby.jpg", "Building lobby, ask the guard for Tala", "Office building lobby with a reception counter"],
  ]),
  ...photos(base.card.id, "law", [
    ["fountain-pen-on-letter.jpg", "Signing day for an education plan", "Fountain pen resting on a handwritten letter"],
    ["law-library-books.jpg", "Policy guides we keep on hand", "Shelves of bound reference books"],
  ]),
  ...photos(base.card.id, "boardroom", [
    ["office-atrium-coworking.jpg", "Team planning day", "Open coworking space with long tables"],
    ["makati-skyline.jpg", "Advisors’ summit in Makati", "Makati skyline seen from the Skyway"],
    ["bgc-skyline-dusk.jpg", "Quarterly training in BGC", "Bonifacio Global City skyline at dusk"],
  ]),
].map((p, i) => ({ ...p, id: `${base.card.id}-ph-${i + 1}`, position: i, isCover: i === 0 }));

export const preview = { ...base, photos: album };
