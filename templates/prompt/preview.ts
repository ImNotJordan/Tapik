import { photos } from "@/lib/mock/seed";
import { makePreview } from "../preview-kit";
import { manifest } from "./manifest";

/**
 * Kyla Santiago, a fictional vibe coding specialist in BGC who builds for
 * clients remotely. Every project and screenshot is an invented placeholder
 * drawn as SVG in public/mock/prompt (no real products, logos or people).
 */
const base = makePreview(manifest, {
  name: "Kyla Santiago",
  title: "Vibe Coding Specialist",
  company: "Tahi Labs",
  quote: "You describe it. I ship it, this week.",
  // The chat types itself out on the sample card (never in thumbnails or with reduced motion).
  motion: true,
  description:
    "I build working software from a conversation. You tell me what your business needs in plain words; I turn it into a real app with AI coding tools, test it on your own phone, deploy it and hand you the keys.\n\nMost builds take one or two weekly sprints: booking pages, order boards, queue screens, internal tools and small SaaS. I work from BGC with salons, clinics, carinderias and logistics teams around Metro Manila, and remotely with founders anywhere.",
  promptDemo: {
    ask: "Can you build a booking app for my 3 salon branches? Need it before the Christmas rush.",
    replyLines: ["On it. Next.js + Supabase", "Branches, stylists, 30-min slots", "₱200 deposits, SMS reminders", "Tested on your phone, Thursday"],
    resultLabel: "Deployed → book.salonsuki.ph",
  },
  expertiseChips: ["Claude Code", "Cursor", "Next.js", "Supabase", "Firebase", "Vercel"],
  bookingUrl: "https://tahilabs.ph/sprint",
  bookingNote: "1-week sprints · fixed scope, fixed price",
  phone: "+63 917 555 0142",
  messageChannel: "whatsapp",
  email: "kyla@tahilabs.ph",
  address: "Unit 7B, 32nd Street corner 5th Avenue, Bonifacio Global City, Taguig 1634",
  mapLat: 14.5527,
  mapLng: 121.0489,
  serviceAreas: ["Remote, worldwide", "On-site in Metro Manila"],
  logoDarkUrl: "/mock/prompt/logo-dark.svg",
  logoUrl: "/mock/prompt/logo.svg",
  logoAlt: "Tahi Labs",
  backgroundPhotoUrl: "/mock/prompt/cover-suki-live.svg",
  backgroundPhotoAlt: "Suki Salon’s booking page, live: branches, time slots and a booking confirmation",
  links: [
    ["custom", "https://github.com/kylabuilds", "GitHub"],
    ["x", "https://x.com/kylabuilds"],
    ["linkedin", "https://www.linkedin.com/in/kyla-santiago-builds/"],
    ["website", "https://tahilabs.ph", "tahilabs.ph"],
  ],
  team: [
    ["lead", null, "Kyla Santiago", "Builder & lead"],
    ["m1", "lead", "Marco Dizon", "Design engineer"],
    ["m2", "lead", "Paolo Reyes", "Backend & data"],
    ["m3", "lead", "Bea Lim", "QA & launch"],
    ["m4", "lead", "Ana Cruz", "Client success"],
  ],
});

/** Shipped projects: caption = project name, tag = what it was built with. */
const SHIPPED: [file: string, caption: string, alt: string, tag: string][] = [
  ["suki-calendar.svg", "Suki Salon bookings", "Salon admin calendar with a week of appointments", "Next.js · Supabase"],
  ["kusina-orders.svg", "Kusina order board", "Restaurant order board with new, cooking and ready columns", "Firebase · PWA"],
  ["tara-dispatch.svg", "Tara Trucking dispatch", "Dispatch screen with a route map and a list of trucks", "Next.js · Maps"],
  ["clinic-queue.svg", "Barangay clinic queue", "Queue display showing the number now serving", "Supabase · Realtime"],
  ["palengke-ledger.svg", "Palengke Ledger", "Market stall ledger with stock, prices and sales", "Expo · Firebase"],
  ["tutor-chat.svg", "Aral Buddy tutor", "Tutoring chat in Filipino with a lesson plan", "Claude API · Next.js"],
  ["isla-verde.svg", "Isla Verde Cove site", "Resort landing page with room rates", "Astro · Vercel"],
];

const id = base.card.id;
const album = photos(
  id,
  "prompt",
  SHIPPED.map(([file, caption, alt]) => [file, caption, alt]),
).map((p, i) => ({ ...p, tag: SHIPPED[i][3], isCover: i === 0 }));

export const preview = { ...base, photos: album };
