import { makePreview } from "../preview-kit";
import { manifest } from "./manifest";

/**
 * Amihan Ferrer, a weaver in Vigan who sells inabel from her own studio.
 * The cloth "photos" are local SVG stand-ins (public/mock/mosaic): woven
 * patterns, no people.
 */
const base = makePreview(manifest, {
  name: "Amihan Ferrer",
  title: "Weaver & Founder",
  company: "Habi Loom Studio",
  quote: "Inabel is counted by hand, one pass of the shuttle at a time. I would rather weave fewer pieces and have them last a lifetime.",
  description:
    "Habi Loom Studio is a four-loom workshop on Plaridel Street in Vigan, weaving inabel the Ilocano way: cotton on wooden floor looms, patterns counted by hand. We make blankets, table runners, napkins and throws in binakol, pinilian and abel checks.\n\nOrders are made to your size and colors and ship anywhere in the Philippines in three to five weeks. Visitors are welcome at the studio on weekdays; message ahead and we will have a loom running.",
  bookingUrl: "https://habiloom.ph/order",
  bookingNote: "Made to order, ships in 3 to 5 weeks",
  phone: "+63 917 555 0163",
  messageChannel: "messenger",
  messageTarget: "habiloomstudio",
  email: "amihan@habiloom.ph",
  address: "18 Plaridel Street, Vigan City, Ilocos Sur",
  mapLat: 17.5747,
  mapLng: 120.3869,
  logoUrl: "/mock/mosaic/logo.svg",
  logoAlt: "Habi Loom Studio",
  backgroundPhotoUrl: "/mock/mosaic/binakol-indigo.svg",
  backgroundPhotoAlt: "Indigo and white binakol weave",
  photoSet: "mosaic",
  album: [
    ["pinilian-blanket.svg", "Pinilian blanket, queen size", "Ecru blanket with rows of red diamonds"],
    ["runner-stripes.svg", "Table runner, indigo stripe", "Striped table runner in indigo, oat and charcoal"],
    ["warp-on-the-loom.svg", "A new warp on the floor loom", "Warp threads stretched on a floor loom above finished cloth"],
    ["twill-throw.svg", "Twill throw with hand-knotted fringe", "Brown twill throw with a knotted fringe"],
    ["abel-checks.svg", "Abel checks, by the meter", "Indigo and white checked cloth"],
    ["dye-tests.svg", "Indigo and madder dye tests", "Swatches of indigo and madder dye from light to dark"],
    ["kusikus-napkins.svg", "Kusikus napkins, set of six", "Brown and oat napkins in a nested-square weave"],
    ["lattice-charcoal.svg", "Charcoal lattice shawl", "Charcoal cloth with a fine ecru diamond lattice"],
  ],
  links: [
    ["instagram", "https://instagram.com/habiloomstudio"],
    ["facebook", "https://facebook.com/habiloomstudio/shop", "Facebook Shop"],
    ["website", "https://habiloom.ph", "habiloom.ph"],
  ],
  team: [
    ["lourdes", null, "Lourdes Pascua", "Master weaver"],
    ["benjie", null, "Benjie Rabanal", "Warping & looms"],
    ["carmina", null, "Carmina Ferrer", "Orders & shipping"],
  ],
});

/** Plate tags: what a buyer needs to know about each piece. */
const TAGS = ["Made to order", "Ready to ship", "In the studio", "Ready to ship", "By the meter", "In the studio", "Made to order", "2 left"];

export const preview = { ...base, photos: base.photos.map((p, i) => ({ ...p, tag: TAGS[i] })) };
