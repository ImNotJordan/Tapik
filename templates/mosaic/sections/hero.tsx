"use client";

import { useId, useMemo, useState, type CSSProperties } from "react";
import type { AlbumPhoto } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ShareButton } from "@/components/card/actions";
import { useCard } from "@/components/card/context";
import { useLabels } from "@/components/card/labels";
import { CardImage, Logo } from "@/components/card/primitives";
import { Lightbox } from "@/components/card/sections";

/** Album photos, cover first (the order the album and lightbox use everywhere). */
export function useAlbum(): AlbumPhoto[] {
  const { bundle } = useCard();
  return useMemo(() => {
    const p = bundle.photos.slice();
    const cover = p.findIndex((x) => x.isCover);
    if (cover > 0) p.unshift(...p.splice(cover, 1));
    return p;
  }, [bundle.photos]);
}

/**
 * The mosaic's pictures: the cover photo, then the album (unless the admin hid
 * either). The lightbox opened from the mosaic walks through all of them.
 */
export function useMosaicPhotos(): AlbumPhoto[] {
  const { bundle, isHidden } = useCard();
  const album = useAlbum();
  const c = bundle.card;
  return useMemo(() => {
    const list: AlbumPhoto[] = [];
    if (c.backgroundPhotoUrl && !isHidden("backgroundPhoto")) {
      list.push({ id: `${c.id}-cover`, cardId: c.id, url: c.backgroundPhotoUrl, alt: c.backgroundPhotoAlt, position: -1, isCover: true, created_at: c.created_at });
    }
    if (!isHidden("photos")) list.push(...album);
    return list;
  }, [c.backgroundPhotoUrl, c.backgroundPhotoAlt, c.id, c.created_at, album, isHidden]);
}

/*
 * Hanging plans by count, three columns. The first picture always takes the
 * two-column block; the grid's aspect ratio sets the height on phones, and on
 * wide screens the rows share the full height of the panel.
 */
const PLANS: Record<number, { areas: string; aspect: string }> = {
  1: { areas: `"a a a"`, aspect: "4 / 3" },
  2: { areas: `"a a b"`, aspect: "3 / 2" },
  3: { areas: `"a a b" "a a c"`, aspect: "3 / 2" },
  4: { areas: `"a a b" "c d b"`, aspect: "3 / 2" },
  5: { areas: `"a a b" "a a c" "d e e"`, aspect: "10 / 9" },
  6: { areas: `"a a b" "a a c" "d e f"`, aspect: "10 / 9" },
};
const AREA = "abcdef";

/** Hero: the work first. A photo mosaic with the label pill and Share over it; a woven band when there are no photos. */
export function MosaicHero({ ground, photos }: { ground: string; photos: AlbumPhoto[] }) {
  const { bundle, isHidden, mode } = useCard();
  const L = useLabels();
  const [index, setIndex] = useState<number | null>(null);
  const c = bundle.card;
  const shown = photos.slice(0, 6);
  const plan = PLANS[shown.length];
  const hasLabel = !isHidden("logo") && !!(c.logoUrl || c.logoDarkUrl || c.company);
  const animate = mode !== "thumbnail";

  return (
    <div className="relative @4xl:h-full">
      {plan ? (
        <ul
          aria-label={L.photos}
          className="grid aspect-[var(--mo-aspect)] grid-cols-3 gap-[3px] [grid-auto-rows:minmax(0,1fr)] @4xl:aspect-auto @4xl:h-full @4xl:gap-1"
          style={{ gridTemplateAreas: plan.areas, "--mo-aspect": plan.aspect } as CSSProperties}
        >
          {shown.map((p, i) => (
            <li key={p.id} className="relative min-h-0 overflow-hidden bg-c-surface" style={{ gridArea: AREA[i] }}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`${L.openPhoto}: ${p.caption || p.alt || L.nOfM(i + 1, photos.length)}`}
                className="group absolute inset-0 cursor-zoom-in focus-visible:outline-none"
              >
                <div className={cn("absolute inset-0", animate && "motion-photo-settle")} style={animate ? { animationDelay: `${i * 70}ms` } : undefined}>
                  <CardImage
                    src={p.url}
                    alt={p.alt || ""}
                    sizes={i === 0 ? "(min-width: 1024px) 40vw, 67vw" : "(min-width: 1024px) 20vw, 34vw"}
                    priority={i < 3}
                    focal={p.position === -1 ? c.backgroundFocalPoint : undefined}
                    className="size-full transition-transform duration-700 [transition-timing-function:var(--ease-out-expo)] group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                    failTone="background"
                  />
                </div>
                {/* Focus ring that reads on any photo: ink outside, white inside. */}
                <span aria-hidden className="pointer-events-none absolute inset-0 hidden shadow-[inset_0_0_0_3px_var(--c-on-bg),inset_0_0_0_6px_var(--c-bg)] group-focus-visible:block" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <WovenBand />
      )}

      {/* Label pill and Share sit on the mosaic like a gallery tag. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-3 @4xl:p-4">
        {hasLabel ? (
          <div className="pointer-events-auto inline-flex h-11 max-w-[calc(100%-60px)] min-w-0 items-center rounded-full bg-c-bg px-4 text-c-on-bg">
            <Logo on={ground} className="!h-7 !max-w-[200px] text-[17px]" />
          </div>
        ) : (
          <span />
        )}
        <ShareButton className="pointer-events-auto bg-c-bg text-c-on-bg hover:bg-c-bg-tint" />
      </div>

      {plan && <Lightbox photos={photos} index={index} onIndexChange={setIndex} />}
    </div>
  );
}

/**
 * No photos yet: an inabel border woven from the theme's colors, so the card
 * still opens on cloth rather than on an empty box. Decorative.
 */
function WovenBand() {
  const id = useId().replace(/:/g, "");
  return (
    <div aria-hidden className="relative h-[132px] overflow-hidden bg-c-surface @4xl:h-[168px]">
      <svg className="absolute inset-0 size-full" preserveAspectRatio="none">
        <defs>
          <pattern id={`${id}-d`} width="44" height="44" patternUnits="userSpaceOnUse" x="50%">
            <path d="M22 5L39 22L22 39L5 22Z" fill="none" stroke="var(--c-accent)" strokeWidth="3" />
            <path d="M22 16L28 22L22 28L16 22Z" fill="var(--c-on-bg)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${id}-d)`} />
      </svg>
      {/* Warp stripes at the foot of the band, like a blanket's selvedge. */}
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-[3px] bg-c-surface pt-[3px]">
        <span className="h-[5px] bg-c-on-bg" />
        <span className="h-[2px] bg-c-accent" />
      </div>
    </div>
  );
}
