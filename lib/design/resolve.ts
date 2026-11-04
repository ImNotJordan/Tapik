import type { CSSProperties } from "react";
import type { Card, ThemeTokens } from "@/lib/types";
import { getTemplate, getTheme } from "@/templates/registry";
import type { TemplateManifest } from "@/templates/types";
import { check, type ContrastCheck } from "./contrast";
import { getFontPairing } from "./fonts";

/**
 * Theme engine: template + theme + custom colors + fonts + button style
 * resolve into one flat set of CSS variables on the card root.
 * Admin changes are token swaps; templates only ever read these variables.
 */
export function resolveTokens(card: Pick<Card, "templateId" | "themeId" | "customTokens">): ThemeTokens {
  const preset = getTheme(card.templateId, card.themeId === "custom" ? undefined : card.themeId);
  return { ...preset.tokens, ...(card.themeId === "custom" ? card.customTokens ?? {} : {}) };
}

const RADIUS: Record<Card["buttonShape"], string> = {
  pill: "999px",
  rounded: "12px",
  square: "2px",
};

export function resolveCardStyle(card: Card): CSSProperties {
  const t = resolveTokens(card);
  const fonts = getFontPairing(card.fontPairingId);
  const overlay = card.overlayOpacity ?? 0.55;

  return {
    "--c-bg": t.background,
    "--c-on-bg": t.onBackground,
    "--c-on-bg-muted": `color-mix(in oklab, ${t.onBackground} 80%, ${t.background})`,
    "--c-bg-line": `color-mix(in oklab, ${t.onBackground} 24%, ${t.background})`,
    "--c-bg-tint": `color-mix(in oklab, ${t.onBackground} 9%, ${t.background})`,
    "--c-surface": t.surface,
    "--c-text": t.text,
    "--c-text-muted": `color-mix(in oklab, ${t.text} 80%, ${t.surface})`,
    "--c-line": `color-mix(in oklab, ${t.text} 17%, ${t.surface})`,
    "--c-surface-tint": `color-mix(in oklab, ${t.text} 6%, ${t.surface})`,
    "--c-primary": t.primary,
    "--c-on-primary": t.onPrimary,
    "--c-accent": t.accent,
    "--c-font-display": fonts.display,
    "--c-font-body": fonts.body,
    "--c-font-mono": fonts.mono ?? fonts.body,
    "--c-font-accent": fonts.accent ?? fonts.display,
    "--c-display-weight": String(fonts.displayWeight),
    "--c-display-tracking": fonts.displayTracking,
    "--c-btn-radius": RADIUS[card.buttonShape],
    "--c-overlay": String(overlay),
    colorScheme: "normal",
  } as CSSProperties;
}

/** The ground the accent sits on in a template, for contrast checks and swatches. */
export function accentGround(tpl: TemplateManifest, t: ThemeTokens): string {
  return tpl.accent.on === "surface" ? t.surface : tpl.accent.on === "primary" ? t.primary : t.background;
}

/** Contrast pairs every theme must pass (WCAG 2.2 AA). Used by the color editor and scripts/check-contrast.ts. */
export function themeChecks(tpl: TemplateManifest, t: ThemeTokens): ContrastCheck[] {
  const where = tpl.accent.on === "primary" ? "buttons and bands" : tpl.accent.on;
  return [
    check("onBackground", "Text on background", t.onBackground, t.background, 4.5),
    check("text", "Text on surface", t.text, t.surface, 4.5),
    check("onPrimary", "Button text on primary", t.onPrimary, t.primary, 4.5),
    check("accent", `Accent on ${where}`, t.accent, accentGround(tpl, t), tpl.accent.use === "text" ? 4.5 : 3),
  ];
}

export function contrastChecks(card: Pick<Card, "templateId" | "themeId" | "customTokens">): ContrastCheck[] {
  return themeChecks(getTemplate(card.templateId), resolveTokens(card));
}
