import {
  Alegreya,
  Alegreya_Sans,
  Anton,
  Barlow,
  Barlow_Condensed,
  Big_Shoulders,
  Bitter,
  Bricolage_Grotesque,
  DM_Mono,
  DM_Sans,
  Familjen_Grotesk,
  Figtree,
  Geist,
  Hedvig_Letters_Serif,
  IBM_Plex_Mono,
  IBM_Plex_Sans,
  JetBrains_Mono,
  Karla,
  Lexend,
  Lora,
  Montserrat,
  Newsreader,
  Playfair_Display,
  Onest,
  Public_Sans,
  Work_Sans,
  Cormorant_Garamond,
  Unbounded,
  Outfit,
  Plus_Jakarta_Sans,
  Space_Grotesk,
  Geist_Mono,
  Fira_Code,
  Albert_Sans,
  Atkinson_Hyperlegible_Next,
  Archivo,
  Bodoni_Moda,
  Gloock,
  Hanken_Grotesk,
  Instrument_Sans,
  Instrument_Serif,
  Jost,
  Schibsted_Grotesk,
  Young_Serif,
} from "next/font/google";

/* Studio UI face: designed for legibility at small sizes, which suits a form-heavy tool. */
export const atkinson = Atkinson_Hyperlegible_Next({
  subsets: ["latin"],
  variable: "--font-atkinson",
  display: "swap",
  // next/font has no metric overrides for this family yet; use an explicit fallback stack instead.
  adjustFontFallback: false,
  fallback: ["Segoe UI", "system-ui", "sans-serif"],
});

/* Body face of the "Gallery" card pairing. */
export const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument-sans",
  display: "swap",
  preload: false,
});

/* Default card pairing ("Printed card"): preloaded because Keepsake is the default template. */
export const youngSerif = Young_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-young-serif",
  display: "swap",
});
export const hankenGrotesk = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-hanken",
  display: "swap",
});

/* Other card pairings: declared once, fetched only when a card uses them. */
export const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  axes: ["wdth"],
  style: ["normal", "italic"],
  display: "swap",
  preload: false,
});
export const gloock = Gloock({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-gloock",
  display: "swap",
  preload: false,
});
export const albertSans = Albert_Sans({
  subsets: ["latin"],
  variable: "--font-albert",
  display: "swap",
  preload: false,
});
export const bodoniModa = Bodoni_Moda({
  subsets: ["latin"],
  variable: "--font-bodoni",
  axes: ["opsz"],
  display: "swap",
  preload: false,
});
export const jost = Jost({
  subsets: ["latin"],
  variable: "--font-jost",
  display: "swap",
  preload: false,
});
export const schibstedGrotesk = Schibsted_Grotesk({
  subsets: ["latin"],
  variable: "--font-schibsted",
  display: "swap",
  preload: false,
});
export const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
  preload: false,
});

