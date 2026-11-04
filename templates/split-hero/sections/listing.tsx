"use client";

import { Navigation } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { directionsUrl } from "@/lib/api";
import { useCard } from "@/components/card/context";
import { useLabels } from "@/components/card/labels";
import { CardImage } from "@/components/card/primitives";
import { Lightbox, SectionHeading, StyledMap } from "@/components/card/sections";

/** Property-listing album: one large lead photo, then a two-up grid, each with its caption. */
export function ListingAlbum() {
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
  const grid = photos.slice(1, 5);

  const tile = (i: number, aspect: string, sizes: string) => {
    const p = photos[i];
    return (
      <figure className="m-0 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setIndex(i)}
          aria-label={`${L.openPhoto}: ${p.caption || p.alt || `${i + 1}`}`}
          className={`group relative w-full cursor-zoom-in overflow-hidden rounded-[10px] ${aspect}`}
        >
          <CardImage src={p.url} alt={p.alt || ""} sizes={sizes} className="size-full transition-transform duration-500 group-hover:scale-[1.02]" failTone="background" />
        </button>
        {p.caption && <figcaption className="text-[14px] leading-snug text-c-on-bg-muted">{p.caption}</figcaption>}
      </figure>
    );
  };

  return (
    <section aria-labelledby={`${uid}-h`} className="flex flex-col gap-5">
      <SectionHeading tone="background" id={`${uid}-h`} aside={L.photoCount(photos.length)}>
        {L.photos}
      </SectionHeading>
      {tile(0, "aspect-[16/10]", "(min-width: 1024px) 560px, 100vw")}
      {grid.length > 0 && (
        <div className="grid grid-cols-2 gap-x-3 gap-y-5">
          {grid.map((p) => {
            const i = photos.indexOf(p);
            return <div key={p.id}>{tile(i, "aspect-[4/3]", "(min-width: 1024px) 280px, 50vw")}</div>;
          })}
        </div>
      )}
      {photos.length > 1 + grid.length && (
        <button type="button" onClick={() => setIndex(0)} className="cbtn cbtn-secondary h-12 cursor-pointer self-start px-5 text-[15px]">
          {L.seeAll} ({photos.length})
        </button>
      )}
      <Lightbox photos={photos} index={index} onIndexChange={setIndex} />
    </section>
  );
}

/** Address and directions beside the map (stacked on phones). */
export function MapBeside() {
  const { bundle } = useCard();
  const L = useLabels();
  const uid = useId();
  const { card } = bundle;
  if (!card.address?.trim()) return null;
  return (
    <section aria-labelledby={`${uid}-h`} className="flex flex-col gap-4">
      <SectionHeading tone="background" id={`${uid}-h`}>
        {L.lang === "en" ? "Showroom" : L.office}
      </SectionHeading>
      <div className="grid gap-5 @3xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] @3xl:items-stretch">
        <div className="flex flex-col justify-between gap-4 @3xl:order-1">
          <address className="text-[17px] leading-normal text-c-on-bg not-italic">{card.address}</address>
          {card.showDirections && (
            <a href={directionsUrl(card)} target="_blank" rel="noreferrer" className="cbtn cbtn-primary h-12 self-start px-5 text-[15px]">
              <Navigation aria-hidden className="size-4" strokeWidth={2} />
              {L.directions}
            </a>
          )}
        </div>
        <StyledMap tone="background" className="h-52 rounded-[10px] @3xl:order-2 @3xl:h-full @3xl:min-h-56" />
      </div>
    </section>
  );
}
