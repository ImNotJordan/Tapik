"use client";

import { useId } from "react";
import { useServiceAreas } from "@/components/card/extras";
import { useLabels } from "@/components/card/labels";
import { SectionHeading } from "@/components/card/sections";
import { cn } from "@/lib/utils";

/** Service areas drawn as stops along one route line: terminals filled, stops hollow. */
export function ServiceRoute({ className }: { className?: string }) {
  const areas = useServiceAreas();
  const L = useLabels();
  const id = useId();
  if (!areas.length) return null;
  return (
    <section aria-labelledby={id} className={cn("flex flex-col gap-4", className)}>
      <SectionHeading tone="background" id={id} aside={`${areas.length}`}>
        {L.serviceAreas}
      </SectionHeading>
      <ol className="relative flex flex-col">
        <span aria-hidden className="absolute top-[26px] bottom-[26px] left-[14px] w-1 bg-c-on-bg" />
        {areas.map((a, i) => {
          const terminal = i === 0 || i === areas.length - 1;
          return (
            <li key={`${a}-${i}`} className="relative flex min-h-[52px] items-center gap-4">
              <span
                aria-hidden
                className={cn("relative z-10 size-8 shrink-0 rounded-full border-[5px] border-c-on-bg", terminal ? "bg-c-on-bg" : "bg-c-bg")}
              />
              <span className="flex min-w-0 flex-1 items-baseline justify-between gap-3 border-b border-c-bg-line py-2">
                <span className="card-display text-[1.35rem] leading-tight uppercase">{a}</span>
                <span aria-hidden className="shrink-0 font-[family-name:var(--c-font-mono)] text-xs text-c-on-bg-muted">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
