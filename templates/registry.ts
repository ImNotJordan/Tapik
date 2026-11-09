import type { ButtonFill, ButtonShape, LibrarySettings, SavedTemplate, ThemeTokens } from "@/lib/types";
import type { TemplateCategory, TemplateManifest, TemplateTheme } from "./types";
import { manifest as bilingual } from "./bilingual/manifest";
import { manifest as boardroom } from "./boardroom/manifest";
import { manifest as clinicCalm } from "./clinic-calm/manifest";
import { manifest as eventPromo } from "./event-promo/manifest";
import { manifest as faithCommunity } from "./faith-community/manifest";
import { manifest as folio } from "./folio/manifest";
import { manifest as galleryWall } from "./gallery-wall/manifest";
import { manifest as hyacinthExecutive } from "./hyacinth-executive/manifest";
import { manifest as keepsake } from "./keepsake/manifest";
import { manifest as landmark } from "./landmark/manifest";
import { manifest as noirLedger } from "./noir-ledger/manifest";
import { manifest as placeFirst } from "./place-first/manifest";
import { manifest as reel } from "./reel/manifest";
import { manifest as splitHero } from "./split-hero/manifest";
import { manifest as sunnyCounter } from "./sunny-counter/manifest";
import { manifest as transit } from "./transit/manifest";
import { manifest as dispatch } from "./dispatch/manifest";
import { manifest as mosaic } from "./mosaic/manifest";
import { manifest as openingNight } from "./opening-night/manifest";
import { manifest as dalawangWika } from "./dalawang-wika/manifest";
import { manifest as blueprint } from "./blueprint/manifest";
import { manifest as prompt } from "./prompt/manifest";
import { manifest as commit } from "./commit/manifest";

/**
 * Single source of truth for templates. To add one: create /templates/<id>/
 * with manifest.ts, Card.tsx and preview.ts, then add it here and in
 * components.ts and previews.ts.
 */
export const TEMPLATES: TemplateManifest[] = [
  keepsake,
  landmark,
  placeFirst,
  noirLedger,
  sunnyCounter,
  reel,
  boardroom,
  clinicCalm,
  folio,
  splitHero,
  galleryWall,
  eventPromo,
  faithCommunity,
  transit,
  bilingual,
  hyacinthExecutive,
  dispatch,
  mosaic,
  openingNight,
  dalawangWika,
  blueprint,
  prompt,
  commit,
];

export const DEFAULT_TEMPLATE_ID = keepsake.id;

export const CATEGORIES: TemplateCategory[] = ["Real estate", "Personal brand", "Corporate", "Local business", "Creative", "Professional"];

/** Ids used before the template library existed. */
export const LEGACY_TEMPLATE_IDS: Record<string, string> = { card: "keepsake", place: "place-first" };

const BY_ID = new Map(TEMPLATES.map((t) => [t.id, t]));

export function getTemplate(id: string | undefined): TemplateManifest {
  if (!id) return keepsake;
  return BY_ID.get(id) ?? BY_ID.get(LEGACY_TEMPLATE_IDS[id] ?? "") ?? keepsake;
}

export function hasTemplate(id: string): boolean {
  return BY_ID.has(id);
}

export function defaultTheme(t: TemplateManifest): TemplateTheme {
  return t.themes[0];
}

/** The template's theme by id, falling back to its default. */
export function getTheme(templateId: string, themeId: string | undefined): TemplateTheme {
  const t = getTemplate(templateId);
  return t.themes.find((th) => th.id === themeId) ?? defaultTheme(t);
}

/** Design settings a card takes from a template when it is applied. */
export type TemplateLook = {
  templateId: string;
  themeId: string;
  customTokens?: Partial<ThemeTokens>;
  fontPairingId: string;
  buttonShape: ButtonShape;
  buttonFill: ButtonFill;
};

export function lookFor(t: TemplateManifest, themeId?: string): TemplateLook {
  return {
    templateId: t.id,
    themeId: t.themes.some((th) => th.id === themeId) ? themeId! : defaultTheme(t).id,
    customTokens: undefined,
    fontPairingId: t.fontPairingId,
    buttonShape: t.buttonShape,
    buttonFill: t.buttonFill,
  };
}

export function lookForSaved(s: SavedTemplate): TemplateLook {
  return {
    templateId: s.baseId,
    themeId: s.themeId,
    customTokens: s.customTokens,
    fontPairingId: s.fontPairingId,
    buttonShape: s.buttonShape,
    buttonFill: s.buttonFill,
  };
}

/** Templates the admin allows for new choices. A card's current template always stays listed. */
export function availableTemplates(lib: LibrarySettings, keep?: string): TemplateManifest[] {
  return TEMPLATES.filter((t) => t.id === keep || !lib.disabledTemplates.includes(t.id));
}
