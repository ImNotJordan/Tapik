"use client";

import { useId, useMemo, useState } from "react";
import type { OrgMember } from "@/lib/types";
import { initials } from "@/lib/utils";
import { useCard } from "@/components/card/context";
import { useLabels } from "@/components/card/labels";
import { AgentPhoto, CardImage, NameText } from "@/components/card/primitives";
import { buildTree, Lightbox, OrgChartBlock, type HeadingProps, type Node } from "@/components/card/sections";

/** Section heading on the cream sheet: a small dot in the ground color, echoing the date circle. */
export function SheetHeading({ children, aside, id }: HeadingProps) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <h2 id={id} className="card-display flex items-center gap-2.5 text-[1.2rem] leading-tight text-c-text">
        <span aria-hidden className="size-2.5 shrink-0 translate-y-[-0.05em] rounded-full bg-c-bg" />
        {children}
      </h2>
      {aside && <span className="shrink-0 text-[14px] text-c-text-muted tabular-nums">{aside}</span>}
    </div>
  );
}

/**
 * The owners, first on the sheet. With an event on the card, their photo,
 * the card's name and title lead (the hero is about the event); the quote
 * follows as a ground-colored speech bubble. Without an event the hero
 * already carries photo and name, so only the quote shows.
 */
export function Owners({ identity, quote }: { identity: boolean; quote?: string }) {
  const { bundle, isHidden } = useCard();
  const L = useLabels();
  const uid = useId();
  const c = bundle.card;
  if (!identity && !quote) return null;
  const photo = !isHidden("agentPhoto");

  return (
    <section aria-labelledby={`${uid}-h`} className="flex flex-col gap-5">
      {identity ? (
        <div className="flex items-center gap-4">
          {photo && <AgentPhoto shape="circle" sizes="96px" className="size-[76px] shrink-0 ring-4 ring-c-primary ring-offset-2 ring-offset-c-surface" />}
          <div className="flex min-w-0 flex-col gap-1">
            <h2 id={`${uid}-h`} className="card-display text-[1.45rem] leading-[1.1] [overflow-wrap:anywhere] [text-wrap:balance]">
              <NameText name={c.name} />
            </h2>
            {(c.title || c.company) && (
              <p className="text-[15px] leading-snug text-c-text-muted">
                {[c.title, c.company && c.company !== c.name ? c.company : ""].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
        </div>
      ) : (
        <h2 id={`${uid}-h`} className="sr-only">
          {L.lang === "fil" ? "Mula sa may-ari" : "From the owners"}
        </h2>
      )}
      {quote && (
        <figure className="relative m-0">
          {/* Bubble tail pointing up at the owners' photo */}
          {identity && photo && <span aria-hidden className="absolute -top-2 left-8 size-5 rotate-45 rounded-[4px] bg-c-bg" />}
          <blockquote className="relative m-0 rounded-[24px] bg-c-bg px-5 pt-4 pb-5 text-c-on-bg">
            <span aria-hidden className="card-display block h-8 text-[2.75rem] leading-none text-c-primary">
              “
            </span>
            <p className="text-[1.2rem] leading-[1.45] font-medium [text-wrap:pretty]">{quote.replace(/^[“"]|[”"]$/g, "")}</p>
          </blockquote>
        </figure>
      )}
    </section>
  );
}

/** Album as a horizontal strip of tall tiles with their captions; tap opens the full-screen viewer. */
export function Album() {
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
    <section aria-labelledby={`${uid}-h`} className="flex flex-col gap-4">
      <SheetHeading tone="surface" id={`${uid}-h`} aside={L.photoCount(photos.length)}>
        {L.photos}
      </SheetHeading>
      <ul className="-mx-5 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 pb-1 [scrollbar-width:none] @4xl:-mx-8 @4xl:scroll-px-8 @4xl:px-8 [&::-webkit-scrollbar]:hidden">
        {photos.map((p, i) => (
          <li key={p.id} className="w-[62%] max-w-[250px] shrink-0 snap-start">
            <button
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`${L.openPhoto} ${L.nOfM(i + 1, photos.length)}: ${p.caption || p.alt || ""}`}
              className="group block w-full cursor-zoom-in overflow-hidden rounded-[22px]"
              style={{ aspectRatio: "4 / 5" }}
            >
              <CardImage src={p.url} alt={p.alt || ""} sizes="(min-width: 1024px) 250px, 62vw" className="size-full transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none" />
            </button>
            {p.caption && <p className="mt-2 px-1 text-[14px] leading-snug text-c-text-muted">{p.caption}</p>}
          </li>
        ))}
      </ul>
      <Lightbox photos={photos} index={index} onIndexChange={setIndex} />
    </section>
  );
}

const flatten = (nodes: Node[]): Node[] => nodes.flatMap((n) => [n, ...flatten(n.children)]);

function CrewAvatar({ m }: { m: OrgMember }) {
  if (m.photoUrl) return <CardImage src={m.photoUrl} alt="" sizes="48px" className="size-9 shrink-0 rounded-full" />;
  return (
    <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full bg-c-bg text-[12px] font-bold tracking-[0.02em] text-c-on-bg">
      {initials(m.name)}
    </span>
  );
}

/** The crew as chips, leader first. An uploaded chart (image or PDF) uses the shared viewer. */
export function Crew() {
  const { bundle } = useCard();
  const L = useLabels();
  const uid = useId();
  const { orgChart, orgMembers } = bundle;
  const people = useMemo(() => flatten(buildTree(orgMembers)), [orgMembers]);
  const title = L.lang === "fil" ? "Ang crew" : "The crew";
  if (!orgChart) return null;
  if (orgChart.mode === "upload") return <OrgChartBlock tone="surface" title={title} />;
  if (!people.length) return null;

  return (
    <section aria-labelledby={`${uid}-h`} className="flex flex-col gap-4">
      <SheetHeading tone="surface" id={`${uid}-h`} aside={L.people(people.length)}>
        {title}
      </SheetHeading>
      {/* Plain text in a list: chips are not buttons. */}
      <ul className="flex flex-wrap gap-2">
        {people.map((m) => (
          <li key={m.id} className="inline-flex min-h-12 max-w-full items-center gap-2.5 rounded-full bg-c-surface-tint py-1.5 pr-4 pl-1.5">
            <CrewAvatar m={m} />
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-[15px] font-semibold">{m.name}</span>
              {m.role && <span className="truncate text-[13px] text-c-text-muted">{m.role}</span>}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
