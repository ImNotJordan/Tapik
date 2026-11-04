/** WCAG 2.x contrast helpers. */

export function parseHex(hex: string): [number, number, number] | null {
  const m = hex.trim().replace(/^#/, "");
  const full = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as [number, number, number];
}

export function isHex(value: string): boolean {
  return parseHex(value) !== null;
}

function channel(c: number) {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

export function luminance(hex: string): number {
  const rgb = parseHex(hex);
  if (!rgb) return 0;
  const [r, g, b] = rgb.map(channel);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Pick whichever of two candidates reads better on `bg`. */
export function bestOn(bg: string, light = "#FFFFFF", dark = "#111111"): string {
  return contrastRatio(bg, light) >= contrastRatio(bg, dark) ? light : dark;
}

export function formatRatio(r: number): string {
  return `${(Math.floor(r * 10) / 10).toFixed(1)}:1`;
}

export type ContrastCheck = {
  id: string;
  label: string;
  fg: string;
  bg: string;
  ratio: number;
  /** 4.5 for text, 3 for large text and graphics. */
  required: number;
  passes: boolean;
};

export function check(id: string, label: string, fg: string, bg: string, required: number): ContrastCheck {
  const ratio = contrastRatio(fg, bg);
  return { id, label, fg, bg, ratio, required, passes: ratio >= required };
}
