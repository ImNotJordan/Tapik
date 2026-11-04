"use client";

import { useMemo, useState } from "react";
import type { AlbumPhoto } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useLabels } from "@/components/card/labels";
import { CardImage } from "@/components/card/primitives";
import { Lightbox } from "@/components/card/sections";

/*
 * Hanging plan for ten pictures. Phone: two columns, every third picture full
 * width. Wide (@4xl): three columns on a fixed row height, packed densely.
 */
/** Full width every third picture; a half-width picture left alone at the end goes full width too. */
const PHONE = (i: number, n: number) => (i % 3 === 0 || (i === n - 1 && i % 3 === 1) ? "col-span-2 aspect-[3/2]" : "aspect-[4/5]");
const WIDE = [
  "@4xl:col-span-2 @4xl:row-span-2",
  "@4xl:col-span-1 @4xl:row-span-2",
  "@4xl:col-span-1",
  "@4xl:col-span-1",
  "@4xl:col-span-1 @4xl:row-span-2",
  "@4xl:col-span-2",
  "@4xl:col-span-1 @4xl:row-span-2",
  "@4xl:col-span-2 @4xl:row-span-2",
  "@4xl:col-span-2",
  "@4xl:col-span-1",
];
const MAX = 10;

export function useWallPhotos(photos: AlbumPhoto[]) {
  return useMemo(() => {
    const p = photos.slice();
    const cover = p.findIndex((x) => x.isCover);
    if (cover > 0) p.unshift(...p.splice(cover, 1));
    return p;
  }, [photos]);
}

/** Gallery Wall's hero: the album hung edge to edge. Every picture opens the lightbox. */
export function Wall({ photos }: { photos: AlbumPhoto[] }) {
  const L = useLabels();
  const [index, setIndex] = useState<number | null>(null);
  if (!photos.length) return null;
  const shown = photos.slice(0, MAX);
  const more = photos.length - MAX;

  return (
    <section aria-label={L.photos} className="flex flex-col">
      <ul className="grid grid-cols-2 gap-[3px] @4xl:auto-rows-[clamp(150px,15cqi,240px)] @4xl:grid-flow-dense @4xl:grid-cols-3">
        {shown.map((p, i) => {
          const last = i === shown.length - 1 && more > 0;
          return (
            <li key={p.id} className={cn("relative @4xl:aspect-auto", PHONE(i, shown.length), WIDE[i])}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={last ? `${L.seeAll}: ${L.photoCount(photos.length)}` : `${L.openPhoto}: ${p.caption || p.alt || `${i + 1}`}`}
                className="group absolute inset-0 cursor-zoom-in overflow-hidden bg-c-bg-tint focus-visible:outline-offset-[-3px]"
              >
                <CardImage
                  src={p.url}
                  alt={p.alt || ""}
                  sizes={i % 3 === 0 ? "(min-width: 1024px) 50vw, 100vw" : "(min-width: 1024px) 25vw, 50vw"}
                  priority={i < 3}
                  className="size-full transition-transform duration-700 group-hover:scale-[1.025]"
                  failTone="background"
                />
                {last && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/60 text-2xl font-semibold text-white">+{more}</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      <Lightbox photos={photos} index={index} onIndexChange={setIndex} />
      <div className="flex min-h-12 items-center justify-between gap-3 px-4 text-[13px] text-c-on-bg-muted @4xl:px-0">
        <span className="inline-flex items-center gap-2 tabular-nums">
          <span aria-hidden className="size-2 rounded-full bg-c-accent" />
          {L.photoCount(photos.length)}
        </span>
        <button type="button" onClick={() => setIndex(0)} className="inline-flex h-11 cursor-pointer items-center font-semibold text-c-on-bg underline underline-offset-4">
          {L.seeAll}
        </button>
      </div>
    </section>
  );
}
