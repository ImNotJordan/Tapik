import type { CardBundle } from "@/lib/types";
import { preview as bilingual } from "./bilingual/preview";
import { preview as boardroom } from "./boardroom/preview";
import { preview as clinicCalm } from "./clinic-calm/preview";
import { preview as eventPromo } from "./event-promo/preview";
import { preview as faithCommunity } from "./faith-community/preview";
import { preview as folio } from "./folio/preview";
import { preview as galleryWall } from "./gallery-wall/preview";
import { preview as hyacinthExecutive } from "./hyacinth-executive/preview";
import { preview as keepsake } from "./keepsake/preview";
import { preview as landmark } from "./landmark/preview";
import { preview as noirLedger } from "./noir-ledger/preview";
import { preview as placeFirst } from "./place-first/preview";
import { preview as reel } from "./reel/preview";
import { preview as splitHero } from "./split-hero/preview";
import { preview as sunnyCounter } from "./sunny-counter/preview";
import { preview as transit } from "./transit/preview";

/** Template id → the sample card its thumbnail renders. */
export const TEMPLATE_PREVIEWS: Record<string, CardBundle> = {
  keepsake,
  landmark,
  "place-first": placeFirst,
  "noir-ledger": noirLedger,
  "sunny-counter": sunnyCounter,
  reel,
  boardroom,
  "clinic-calm": clinicCalm,
  folio,
  "split-hero": splitHero,
  "gallery-wall": galleryWall,
  "event-promo": eventPromo,
  "faith-community": faithCommunity,
  transit,
  bilingual,
  "hyacinth-executive": hyacinthExecutive,
};

export function getPreview(templateId: string): CardBundle {
  return TEMPLATE_PREVIEWS[templateId] ?? keepsake;
}
