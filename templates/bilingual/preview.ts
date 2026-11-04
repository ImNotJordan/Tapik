import { makePreview } from "../preview-kit";
import { manifest } from "./manifest";

/** Rowena Dimagiba, a financial advisor serving Quezon City and Baguio. Invented person and company. */
export const preview = makePreview(manifest, {
  name: "Rowena Dimagiba",
  title: "Financial Advisor",
  company: "Sinag Life Assurance",
  credential: "IC License No. 2026-08814",
  quote: "Ang tunay na yaman ay ang kapanatagan ng pamilya.",
  description:
    "I help families plan for school, health and retirement with life insurance and education plans that fit a real monthly budget. Most of my clients are teachers, nurses and OFW families.\n\nI meet at our Tomas Morato office on weekdays and in Baguio every second Saturday. I explain every policy in English or Filipino, whichever you're more comfortable with.",
  phone: "+63 927 555 0136",
  messageChannel: "viber",
  email: "rowena.dimagiba@sinaglife.ph",
  address: "4F Sinag Building, 210 Tomas Morato Avenue, Quezon City",
  mapLat: 14.6345,
  mapLng: 121.0346,
  photoSet: "baguio",
  backgroundPhotoUrl: "/mock/baguio/tomas-morato-avenue-qc.jpg",
  backgroundPhotoAlt: "Tomas Morato Avenue in Quezon City",
  backgroundFocalPoint: { x: 0.5, y: 0.5 },
  album: [
    ["session-road-fog.jpg", "Baguio office, second Saturdays", "Session Road in Baguio on a foggy day"],
    ["laptop-coffee-desk.jpg", "Policy reviews over coffee", "Laptop and a cup of coffee on a desk"],
    ["burnham-park-lake.jpg", "Client family day, Burnham Park", "Burnham Park lake with rowboats"],
    ["pine-cone-pine-trees.jpg", "Baguio pines, every visit", "Hand holding a pine cone among tall pine trees"],
  ],
  links: [
    ["facebook", "https://facebook.com/rowena.sinaglife"],
    ["viber", "https://vb.me/rowenasinaglife", "Viber"],
    ["linkedin", "https://linkedin.com/in/rowenadimagiba"],
  ],
  team: [
    ["ce", null, "Celso Manalastas", "Unit Manager"],
    ["ro", "ce", "Rowena Dimagiba", "Financial Advisor"],
    ["jh", "ce", "Jhoanna Sarmiento", "Financial Advisor"],
    ["ki", "ro", "Kim Ocampo", "Client Service Associate"],
  ],
});
