import type { ThemeTokens } from "@/lib/types";
import { luminance } from "@/lib/design/contrast";

/**
 * Hyacinth Industries, LLC brand: the source of truth for the Hyacinth
 * Executive template. Extracted from https://hyacinthindustriesllc.com/
 * (index CSS and the styled-components in the hero bundle) on 2026-11-02.
 *
 * Colors are the official palette confirmed by the brand owner and are fixed.
 * Fonts, radius and button style follow the live site where it differs from
 * the design comp (see SITE_VS_COMP).
 */

/* ------------------------------------------------------------ Palette */

/** Official palette. Use exactly. */
export const PALETTE = {
  primaryBlack: "#080808",
  charcoal: "#232326",
  gold: "#D4AF37",
  red: "#E31B23",
  silver: "#C8CDD3",
  offWhite: "#F7F7F5",
  white: "#FFFFFF",
  mutedGray: "#A1A1AA",
  darkBorder: "#38383D",
} as const;

/**
 * Derived shades the palette rules call for:
 * - redInk: brand red only clears AA on off-white by a hair, so small red text uses this.
 * - inkSecondary / inkTertiary: secondary text on light grounds (gold and muted gray fail there).
 * - redDeep: the darker end of the CTA gradient (only ever darker, so white text stays at 4.7:1 or better).
 */
export const DERIVED = {
  redInk: "#B8141B",
  redDeep: "#C2161D",
  inkSecondary: "#3F3F46",
  inkTertiary: "#52525B",
} as const;

/* -------------------------------------------------------------- Fonts */

/**
 * The site's CSS sets `h1–h6 { font-family: var(--font-heading) }` = Montserrat,
 * the body to Lexend, and `blockquote, q, .accent-text` to Playfair Display.
 * (The live site loads only Lexend and Playfair from Google Fonts, so its
 * headings currently fall back to a system font: worth fixing on the site.)
 */
export const FONTS = {
  heading: { family: "Montserrat", weights: [700, 800], nameTracking: "-0.03em", logoTracking: "0.025em" },
  body: { family: "Lexend", weights: [400, 500, 600] },
  accent: { family: "Playfair Display", use: "quotes and the About lead" },
  /** Eyebrows and section labels: uppercase, wide tracking. */
  label: { size: "0.75rem", weight: 700, tracking: "0.2em" },
  eyebrow: { size: "0.75rem", weight: 600, tracking: "0.08em" },
} as const;

/* -------------------------------------------------------- Shape, motion */

/** Radius scale used on the site: buttons 12, panels 20 (16 on phones), chips 999, icon squares 8, small icon tiles 7. */
export const RADIUS = {
  button: 12,
  panel: 20,
  panelPhone: 16,
  chip: 999,
  iconSquare: 8,
  iconTile: 7,
  photo: 14,
} as const;

/**
 * Primary button: the site's "Book a Strategy Call". A 148° gradient, 12px radius,
 * 54px tall, semibold, an arrow that slides 4px on hover, a red glow and a gold focus ring.
 */
export const BUTTON = {
  gradient: `linear-gradient(148deg, ${PALETTE.red} 0%, ${PALETTE.red} 45%, ${DERIVED.redDeep} 100%)`,
  // The site adds a red glow; the card uses a neutral offset shadow instead (a colored glow on black reads as decoration).
  shadow: "0 1px 2px rgb(0 0 0 / 0.35), 0 8px 18px -8px rgb(0 0 0 / 0.55), inset 0 0 0 1px rgb(255 255 255 / 0.07), inset 0 1px 0 rgb(255 255 255 / 0.11)",
  minHeight: 54,
  focusRing: PALETTE.gold,
} as const;

/** Easing from the site's motion presets. */
export const EASE = { enter: "cubic-bezier(0.22, 1, 0.36, 1)" } as const;

/* -------------------------------------------------------------- Voice */

/** Copy patterns from the site. Headlines are three short imperative clauses; the last one carries the accent. */
export const VOICE = {
  eyebrow: "Fractional Executive Support",
  headline: "Close bigger deals, build stronger brands, execute faster.",
  support: "Senior-level execution support for high-growth teams — without the cost or drag of a full-time hire.",
  proof: "Embedded in your operations. Focused on results across brand, deals, and product.",
  cta: "Book a Strategy Call",
  ctaNote: "30 min · No commitment",
  ctaAside: "See if we’re a fit",
  tagline: "Fractional Executive Services",
  expertise: ["Logistics", "Administrative Support", "Medical Outsourcing", "Marketing", "Web Design", "3D Animation", "General Services"],
} as const;

/* -------------------------------------------------------------- Themes */

export const THEME_TOKENS: Record<"black" | "charcoal" | "light", ThemeTokens> = {
  black: {
    background: PALETTE.primaryBlack,
    onBackground: PALETTE.white,
    surface: PALETTE.offWhite,
    text: PALETTE.primaryBlack,
    primary: PALETTE.red,
    onPrimary: PALETTE.white,
    accent: PALETTE.gold,
  },
  charcoal: {
    background: PALETTE.charcoal,
    onBackground: PALETTE.white,
    surface: PALETTE.offWhite,
    text: PALETTE.primaryBlack,
    primary: PALETTE.red,
    onPrimary: PALETTE.white,
    accent: PALETTE.gold,
  },
  // Gold fails as text on off-white, so the accent text here is the dark red; gold stays on rules and marks.
  light: {
    background: PALETTE.offWhite,
    onBackground: PALETTE.primaryBlack,
    surface: PALETTE.white,
    text: PALETTE.primaryBlack,
    primary: PALETTE.red,
    onPrimary: PALETTE.white,
    accent: DERIVED.redInk,
  },
};

