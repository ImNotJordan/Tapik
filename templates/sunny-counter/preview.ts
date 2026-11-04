import { makePreview } from "../preview-kit";
import { manifest } from "./manifest";

const day = (d: number, open: string, close: string) => ({ day: d, open, close });

/** Aling Nena's carinderia in Marikina. */
export const preview = makePreview(manifest, {
  name: "Nenita Dizon",
  title: "Owner",
  company: "Lutong Bahay ni Aling Nena",
  quote: "Kung ano ang luto sa bahay, ’yan ang nasa kaldero.",
  description:
    "Home cooking by the kaldero since 1998, two blocks from the Marikina River. Adobo, sinigang and pinakbet every day; lechon kawali on Fridays; halo-halo from March to June.\n\nWe take bilao orders for birthdays and office lunches with a day’s notice, and cater for up to 50 people anywhere in Marikina, Cainta and Antipolo.",
  phone: "+63 917 555 0119",
  messageChannel: "messenger",
  messageTarget: "lutongbahaynialingnena",
  email: "orders@alingnena.ph",
  address: "42 J.P. Rizal Street, Barangay Sta. Elena, Marikina City",
  mapLat: 14.6297,
  mapLng: 121.0966,
  agentPhotoAlt: "Nenita Dizon",
  photoSet: "carinderia",
  backgroundPhotoUrl: "/mock/carinderia/carinderia-counter-cebu.jpg",
  backgroundPhotoAlt: "Carinderia counter lined with pots and trays of the day’s dishes",
  backgroundFocalPoint: { x: 0.5, y: 0.55 },
  hours: [day(1, "06:00", "20:00"), day(2, "06:00", "20:00"), day(3, "06:00", "20:00"), day(4, "06:00", "20:00"), day(5, "06:00", "20:00"), day(6, "06:00", "20:00"), day(0, "07:00", "14:00")],
  services: ["Dine-in", "Take-out", "Bilao orders", "Catering for 50"],
  album: [
    ["chicken-adobo.jpg", "Chicken adobo, the bestseller", "Chicken adobo in a dark soy and vinegar sauce"],
    ["fish-sinigang.jpg", "Sinigang na isda, sour and hot", "Bowl of fish sinigang with vegetables in tamarind broth"],
    ["lechon-with-rice.jpg", "Friday lechon with rice", "Plate of lechon with white rice"],
    ["halo-halo.jpg", "Halo-halo, March to June", "Tall glass of halo-halo with shaved ice and toppings"],
    ["open-air-eatery-carcar.jpg", "Our long tables, open-air", "Open-air eatery with long tables and a lechon stall"],
    ["carinderia-counter-cebu.jpg", "Today’s kaldero line-up", "Counter of covered pots and trays of food"],
  ],
  links: [
    ["facebook", "https://facebook.com/lutongbahaynialingnena"],
    ["tiktok", "https://tiktok.com/@alingnena.marikina"],
    ["custom", "https://alingnena.ph/bilao", "Bilao menu and prices"],
  ],
  team: [
    ["nena", null, "Nenita Dizon", "Owner and head cook"],
    ["ramon", "nena", "Ramon Dizon", "Market runs"],
    ["joy", "nena", "Joy Bautista", "Cook"],
    ["kiko", "nena", "Kiko Santos", "Cashier"],
    ["lorna", "nena", "Lorna Reyes", "Bilao orders"],
  ],
});
