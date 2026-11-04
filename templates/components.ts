"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import { CardSkeletonFill } from "@/components/card/card-skeleton";
import type { TemplateProps } from "./types";

/**
 * Template id → its Card component. Each template is its own chunk, so a public
 * card downloads only the template it uses. Server-rendered as usual.
 */
export const TEMPLATE_COMPONENTS: Record<string, ComponentType<TemplateProps>> = {
  keepsake: dynamic(() => import("./keepsake/Card"), { loading: CardSkeletonFill }),
  landmark: dynamic(() => import("./landmark/Card"), { loading: CardSkeletonFill }),
  "place-first": dynamic(() => import("./place-first/Card"), { loading: CardSkeletonFill }),
  "noir-ledger": dynamic(() => import("./noir-ledger/Card"), { loading: CardSkeletonFill }),
  "sunny-counter": dynamic(() => import("./sunny-counter/Card"), { loading: CardSkeletonFill }),
  reel: dynamic(() => import("./reel/Card"), { loading: CardSkeletonFill }),
  boardroom: dynamic(() => import("./boardroom/Card"), { loading: CardSkeletonFill }),
  "clinic-calm": dynamic(() => import("./clinic-calm/Card"), { loading: CardSkeletonFill }),
  folio: dynamic(() => import("./folio/Card"), { loading: CardSkeletonFill }),
  "split-hero": dynamic(() => import("./split-hero/Card"), { loading: CardSkeletonFill }),
  "gallery-wall": dynamic(() => import("./gallery-wall/Card"), { loading: CardSkeletonFill }),
  "event-promo": dynamic(() => import("./event-promo/Card"), { loading: CardSkeletonFill }),
  "faith-community": dynamic(() => import("./faith-community/Card"), { loading: CardSkeletonFill }),
  transit: dynamic(() => import("./transit/Card"), { loading: CardSkeletonFill }),
  bilingual: dynamic(() => import("./bilingual/Card"), { loading: CardSkeletonFill }),
  "hyacinth-executive": dynamic(() => import("./hyacinth-executive/Card"), { loading: CardSkeletonFill }),
};
