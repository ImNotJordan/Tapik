import { makePreview } from "../preview-kit";
import { manifest } from "./manifest";

/** Bea Santiago, a running coach in Iloilo: a personal brand that wants to be remembered by name. */
export const preview = makePreview(manifest, {
  name: "Bea Santiago",
  title: "Running coach",
  company: "Takbo Club Iloilo",
  quote: "Everyone can run a 5K. Most people just haven’t been shown how slow to start.",
  description:
    "I coach first-time runners and returning athletes in Iloilo City, from couch to 5K to their first full marathon. Group runs at the Iloilo Sports Complex every Tuesday and Saturday at 5:30 AM; one-on-one plans for everyone else.\n\nI also run strength and mobility classes for runners, and talks for schools and offices on starting an exercise habit that lasts.",
  phone: "+63 917 555 0175",
  messageChannel: "messenger",
  messageTarget: "takboclubiloilo",
  email: "bea@takboclub.ph",
  address: "Iloilo Sports Complex, Luna Street, La Paz, Iloilo City",
  mapLat: 10.7105,
  mapLng: 122.5622,
  backgroundPhotoUrl: "/mock/coach/running-track-iloilo.jpg",
  backgroundPhotoAlt: "Red running track and grandstand at the Iloilo Sports Complex",
  backgroundFocalPoint: { x: 0.5, y: 0.6 },
  photoSet: "coach",
  album: [
    ["running-track-iloilo.jpg", "Saturday group run, Iloilo Sports Complex", "Red running track in front of a grandstand"],
    ["forest-trail.jpg", "Trail weekend for the marathon group", "Dirt trail through ferns with a hiker far ahead"],
    ["dumbbell-rack.jpg", "Strength for runners, Thursdays", "Rack of black dumbbells"],
    ["yoga-mat-by-window.jpg", "Mobility class: twenty minutes, every day", "Yoga mat on a wooden floor by a window"],
    ["seminar-audience-from-back.jpg", "Talk for new hires: walking before running", "Audience in a lecture hall seen from behind"],
  ],
  links: [
    ["instagram", "https://instagram.com/takboclub.iloilo"],
    ["facebook", "https://facebook.com/takboclubiloilo"],
    ["tiktok", "https://tiktok.com/@coachbea.runs"],
    ["website", "https://takboclub.ph/programs", "Training plans"],
  ],
  team: [
    ["bea", null, "Bea Santiago", "Head coach"],
    ["rico", "bea", "Rico Villanueva", "Strength coach"],
    ["jen", "bea", "Jen Lacson", "Pace group lead"],
  ],
});
