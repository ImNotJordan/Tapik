"use client";

import { useMemo, useState } from "react";
import { useCard } from "@/components/card/context";
import { useLabels } from "@/components/card/labels";
import { CardImage } from "@/components/card/primitives";
import { buildTree, Lightbox, MemberAvatar, OrgChartBlock, SectionHeading, type Node } from "@/components/card/sections";
import { cn } from "@/lib/utils";

/* Fixed tilts so the album reads like photos pinned behind a counter. */
const TILT = [-2.5, 2, -1.5, 2.5, -2, 1.5];

/** Album as tilted, ink-bordered tiles. Every tile opens the shared lightbox. */
export function TiltedAlbum() {
  const { bundle } = useCard();
  const L = useLabels();
  const [index, setIndex] = useState<number | null>(null);
  const photos = useMemo(() => {
    const p = bundle.photos.slice();
    const cover = p.findIndex((x) => x.isCover);
    if (cover > 0) p.unshift(...p.splice(cover, 1));
    return p;
  }, [bundle.photos]);
  if (!photos.length) return null;
  const shown = photos.slice(0, 6);

  return (
    <section aria-label={L.photos} className="flex flex-col gap-5">
      <SectionHeading tone="background" aside={L.photoCount(photos.length)}>
        {L.photos}
      </SectionHeading>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-5 @3xl:grid-cols-3">
        {shown.map((p, i) => {
          const more = i === shown.length - 1 && photos.length > shown.length;
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={more ? `${L.seeAll}: ${L.photoCount(photos.length)}` : `${L.openPhoto}: ${p.caption || p.alt || i + 1}`}
                className="group block w-full cursor-zoom-in rounded-[18px] border-[2.5px] border-c-on-bg bg-c-surface p-1.5 text-left text-c-text transition-transform duration-300 motion-safe:hover:!rotate-0"
                style={{ transform: `rotate(${TILT[i % TILT.length]}deg)` }}
              >
                <span className="relative block aspect-square overflow-hidden rounded-xl">
                  <CardImage src={p.url} alt={p.alt || ""} sizes="(min-width: 768px) 240px, 45vw" className="size-full" failTone="surface" />
                  {more && (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-xl font-bold text-white">+{photos.length - shown.length + 1}</span>
                  )}
                </span>
                {p.caption && <span className="block truncate px-1 pt-1.5 pb-0.5 text-[13px] font-semibold">{p.caption}</span>}
              </button>
            </li>
          );
        })}
      </ul>
      <Lightbox photos={photos} index={index} onIndexChange={setIndex} />
    </section>
  );
}

/** The crew as round avatars in a row. Uploaded charts fall back to the shared block. */
export function CrewRow() {
  const { bundle } = useCard();
  const L = useLabels();
  const { orgChart, orgMembers } = bundle;
  const people = useMemo(() => {
    // Flatten the tree in reading order: owner first, then their crew.
    const out: Node[] = [];
    const walk = (ns: Node[]) => ns.forEach((n) => (out.push(n), walk(n.children)));
    walk(buildTree(orgMembers));
    return out;
  }, [orgMembers]);
  if (!orgChart) return null;
  if (orgChart.mode === "upload") return <OrgChartBlock tone="background" />;
  if (!people.length) return null;

  return (
    <section aria-label={L.team} className="flex flex-col gap-5">
      <SectionHeading tone="background" aside={L.people(people.length)}>
        {L.team}
      </SectionHeading>
      <ul className="-mx-5 flex snap-x gap-4 overflow-x-auto scroll-px-5 px-5 pb-2 [scrollbar-width:none] @4xl:mx-0 @4xl:flex-wrap @4xl:overflow-visible @4xl:px-0">
        {people.map((m) => (
          <li key={m.id} className="flex w-[92px] shrink-0 snap-start flex-col items-center gap-2 text-center">
            <span className="rounded-full border-[2.5px] border-c-on-bg">
              <MemberAvatar m={m} tone="background" size="size-[72px]" />
            </span>
            <span className="flex flex-col">
              <span className={cn("text-sm leading-tight font-bold text-c-on-bg")}>{m.name}</span>
              <span className="text-[13px] leading-snug text-c-on-bg-muted">{m.role}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
