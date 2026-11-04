"use client";

import { useId, useMemo, useState } from "react";
import { useCard } from "@/components/card/context";
import { useLabels } from "@/components/card/labels";
import { CardImage } from "@/components/card/primitives";
import { Lightbox, SectionHeading } from "@/components/card/sections";

/** A row of sprocket holes, drawn in the page ground so the strip reads as film. */
function Sprockets() {
  return (
    <span
      aria-hidden
      className="block h-2.5 w-full"
      style={{ background: "repeating-linear-gradient(90deg, transparent 0 7px, var(--c-bg) 7px 19px, transparent 19px 26px)" }}
    />
  );
}

/**
 * Reel's album: a horizontal film strip. Each frame is a button that opens the
 * shared lightbox; the strip scrolls sideways (snap) and every frame is in tab order.
 */
export function FilmStrip() {
  const { bundle } = useCard();
  const L = useLabels();
  const uid = useId();
  const [index, setIndex] = useState<number | null>(null);
  const photos = useMemo(() => {
    const p = bundle.photos.slice();
    const cover = p.findIndex((x) => x.isCover);
    if (cover > 0) p.unshift(...p.splice(cover, 1));
    return p;
  }, [bundle.photos]);
  if (!photos.length) return null;

  return (
    <section aria-labelledby={`${uid}-h`} className="flex flex-col gap-5">
      <SectionHeading tone="background" id={`${uid}-h`} aside={L.photoCount(photos.length)}>
        {L.photos}
      </SectionHeading>
      <ul className="-mx-5 flex snap-x snap-mandatory gap-0 overflow-x-auto scroll-px-5 px-5 [scrollbar-width:none] @4xl:mx-0 @4xl:scroll-px-0 @4xl:px-0">
        {photos.map((p, i) => (
          <li key={p.id} className="flex w-[min(74cqi,380px)] shrink-0 snap-start flex-col gap-2 bg-c-surface px-1.5 py-2 first:pl-2.5 last:pr-2.5">
            <Sprockets />
            <button
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`${L.openPhoto} ${L.nOfM(i + 1, photos.length)}: ${p.caption || p.alt || ""}`}
              className="group relative aspect-[3/2] w-full cursor-zoom-in overflow-hidden focus-visible:outline-offset-[-3px]"
            >
              <CardImage src={p.url} alt={p.alt || ""} sizes="(min-width: 1024px) 380px, 74vw" className="size-full transition-transform duration-500 group-hover:scale-[1.03]" failTone="surface" />
            </button>
            <Sprockets />
            <p className="flex gap-2 px-0.5 pb-1 text-[12px] leading-snug text-c-text-muted [font-family:var(--c-font-mono)]">
              <span className="shrink-0 text-c-accent tabular-nums">{String(i + 1).padStart(2, "0")}</span>
              <span className="line-clamp-2">{p.caption}</span>
            </p>
          </li>
        ))}
      </ul>
      <Lightbox photos={photos} index={index} onIndexChange={setIndex} />
    </section>
  );
}
