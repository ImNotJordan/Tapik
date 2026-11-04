import { makePreview } from "../preview-kit";
import { manifest } from "./manifest";

/** Andrea Dimaculangan: a corporate sales account manager at an insurance group in BGC. */
export const preview = makePreview(manifest, {
  name: "Andrea Dimaculangan",
  title: "Senior Account Manager",
  company: "Tala Insurance Group",
  department: "Corporate Sales",
  employeeId: "TIG-04127",
  quote: "I would rather explain a policy twice than have you surprised by it once.",
  description:
    "I look after group health and property cover for 60 companies in Metro Manila and Calabarzon, from 20-person BPO teams to manufacturing plants in Laguna. Renewals, claims escalation and new quotations all come through me.\n\nFor claims already filed, send the claim number by SMS and I will reply within the business day.",
  phone: "+63 917 555 0174",
  messageChannel: "sms",
  email: "andrea.dimaculangan@talainsurance.ph",
  address: "14/F Tala Tower, 5th Avenue corner 28th Street, Bonifacio Global City, Taguig",
  mapLat: 14.5509,
  mapLng: 121.0503,
  photoSet: "boardroom",
  album: [
    ["white-meeting-room.jpg", "Client briefing room, 14th floor", "Bright meeting room with white tables"],
    ["office-lobby.jpg", "Tala Tower lobby: ask the guard for Corporate Sales", "Office lobby with stone floors and tall windows"],
    ["bgc-skyline-dusk.jpg", "BGC from our floor at the end of the day", "Bonifacio Global City skyline at sunset"],
    ["office-atrium-coworking.jpg", "The atrium where the sales team meets on Mondays", "Tall office atrium with open stairways"],
  ],
  links: [
    ["linkedin", "https://linkedin.com/in/andreadimaculangan"],
    ["website", "https://talainsurance.ph/corporate", "Corporate plans"],
    ["facebook", "https://facebook.com/talainsurancegroup"],
  ],
  team: [
    ["victor", null, "Victor Santos", "VP, Corporate Sales"],
    ["melissa", "victor", "Melissa Go", "Sales Director"],
    ["andrea", "melissa", "Andrea Dimaculangan", "Senior Account Manager"],
    ["kevin", "andrea", "Kevin Ramos", "Account Manager"],
    ["joy", "andrea", "Joy Pascual", "Account Manager"],
    ["lea", "andrea", "Lea Domingo", "Sales Coordinator"],
    ["arnel", "victor", "Arnel Cruz", "Underwriting Lead"],
  ],
});
