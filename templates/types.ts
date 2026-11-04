import type {
  ButtonFill,
  ButtonShape,
  CardBundle,
  ReorderableSection,
  TemplateCategory,
  ThemeTokens,
} from "@/lib/types";
import type { CardMode } from "@/components/card/context";

export type { TemplateCategory };

export type TemplateTheme = { id: string; name: string; tokens: ThemeTokens };

/**
 * Everything the studio needs to know about a template without rendering it.
 * One manifest per folder in /templates; registry.ts lists them all.
 */
export type TemplateManifest = {
  id: string;
  name: string;
  category: TemplateCategory;
  tags: string[];
  /** One or two sentences for the library panel. */
  description: string;
  bestFor: string;
  /** Google Fonts families. They are loaded in app/fonts.ts and paired in lib/design/fonts.ts. */
  fonts: { heading: string; body: string; mono?: string; accent?: string };
  /** The curated pairing in lib/design/fonts.ts that loads `fonts`. Pinned first in the font picker. */
  fontPairingId: string;
  /** At least three. The first one is the default. */
  themes: TemplateTheme[];
  /** Section order for new cards. Header elements (photo, logo) have fixed positions per template. */
  defaultSectionOrder: ReorderableSection[];
  supports: {
    coverPhoto: boolean;
    orgChartTree: boolean;
    hours?: boolean;
    serviceChips?: boolean;
    serviceAreas?: boolean;
    booking?: boolean;
    /** Booking button with its own label and sub-line (bookingLabel, bookingNote). */
    bookingCta?: boolean;
    /** Industries & expertise chips (expertiseChips). */
    expertiseChips?: boolean;
    /** Tagline under the logo and a tag above the name. */
    taglines?: boolean;
    idCard?: boolean;
    event?: boolean;
  };
  isNew?: boolean;

  /* Engine hints */
  /** What looks different, listed in the apply dialog. */
  traits: string[];
  /** Agent photo shape, used by the photo cropper. */
  photoShape: "rounded-square" | "full-bleed-portrait" | "arch" | "circle" | "square";
  /** Where the accent color sits, and whether it carries text (4.5:1) or only marks (3:1). */
  accent: { on: "surface" | "background" | "primary"; use: "mark" | "text" };
  buttonShape: ButtonShape;
  buttonFill: ButtonFill;
  /** Mock popularity for the "Popular" sort. TODO(backend): count of cards using the template. */
  popularity: number;
  /** ISO date the template was added, for the "Newest" sort. */
  addedAt: string;
};

export type TemplateProps = {
  bundle: CardBundle;
  tokens: ThemeTokens;
  mode: CardMode;
};