/* Template library faces (templates D–O). Never preloaded: a card downloads only its own pairing. */
export const geist = Geist({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-geist" });
export const bricolage = Bricolage_Grotesque({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-bricolage", axes: ["opsz", "wdth"] });
export const anton = Anton({ subsets: ["latin"], display: "swap", preload: false, weight: "400", variable: "--font-anton" });
export const dmSans = DM_Sans({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-dm-sans" });
export const dmMono = DM_Mono({ subsets: ["latin"], display: "swap", preload: false, weight: ["400", "500"], variable: "--font-dm-mono" });
export const plexSans = IBM_Plex_Sans({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-plex-sans" });
export const plexMono = IBM_Plex_Mono({ subsets: ["latin"], display: "swap", preload: false, weight: ["400", "500", "600"], variable: "--font-plex-mono" });
export const lora = Lora({ subsets: ["latin"], display: "swap", preload: false, style: ["normal", "italic"], variable: "--font-lora" });
export const figtree = Figtree({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-figtree" });
export const newsreader = Newsreader({ subsets: ["latin"], display: "swap", preload: false, style: ["normal", "italic"], axes: ["opsz"], variable: "--font-newsreader" });
export const publicSans = Public_Sans({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-public-sans" });
export const hedvig = Hedvig_Letters_Serif({ subsets: ["latin"], display: "swap", preload: false, axes: ["opsz"], variable: "--font-hedvig" });
export const onest = Onest({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-onest" });
export const familjen = Familjen_Grotesk({ subsets: ["latin"], display: "swap", preload: false, style: ["normal", "italic"], variable: "--font-familjen" });
export const bigShoulders = Big_Shoulders({ subsets: ["latin"], display: "swap", preload: false, axes: ["opsz"], variable: "--font-big-shoulders", adjustFontFallback: false, fallback: ["Impact", "Arial Narrow", "sans-serif"] });
export const workSans = Work_Sans({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-work-sans" });
export const alegreya = Alegreya({ subsets: ["latin"], display: "swap", preload: false, style: ["normal", "italic"], variable: "--font-alegreya" });
export const alegreyaSans = Alegreya_Sans({ subsets: ["latin"], display: "swap", preload: false, weight: ["400", "500", "700", "800"], variable: "--font-alegreya-sans" });
export const barlowCondensed = Barlow_Condensed({ subsets: ["latin"], display: "swap", preload: false, weight: ["500", "600", "700", "800"], variable: "--font-barlow-condensed" });
export const barlow = Barlow({ subsets: ["latin"], display: "swap", preload: false, weight: ["400", "500", "600", "700"], variable: "--font-barlow" });
export const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-jetbrains" });
export const bitter = Bitter({ subsets: ["latin"], display: "swap", preload: false, style: ["normal", "italic"], variable: "--font-bitter" });
/* Hyacinth Executive: the brand's own faces (hyacinthindustriesllc.com). */
export const montserrat = Montserrat({ subsets: ["latin"], display: "swap", preload: false, weight: ["700", "800"], variable: "--font-montserrat" });
export const lexend = Lexend({ subsets: ["latin"], display: "swap", preload: false, weight: ["400", "500", "600", "700"], variable: "--font-lexend" });
export const playfair = Playfair_Display({ subsets: ["latin"], display: "swap", preload: false, style: ["normal", "italic"], weight: ["400", "500"], variable: "--font-playfair" });
/* Templates K–Q (2026-11). */
export const cormorant = Cormorant_Garamond({ subsets: ["latin"], display: "swap", preload: false, style: ["normal", "italic"], weight: ["500", "600", "700"], variable: "--font-cormorant" });
export const unbounded = Unbounded({ subsets: ["latin"], display: "swap", preload: false, weight: ["500", "700", "800"], variable: "--font-unbounded" });
export const outfit = Outfit({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-outfit" });
export const plusJakarta = Plus_Jakarta_Sans({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-plus-jakarta" });
export const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-space-grotesk" });
export const geistMono = Geist_Mono({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-geist-mono" });
export const firaCode = Fira_Code({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-fira-code" });
export const karla = Karla({ subsets: ["latin"], display: "swap", preload: false, variable: "--font-karla" });

export const fontVariables = [
  atkinson,
  instrumentSans,
  youngSerif,
  hankenGrotesk,
  archivo,
  gloock,
  albertSans,
  bodoniModa,
  jost,
  schibstedGrotesk,
  instrumentSerif,
  geist,
  bricolage,
  anton,
  dmSans,
  dmMono,
  plexSans,
  plexMono,
  lora,
  figtree,
  newsreader,
  publicSans,
  hedvig,
  onest,
  familjen,
  bigShoulders,
  workSans,
  alegreya,
  alegreyaSans,
  barlowCondensed,
  barlow,
  jetbrainsMono,
  bitter,
  karla,
  montserrat,
  lexend,
  playfair,
  cormorant,
  unbounded,
  outfit,
  plusJakarta,
  spaceGrotesk,
  geistMono,
  firaCode,
]
  .map((f) => f.variable)
  .join(" ");
