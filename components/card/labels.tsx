"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * Every word the card itself prints (not the admin's content).
 * English by default; the Bilingual template swaps in Filipino on request.
 */
export type CardLabels = {
  lang: "en" | "fil";
  call: string;
  messageOn: (channel: string) => string;
  save: string;
  saveContact: string;
  saveToContacts: string;
  email: string;
  phone: string;
  share: string;
  shareDescription: string;
  copy: string;
  copied: string;
  copyLink: string;
  linkCopied: string;
  copiedThing: (what: string) => string;
  contactDetails: string;
  about: string;
  readMore: string;
  showLess: string;
  quote: string;
  photos: string;
  photoCount: (n: number) => string;
  openPhoto: string;
  seeAll: string;
  nOfM: (n: number, m: number) => string;
  team: string;
  people: (n: number) => string;
  reportsTo: string;
  office: string;
  findUs: string;
  directions: string;
  socialProfiles: string;
  poweredBy: string;
  hours: string;
  openNow: string;
  closedNow: string;
  until: (time: string) => string;
  opens: (when: string) => string;
  closed: string;
  today: string;
  services: string;
  serviceAreas: string;
  book: string;
  addToCalendar: string;
  days: string;
  hoursShort: string;
  minutes: string;
  started: string;
  ended: string;
  web: string;
  mobile: string;
  social: string;
  dayNames: string[];
  dayShort: string[];
};

export const EN: CardLabels = {
  lang: "en",
  call: "Call",
  messageOn: (c) => `Message on ${c}`,
  save: "Save",
  saveContact: "Save contact",
  saveToContacts: "Save to contacts",
  email: "Email",
  phone: "Phone",
  share: "Share this card",
  shareDescription: "Scan the code or copy the link.",
  copy: "Copy",
  copied: "Copied",
  copyLink: "Copy link",
  linkCopied: "Link copied",
  copiedThing: (w) => `${w} copied`,
  contactDetails: "Contact details",
  about: "About",
  readMore: "Read more",
  showLess: "Show less",
  quote: "Quote",
  photos: "Photos",
  photoCount: (n) => `${n} photo${n === 1 ? "" : "s"}`,
  openPhoto: "Open photo",
  seeAll: "See all",
  nOfM: (n, m) => `${n} of ${m}`,
  team: "Team",
  people: (n) => `${n} ${n === 1 ? "person" : "people"}`,
  reportsTo: "Reports to",
  office: "Office",
  findUs: "Find us",
  directions: "Get directions",
  socialProfiles: "Social profiles",
  poweredBy: "Powered by",
  hours: "Hours",
  openNow: "Open now",
  closedNow: "Closed now",
  until: (t) => `until ${t}`,
  opens: (w) => `opens ${w}`,
  closed: "Closed",
  today: "Today",
  services: "Services",
  serviceAreas: "Service areas",
  book: "Book an appointment",
  addToCalendar: "Add to calendar",
  days: "days",
  hoursShort: "hrs",
  minutes: "min",
  started: "Happening now",
  ended: "This event has ended",
  web: "Web",
  mobile: "Mobile",
  social: "Social",
  dayNames: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  dayShort: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
};

export const FIL: CardLabels = {
  lang: "fil",
  call: "Tumawag",
  messageOn: (c) => `Mag-message sa ${c}`,
  save: "I-save",
  saveContact: "I-save ang contact",
  saveToContacts: "I-save sa contacts",
  email: "Email",
  phone: "Telepono",
  share: "Ibahagi ang card",
  shareDescription: "I-scan ang code o kopyahin ang link.",
  copy: "Kopyahin",
  copied: "Nakopya",
  copyLink: "Kopyahin ang link",
  linkCopied: "Nakopya ang link",
  copiedThing: (w) => `Nakopya ang ${w.toLowerCase()}`,
  contactDetails: "Paano makipag-ugnayan",
  about: "Tungkol sa akin",
  readMore: "Magbasa pa",
  showLess: "Paikliin",
  quote: "Kasabihan",
  photos: "Mga larawan",
  photoCount: (n) => `${n} larawan`,
  openPhoto: "Buksan ang larawan",
  seeAll: "Tingnan lahat",
  nOfM: (n, m) => `${n} sa ${m}`,
  team: "Ang aming koponan",
  people: (n) => `${n} katao`,
  reportsTo: "Nag-uulat kay",
  office: "Opisina",
  findUs: "Puntahan kami",
  directions: "Paano pumunta",
  socialProfiles: "Social media",
  poweredBy: "Gawa ng",
  hours: "Oras",
  openNow: "Bukas ngayon",
  closedNow: "Sarado ngayon",
  until: (t) => `hanggang ${t}`,
  opens: (w) => `magbubukas ${w}`,
  closed: "Sarado",
  today: "Ngayon",
  services: "Mga serbisyo",
  serviceAreas: "Mga lugar na sakop",
  book: "Magpa-appointment",
  addToCalendar: "Idagdag sa kalendaryo",
  days: "araw",
  hoursShort: "oras",
  minutes: "min",
  started: "Nagaganap na ngayon",
  ended: "Tapos na ang event na ito",
  web: "Website",
  mobile: "Mobile",
  social: "Social",
  dayNames: ["Linggo", "Lunes", "Martes", "Miyerkules", "Huwebes", "Biyernes", "Sabado"],
  dayShort: ["Lin", "Lun", "Mar", "Miy", "Huw", "Biy", "Sab"],
};

const LabelsContext = createContext<CardLabels>(EN);

export function LabelsProvider({ lang, children }: { lang: "en" | "fil"; children: ReactNode }) {
  return <LabelsContext.Provider value={lang === "fil" ? FIL : EN}>{children}</LabelsContext.Provider>;
}

export function useLabels(): CardLabels {
  return useContext(LabelsContext);
}
