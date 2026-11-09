import { photos } from "@/lib/mock/seed";
import { makePreview } from "../preview-kit";
import { manifest } from "./manifest";

/**
 * Ramil Catalan, dispatch lead at a Zamboanga City trucking and freight
 * company. Invented person and company; the photos are openly licensed
 * pictures of trucks and ports (credits in public/mock/freight and
 * public/mock/transit), and the captions make no claim about where they were taken.
 */
const base = makePreview(manifest, {
  name: "Ramil Catalan",
  title: "Dispatch Lead",
  company: "Zamboanga South Haulers & Freight",
  quote: "Book by two, rolling by four. I text you the plate number.",
  description:
    "I run the dispatch desk for 22 trucks: 6-wheeler wing vans, dropside cargo for town runs and three prime movers for 20- and 40-footers off the Port of Zamboanga.\n\nSend the pickup address, cargo and weight, and the drop-off on Viber. For port pull-outs, add the booking number and container details and I'll confirm the slot, the driver and the plate number within the hour. Night runs to Ipil and Pagadian by arrangement.",
  phone: "+63 917 555 0142",
  messageChannel: "viber",
  email: "ramil@zshaulers.ph",
  bookingUrl: "https://zshaulers.ph/pickup",
  bookingNote: "Same-day if booked by 2 PM",
  address: "Dispatch Yard, Gov. Camins Avenue, Canelar, Zamboanga City",
  mapLat: 6.9188,
  mapLng: 122.0734,
  backgroundPhotoUrl: "/mock/freight/manila-international-container-terminal-cranes-sunrise-tondo.jpg",
  backgroundPhotoAlt: "Orange container cranes over a port at dusk",
  backgroundFocalPoint: { x: 0.5, y: 0.48 },
  overlayOpacity: 0.3,
  serviceAreas: ["Zamboanga City", "Port of Zamboanga", "Ayala to Recodo", "Ipil, Zamboanga Sibugay", "Pagadian", "Dipolog", "RoRo to Basilan"],
  links: [
    ["facebook", "https://facebook.com/zshaulers"],
    ["website", "https://zshaulers.ph", "zshaulers.ph"],
    ["linkedin", "https://www.linkedin.com/company/zshaulers"],
    ["viber", "viber://chat?number=%2B639175550142", "Viber dispatch"],
  ],
  team: [
    ["op", null, "Teresita Alano", "Operations Manager"],
    ["rc", "op", "Ramil Catalan", "Dispatch Lead"],
    ["jd", "rc", "Jonel Dela Peña", "Night Dispatcher"],
    ["ms", "rc", "Mylene Sali", "Booking Coordinator"],
    ["at", "op", "Abdulhakim Tahir", "Fleet Maintenance Head"],
  ],
});

const id = base.card.id;
const album = [
  ...photos(id, "transit", [
    ["dropside-cargo-truck.jpg", "Dropside cargo for town runs", "White dropside cargo truck parked in a yard"],
    ["cement-mixer-truck-highway.jpg", "Concrete and aggregates hauls", "Yellow cement mixer trucks parked under a highway flyover"],
  ]),
  ...photos(id, "freight", [
    ["north-harbor-manila-international-container-terminal-tondo.jpg", "Port pull-outs, 20 and 40 footers", "Container terminal with stacked containers and cranes"],
    ["modern-warehouse-with-pallet-rack-storage-system.jpg", "Cross-dock and short storage", "Warehouse aisle with tall pallet racks"],
  ]),
  ...photos(id, "transit", [
    ["roro-ferry-cagayan-bay.jpg", "RoRo crossings on request", "Roll-on roll-off ferry at sea"],
    ["port-of-cebu-cranes.jpg", "Inter-island container moves", "Container cranes at a seaport"],
    ["map-pin-route.jpg", "Planning tomorrow's routes", "Blue map tack pinned into a topographic map"],
  ]),
].map((p, i) => ({ ...p, id: `${id}-ph-${i + 1}`, position: i, isCover: i === 0 }));

export const preview = { ...base, photos: album };
