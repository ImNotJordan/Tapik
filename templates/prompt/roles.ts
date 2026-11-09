import { contrastRatio, parseHex } from "@/lib/design/contrast";
import type { ThemeTokens } from "@/lib/types";

/*
 * Prompt's derived colors. Every role is a color-mix of two theme tokens,
 * with the mix chosen from the tokens so the pair it is read against passes
 * WCAG AA in every theme, custom colors included. Card.tsx only receives
 * `color-mix(...)` strings over the CSS variables, never a hex value.
 */

type RGB = [number, number, number];

const toLin = (c: number) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
};
const fromLin = (c: number) => {
  const s = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  return Math.round(Math.min(1, Math.max(0, s)) * 255);
};

function toOklab([r, g, b]: RGB): RGB {
  const [lr, lg, lb] = [toLin(r), toLin(g), toLin(b)];
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function fromOklab([L, a, b]: RGB): RGB {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    fromLin(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    fromLin(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    fromLin(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

const hex = (c: RGB) => `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;

/** `color-mix(in oklab, a p%, b)` computed in JS, as hex, for contrast checks. */
export function mixHex(a: string, b: string, p: number): string {
  const A = parseHex(a);
  const B = parseHex(b);
  if (!A || !B) return a;
  const la = toOklab(A);
  const lb = toOklab(B);
  const t = p / 100;
  return hex(fromOklab([0, 1, 2].map((i) => la[i] * t + lb[i] * (1 - t)) as RGB));
}

/**
 * The largest share of `fg` (100, 96, 92 …) mixed toward `toward` whose result
 * reads at `min` against every color in `against`. Falls back to `toward`.
 */
function strongestMix(fg: string, toward: string, against: string[], min: number, margin = 0.08): number {
  for (let p = 100; p >= 0; p -= 4) {
    const c = mixHex(fg, toward, p);
    if (against.every((bg) => contrastRatio(c, bg) >= min + margin)) return p;
  }
  return 0;
}

/** As above, but the mixed color is the ground and `text` must read on it. */
function groundMix(fg: string, toward: string, text: string, min: number, margin = 0.08): number {
  for (let p = 100; p >= 0; p -= 4) {
    if (contrastRatio(text, mixHex(fg, toward, p)) >= min + margin) return p;
  }
  return 0;
}

const VAR = { bg: "var(--c-bg)", onBg: "var(--c-on-bg)", surface: "var(--c-surface)", accent: "var(--c-accent)", primary: "var(--c-primary)" };
const mix = (a: string, p: number, b: string) => (p >= 100 ? a : `color-mix(in oklab, ${a} ${p}%, ${b})`);

export type PromptRoles = {
  /** Client's chat bubble: the accent, darkened toward the ground until the page ink reads on it (4.5:1). */
  bubble: string;
  /** Accent as text (the `//` of headings, chat handles): 4.5:1 on ground and surface. */
  accentInk: string;
  /** Primary as text (the Deployed line, the quote's last phrase): 4.5:1 on ground and surface. */
  primaryInk: string;
  /** Quiet separators between surfaces. Decorative, never the only cue. */
  border: string;
  /** For the contrast report. */
  pairs: { label: string; fg: string; bg: string; min: number }[];
};

export function promptRoles(t: ThemeTokens): PromptRoles {
  const bubbleP = groundMix(t.accent, t.background, t.onBackground, 4.5);
  const accentP = strongestMix(t.accent, t.onBackground, [t.background, t.surface], 4.5);
  const primaryP = strongestMix(t.primary, t.onBackground, [t.background, t.surface], 4.5);
  const bubbleHex = mixHex(t.accent, t.background, bubbleP);
  const accentHex = mixHex(t.accent, t.onBackground, accentP);
  const primaryHex = mixHex(t.primary, t.onBackground, primaryP);
  return {
    bubble: mix(VAR.accent, bubbleP, VAR.bg),
    accentInk: mix(VAR.accent, accentP, VAR.onBg),
    primaryInk: mix(VAR.primary, primaryP, VAR.onBg),
    border: `color-mix(in oklab, ${VAR.onBg} 13%, ${VAR.surface})`,
    pairs: [
      { label: "Bubble text on the client bubble", fg: t.onBackground, bg: bubbleHex, min: 4.5 },
      { label: "Accent ink on ground", fg: accentHex, bg: t.background, min: 4.5 },
      { label: "Accent ink on surface", fg: accentHex, bg: t.surface, min: 4.5 },
      { label: "Primary ink on ground", fg: primaryHex, bg: t.background, min: 4.5 },
      { label: "Primary ink on surface", fg: primaryHex, bg: t.surface, min: 4.5 },
      { label: "Muted ink on surface", fg: mixHex(t.text, t.surface, 80), bg: t.surface, min: 4.5 },
      { label: "Photo border (accent) on ground", fg: t.accent, bg: t.background, min: 3 },
    ],
  };
}

/** Extra pairs for scripts/check-contrast.ts (same shape as Hyacinth's brandContrastPairs). */
export const promptContrastPairs = (t: ThemeTokens) => promptRoles(t).pairs;
