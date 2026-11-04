import { makePreview } from "../preview-kit";
import { manifest } from "./manifest";

/** A Christmas bazaar in Kapitolyo, Pasig, and the organizer to call about it. */
export const preview = makePreview(manifest, {
  name: "Joanna Cruz-Lim",
  title: "Organizer",
  company: "Kapitolyo Makers Collective",
  quote: "Buy from the person who made it.",
  description:
    "Kapitolyo Makers Collective runs four weekend markets a year for independent makers from Pasig and nearby cities: ceramics, woven bags, baked goods, plants and local coffee.\n\nWant a stall at the next one? Message me with photos of what you make. Stalls are ₱1,500 a night, tables and lights included.",
  phone: "+63 918 555 0136",
  messageChannel: "viber",
  email: "joanna@kapitolyomakers.ph",
  address: "East Capitol Drive corner United Street, Kapitolyo, Pasig City",
  mapLat: 14.5714,
  mapLng: 121.0603,
  agentPhotoAlt: "Joanna Cruz-Lim",
  photoSet: "bazaar",
  backgroundPhotoUrl: "/mock/bazaar/parol-star-lanterns.jpg",
  backgroundPhotoAlt: "Three traditional parol star lanterns lit up at night",
  backgroundFocalPoint: { x: 0.5, y: 0.4 },
  overlayOpacity: 0.55,
  event: {
    title: "Paskuhan sa Kapitolyo Christmas Bazaar",
    startsAt: "2026-12-12T16:00:00+08:00",
    endsAt: "2026-12-12T23:00:00+08:00",
    venue: "East Capitol Drive, Kapitolyo, Pasig",
    note: "60 makers, food stalls and a parol-making corner.",
  },
  album: [
    ["parol-maker-stall.jpg", "Parol makers from Pampanga, back this year", "Stall hung with handmade parol lanterns"],
    ["night-market-grilled-skewers.jpg", "Inihaw row, from 5 PM", "Night market stalls grilling skewers"],
    ["capiz-parol-lantern.jpg", "Capiz parol workshop, ₱450 with materials", "Capiz shell parol lantern glowing"],
    ["pork-barbecue-street-food.jpg", "Pork barbecue by Mang Dodong’s", "Pork barbecue skewers on a grill"],
    ["tutuban-evening-crowd.jpg", "Last year’s Saturday crowd", "Evening crowd at a lit market building"],
    ["parol-star-lanterns.jpg", "Lanterns along East Capitol Drive", "Three star lanterns at night"],
  ],
  links: [
    ["facebook", "https://facebook.com/kapitolyomakers"],
    ["instagram", "https://instagram.com/kapitolyomakers"],
    ["custom", "https://kapitolyomakers.ph/stalls", "Apply for a stall"],
  ],
  team: [
    ["joanna", null, "Joanna Cruz-Lim", "Organizer"],
    ["migs", "joanna", "Migs Tolentino", "Vendors and stalls"],
    ["carla", "joanna", "Carla Ignacio", "Workshops"],
    ["benj", "joanna", "Benj Ocampo", "Logistics and permits"],
  ],
});
