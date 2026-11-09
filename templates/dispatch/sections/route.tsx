"use client";

import { Navigation, Truck } from "lucide-react";
import { useId } from "react";
import { directionsUrl } from "@/lib/services/card-utils";
import { useCard } from "@/components/card/context";
import { useLabels } from "@/components/card/labels";
import { SectionHeading, StyledMap } from "@/components/card/sections";

/**
 * The yard on the map. A dashed signal line runs from Yard to Port above it
 * (decorative: the address below carries the meaning), then the live map,
 * the address and Directions.
 */
export function RouteMap() {
  const { bundle } = useCard();
  const L = useLabels();
  const uid = useId();
  const c = bundle.card;
  if (!c.address?.trim()) return null;
  return (
    <section aria-labelledby={`${uid}-h`} className="flex flex-col gap-4">
      <SectionHeading tone="background" id={`${uid}-h`}>
        {L.findUs}
      </SectionHeading>

      <div aria-hidden className="flex items-center gap-3 pt-1">
        <span className="card-display text-[15px] leading-none uppercase">Yard</span>
        <span className="relative flex h-6 flex-1 items-center">
          <span className="w-full border-t-[3px] border-dashed border-c-accent" />
          <span className="dp-truck absolute left-[18%] flex h-6 items-center bg-c-bg px-1.5 text-c-accent">
            <Truck className="size-5" strokeWidth={2.25} />
          </span>
          <span className="absolute right-0 size-2.5 bg-c-accent" />
        </span>
        <span className="card-display text-[15px] leading-none uppercase">Port</span>
      </div>

      <StyledMap tone="background" className="h-48 rounded-[4px] @3xl:h-60" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <address className="max-w-[34ch] text-[15px] leading-normal text-[var(--dp-muted)] not-italic">{c.address}</address>
        {c.showDirections && (
          <a href={directionsUrl(c)} target="_blank" rel="noreferrer" className="cbtn cbtn-secondary h-11 px-4 text-[15px]">
            <Navigation aria-hidden className="size-4 text-c-accent" strokeWidth={2.25} />
            {L.directions}
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        )}
      </div>
    </section>
  );
}
