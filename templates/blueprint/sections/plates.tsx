"use client";

import { useId, useMemo, useState } from "react";
import { useCard } from "@/components/card/context";
import { useLabels } from "@/components/card/labels";
import { CardImage } from "@/components/card/primitives";
import { Lightbox } from "@/components/card/sections";
import { cn } from "@/lib/utils";
import { NumHeading } from "./heading";

const SHOWN = 7;

const label = (tag?: string, caption?: string) => [tag?.trim(), caption?.trim()].filter(Boolean).join(" · ") || undefined;

/** Projects as framed plates with mono captions: "P-024 · Lahug house". */
export function ProjectPlates({ n, title }: { n: number; title: string }) {
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
  // The viewer shows the plate's tag with its caption.
  const viewer = useMemo(() => photos.map((x) => ({ ...x, caption: label(x.tag, x.caption) })), [photos]);
  if (!photos.length) return null;

  const shown = photos.slice(0, SHOWN);
  // The first plate spans the sheet; an odd one out at the end does too.
  const wide = (i: number) => i === 0 || (i === shown.length - 1 && (shown.length - 1) % 2 === 1);

  return (
    <section aria-labelledby={`${uid}-h`} className="flex flex-col gap-5">
      <NumHeading n={n} id={`${uid}-h`} aside={L.photoCount(photos.length)}>
        {title}
      </NumHeading>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-5">
        {shown.map((p, i) => (
          <li key={p.id} className={cn(wide(i) && "col-span-2")}>
            <button
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`${L.openPhoto}: ${label(p.tag, p.caption) || p.alt || i + 1}`}
              className="group block w-full cursor-zoom-in text-left"
            >
              <span className="block border-[1.5px] border-c-on-bg p-[5px] transition-colors group-hover:border-c-accent">
                <span className={cn("relative block overflow-hidden", wide(i) ? "aspect-[16/10]" : "aspect-[4/3]")}>
                  <CardImage
                    src={p.thumbUrl && !wide(i) ? p.thumbUrl : p.url}
                    alt={p.alt || ""}
                    sizes={wide(i) ? "(min-width: 768px) 560px, 92vw" : "(min-width: 768px) 280px, 46vw"}
                    className="size-full transition-transform duration-700 [transition-timing-function:var(--ease-out-expo)] group-hover:scale-[1.03] motion-reduce:transition-none"
                    failTone="background"
                  />
                </span>
              </span>
              {label(p.tag, p.caption) && (
                <span aria-hidden className="mt-2 line-clamp-2 block font-[family-name:var(--c-font-mono)] text-[12px] leading-[1.45] tracking-[0.02em] text-[var(--bp-label)]">
                  {p.tag?.trim() && <span className="text-c-on-bg">{p.tag.trim()}</span>}
                  {p.tag?.trim() && p.caption?.trim() && " · "}
                  {p.caption?.trim()}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
      {photos.length > SHOWN && (
        <button type="button" onClick={() => setIndex(SHOWN)} className="cbtn bp-outline h-12 cursor-pointer self-start px-5 text-[15px]">
          {L.seeAll} · {photos.length}
        </button>
      )}
      <Lightbox photos={viewer} index={index} onIndexChange={setIndex} />
    </section>
  );
}
