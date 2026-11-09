import { photos } from "@/lib/mock/seed";
import { makePreview } from "../preview-kit";
import { manifest } from "./manifest";

/**
 * Kalye Grill, a fictional street-grill restaurant on Pasonanca Road,
 * Zamboanga City, counting down to its grand opening on Saturday,
 * 28 November 2026. Owners Paolo & Mae Ledesma are invented; no photo of
 * them is used (the owners' circle shows their monogram).
 */
const base = makePreview(manifest, {
  name: "Kalye Grill",
  title: "Paolo & Mae Ledesma, owners",
  quote: "Grill it slow, serve it hot, and never let a guest leave hungry.",
  description:
    "Kalye Grill is a street-grill house on Pasonanca Road: pork barbecue and chicken inasal over coals, sinigang and adobo by the bowl, and halo-halo with shaved ice made to order.\n\nPaolo ran the family ihawan at the Zamboanga night market for nine years; Mae built the kitchen and the menu. The new place seats 60, with long tables for barkada nights and a covered garden for families.",
  phone: "+63 917 555 0142",
  messageChannel: "messenger",
  messageTarget: "kalyegrillzc",
  email: "hello@kalyegrill.ph",
  address: "Pasonanca Road, Barangay Pasonanca, Zamboanga City",
  mapLat: 6.9476,
  mapLng: 122.0739,
  bookingUrl: "https://kalyegrill.ph/reserve",
  bookingNote: "Tables for 2 to 12 · walk-ins welcome",
  backgroundPhotoUrl: "/mock/bazaar/night-market-grilled-skewers.jpg",
  backgroundPhotoAlt: "Night market stalls grilling skewers over open coals",
  backgroundFocalPoint: { x: 0.35, y: 0.55 },
  overlayOpacity: 0.35,
  event: {
    eyebrow: "Grand opening",
    title: "Fire’s on at Kalye Grill",
    startsAt: "2026-11-28T16:00:00+08:00",
    timeLabel: "4 PM till late",
    venue: "Pasonanca Road, Zamboanga City",
    note: "Free pork barbecue for the first 100 guests, acoustic sets from 7 PM and halo-halo till late.",
  },
  links: [
    ["facebook", "https://facebook.com/kalyegrillzc"],
    ["instagram", "https://instagram.com/kalyegrillzc"],
    ["tiktok", "https://tiktok.com/@kalyegrillzc"],
    ["website", "https://kalyegrill.ph", "kalyegrill.ph"],
  ],
  team: [
    ["paolo", null, "Paolo Ledesma", "Owner · grill master"],
    ["mae", "paolo", "Mae Ledesma", "Owner · kitchen"],
    ["jun", "paolo", "Jun Alvarez", "Head cook"],
    ["rina", "paolo", "Rina Fernandez", "Floor manager"],
    ["toto", "paolo", "Toto Delos Santos", "Bar and halo-halo"],
  ],
});

/** Album from the openly licensed carinderia and bazaar sets. Captions describe the dishes, not the people. */
const id = base.card.id;
const album = [
  ...photos(id, "bazaar", [
    ["pork-barbecue-street-food.jpg", "Pork barbecue, basted twice", "Pork barbecue skewers on a charcoal grill"],
  ]),
  ...photos(id, "carinderia", [
    ["lechon-with-rice.jpg", "Lechon plate with garlic rice", "Sliced lechon with white rice"],
    ["chicken-adobo.jpg", "Adobo, the house recipe", "Chicken adobo in a dark soy and vinegar sauce"],
    ["fish-sinigang.jpg", "Fish sinigang for the table", "Sour tamarind soup with fish and vegetables"],
    ["halo-halo.jpg", "Halo-halo, shaved to order", "A tall glass of halo-halo with ube and leche flan"],
    ["open-air-eatery-carcar.jpg", "Long tables under the roof", "Open-air eatery with long tables"],
  ]),
  ...photos(id, "bazaar", [["capiz-parol-lantern.jpg", "Lanterns up for opening night", "A capiz shell parol lantern glowing"]]),
].map((p, i) => ({ ...p, id: `${id}-ph-${i + 1}`, position: i, isCover: i === 0 }));

export const preview = { ...base, photos: album };
