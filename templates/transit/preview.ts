import { makePreview } from "../preview-kit";
import { manifest } from "./manifest";

/** Ramil Buenaventura, dispatch lead at a Valenzuela trucking company. Invented person and company. */
export const preview = makePreview(manifest, {
  name: "Ramil Buenaventura",
  title: "Dispatch Lead",
  company: "Bayanihan Haulers Inc.",
  employeeId: "BHI-D-0417",
  quote: "Tell me the cut-off, I'll tell you the truck.",
  description:
    "I run the dispatch desk for 28 trucks: 10-wheeler wing vans, dropside cargo and two prime movers for 20- and 40-footers out of the Manila ports.\n\nBook by 3 PM for next-day pickup. For port pull-outs, send the booking number and container details on WhatsApp and I'll confirm the slot and driver within the hour.",
  phone: "+63 918 555 0174",
  messageChannel: "whatsapp",
  email: "dispatch@bayanihanhaulers.ph",
  address: "Truck Yard 3, 88 McArthur Highway, Malinta, Valenzuela City",
  mapLat: 14.6922,
  mapLng: 120.9681,
  photoSet: "transit",
  backgroundPhotoUrl: "/mock/transit/cement-mixer-truck-highway.jpg",
  backgroundPhotoAlt: "Yellow cement mixer trucks parked under a highway flyover",
  backgroundFocalPoint: { x: 0.5, y: 0.55 },
  overlayOpacity: 0.35,
  serviceAreas: ["Port Area, Manila", "Valenzuela", "Meycauayan, Bulacan", "San Fernando, Pampanga", "Calamba, Laguna", "Batangas Port"],
  hours: [
    { day: 0, open: "07:00", close: "15:00" },
    { day: 1, open: "05:00", close: "22:00" },
    { day: 2, open: "05:00", close: "22:00" },
    { day: 3, open: "05:00", close: "22:00" },
    { day: 4, open: "05:00", close: "22:00" },
    { day: 5, open: "05:00", close: "22:00" },
    { day: 6, open: "05:00", close: "22:00" },
  ],
  album: [
    ["dropside-cargo-truck.jpg", "Dropside cargo for short city runs", "White dropside cargo truck parked on a street"],
    ["port-of-cebu-cranes.jpg", "Port pull-outs, Cebu and Manila", "Container cranes at a seaport"],
    ["roro-ferry-cagayan-bay.jpg", "RoRo to Mindanao on request", "Roll-on roll-off ferry at sea"],
    ["cement-mixer-truck-highway.jpg", "Concrete runs under the flyover", "Yellow cement mixer truck parked under a highway flyover"],
    ["map-pin-route.jpg", "Planning tomorrow's routes", "Blue map tack pinned into a topographic map"],
  ],
  links: [
    ["facebook", "https://facebook.com/bayanihanhaulers"],
    ["website", "https://bayanihanhaulers.ph/rates", "Rates and truck sizes"],
    ["viber", "viber://chat?number=%2B639185550174", "Viber dispatch"],
  ],
  team: [
    ["go", null, "Gloria Tan-Uy", "Operations Manager"],
    ["ra", "go", "Ramil Buenaventura", "Dispatch Lead"],
    ["je", "ra", "Jerome Castillo", "Night Dispatcher"],
    ["da", "ra", "Danica Pineda", "Booking Coordinator"],
    ["bo", "go", "Bong Ilagan", "Fleet Maintenance Head"],
    ["ma", "bo", "Mario Sicat", "Lead Mechanic"],
  ],
});
