import { makePreview } from "../preview-kit";
import { manifest } from "./manifest";

/** Fr. Emmanuel Belmonte, a parish priest in Pulilan, Bulacan. Invented person; real, openly licensed church photos. */
export const preview = makePreview(manifest, {
  name: "Fr. Emmanuel Belmonte",
  title: "Parish Priest",
  company: "San Isidro Labrador Parish",
  quote: "Our doors open before the sun does. Come as you are; there is always room on the bench.",
  description:
    "I have served San Isidro Labrador since 2019, a farming parish of eleven chapels across Pulilan. Most of my week is spent in the barangays: house blessings, the sick, and the long table after Sunday Mass.\n\nFor baptisms, weddings and Mass intentions, call the parish office during office hours or send a message and our secretary will reply the same day.",
  phone: "+63 917 555 0119",
  messageChannel: "messenger",
  messageTarget: "sanisidropulilan",
  email: "parishoffice@sanisidropulilan.ph",
  address: "Poblacion, Pulilan, Bulacan",
  mapLat: 14.9022,
  mapLng: 120.8487,
  photoSet: "parish",
  backgroundPhotoUrl: "/mock/parish/baclayon-church-facade.jpg",
  backgroundPhotoAlt: "Stone church facade and bell tower under a clear sky",
  backgroundFocalPoint: { x: 0.5, y: 0.45 },
  hours: [
    { day: 0, open: "06:00", close: "11:30" },
    { day: 1, open: "06:00", close: "07:00" },
    { day: 2, open: "06:00", close: "07:00" },
    { day: 3, open: "06:00", close: "07:00" },
    { day: 4, open: "06:00", close: "07:00" },
    { day: 5, open: "06:00", close: "07:00" },
    { day: 6, open: "17:00", close: "19:00" },
  ],
  services: ["Parish Youth Ministry", "Choir", "Feeding program", "Catechism", "Couples for Christ"],
  event: {
    title: "Simbang Gabi",
    startsAt: "2026-12-16T04:30:00+08:00",
    endsAt: "2026-12-16T06:00:00+08:00",
    venue: "San Isidro Labrador Parish Church",
    note: "Nine dawn Masses, Dec 16–24",
  },
  album: [
    ["simbang-gabi-crowd.jpg", "Simbang Gabi, the first dawn Mass", "Crowd in a churchyard at night under star lanterns, the church lit behind them"],
    ["san-miguel-church-interior.jpg", "The nave after the morning Mass", "Church interior with arches and a gilded altar"],
    ["votive-candles.jpg", "Votive candles at the side chapel", "Iron candle rack with a single lit candle and melted wax"],
    ["baclayon-church-retablo.jpg", "The retablo, restored in 2024", "Ornate carved altarpiece inside an old church"],
    ["paoay-church.jpg", "Parish pilgrimage to Paoay, Ilocos Norte", "Paoay Church with its massive buttresses"],
    ["baclayon-church-facade.jpg", "Our sister parish in Baclayon, Bohol", "Stone church facade with a bell tower"],
  ],
  links: [
    ["facebook", "https://facebook.com/sanisidropulilan"],
    ["youtube", "https://youtube.com/@sanisidropulilan", "Sunday Mass livestream"],
    ["website", "https://sanisidropulilan.ph/intentions", "Mass intentions"],
  ],
  team: [
    ["em", null, "Fr. Emmanuel Belmonte", "Parish Priest"],
    ["jo", "em", "Fr. Jojo Salvador", "Parochial Vicar"],
    ["li", "em", "Liza Mangahas", "Parish Secretary"],
    ["ar", "em", "Arnel Dela Paz", "Youth Ministry Coordinator"],
    ["ce", "li", "Cecilia Robles", "Parish Office Assistant"],
  ],
});