/**
 * Roles the template paints with, beyond the seven theme tokens.
 * Derived from the tokens so the admin's custom colors still work.
 */
export type HyacinthRoles = {
  dark: boolean;
  /** Decoration only: rings, photo frame, sheet edge, team rule, petal mark. */
  gold: string;
  /** Hero media panel and its border. */
  panel: string;
  panelBorder: string;
  /** Secondary text on the hero (title, sub-line). */
  heroMuted: string;
  /** Outline buttons on the hero. */
  heroOutline: string;
  /** Section labels on the light sheet. */
  label: string;
  /** Secondary text on the sheet. */
  sheetMuted: string;
  /** Panels and chips on the sheet, and their borders. */
  card: string;
  cardBorder: string;
  /** Contact icons and the map pin. */
  icon: string;
  /** Social squares. */
  social: string;
};

export function rolesFor(t: ThemeTokens): HyacinthRoles {
  const dark = luminance(t.background) < 0.3;
  const sheetDark = luminance(t.surface) < 0.3;
  return {
    dark,
    gold: PALETTE.gold,
    panel: dark ? (t.background.toUpperCase() === PALETTE.charcoal ? PALETTE.primaryBlack : PALETTE.charcoal) : PALETTE.charcoal,
    panelBorder: PALETTE.darkBorder,
    heroMuted: dark ? PALETTE.silver : DERIVED.inkSecondary,
    heroOutline: dark ? PALETTE.silver : DERIVED.inkTertiary,
    label: sheetDark ? PALETTE.gold : DERIVED.redInk,
    sheetMuted: sheetDark ? PALETTE.silver : DERIVED.inkSecondary,
    card: sheetDark ? PALETTE.charcoal : PALETTE.white,
    cardBorder: sheetDark ? PALETTE.darkBorder : PALETTE.silver,
    icon: sheetDark ? PALETTE.gold : PALETTE.red,
    social: sheetDark ? PALETTE.charcoal : PALETTE.primaryBlack,
  };
}

/**
 * Text pairs the palette rules require beyond the engine's four checks.
 * scripts/check-contrast.ts runs them for every Hyacinth theme.
 */
export function brandContrastPairs(t: ThemeTokens): { label: string; fg: string; bg: string; min: number }[] {
  const r = rolesFor(t);
  return [
    { label: "Accent text (eyebrow, brand line) on hero", fg: t.accent, bg: t.background, min: 4.5 },
    { label: "Hero secondary text on hero", fg: r.heroMuted, bg: t.background, min: 4.5 },
    { label: "Hero outline button border on hero", fg: r.heroOutline, bg: t.background, min: 3 },
    { label: "Section label on sheet", fg: r.label, bg: t.surface, min: 4.5 },
    { label: "Section label on panel", fg: r.label, bg: r.card, min: 4.5 },
    { label: "Secondary text on sheet", fg: r.sheetMuted, bg: t.surface, min: 4.5 },
    { label: "Secondary text on panel", fg: r.sheetMuted, bg: r.card, min: 4.5 },
    { label: "Contact icon on panel", fg: r.icon, bg: r.card, min: 3 },
    { label: "Social icon (white) on square", fg: PALETTE.white, bg: r.social, min: 4.5 },
    { label: "CTA text on red", fg: t.onPrimary, bg: t.primary, min: 4.5 },
    { label: "CTA text on the gradient's dark end", fg: t.onPrimary, bg: DERIVED.redDeep, min: 4.5 },
    { label: "Sticky bar Call button (white on black)", fg: PALETTE.white, bg: PALETTE.primaryBlack, min: 4.5 },
  ];
}

/* ---------------------------------------------------- Site vs the comp */

/** What changed from the design comp because the live site differs. Reported in the build summary. */
export const SITE_VS_COMP = [
  "Fonts: comp Sora + Manrope → site Montserrat (headings, 800, -0.03em on the name) + Lexend (body) + Playfair Display (quotes and the About lead).",
  "Radius: comp sheet ~26px → 20px, the site's largest radius (panels 20, buttons 12, chips 999, icon squares 8).",
  "Primary button: a 148° red gradient (only darkening, so white text stays ≥4.7:1), 12px radius, 54px+ tall, arrow that slides on hover, red glow, gold focus ring.",
  "Eyebrow pill: the site's version, a gold hairline outline with a faint gold fill and a small gold dot.",
  "Hero panel: adds the site's gold corner bracket (top right) next to the comp's rings. The site's grid texture and red glows are left out.",
  "Brand line: the site puts a gold gradient on its accent phrase; the card uses solid gold (solid red-ink on Hyacinth Light).",
  "Section labels: the site's pattern, a short gold rule before uppercase, widely tracked text.",
] as const;
