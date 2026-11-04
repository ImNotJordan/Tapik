"use client";

import { useRef } from "react";
import { visibleSections } from "@/lib/design/sections";
import type { ReorderableSection } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PrimaryActions, ShareButton, StickyActionBar } from "@/components/card/actions";
import { HoursTable, OpenBadge, useEvent, useServices } from "@/components/card/extras";
import { useLabels } from "@/components/card/labels";
import { AgentPhoto, CardImage, Logo, NameText } from "@/components/card/primitives";
import {
  AboutBlock,
  CardFooter,
  ContactList,
  MapBlock,
  OrgChartBlock,
  PhotoAlbum,
  QuoteBlock,
  SectionStyle,
  SocialLinks,
  type HeadingProps,
} from "@/components/card/sections";
import type { TemplateProps } from "../types";
import { NextGathering } from "./sections/next-gathering";

/** Bulletin headings: small caps on a hairline, like the section heads of a printed parish bulletin. */
function BulletinHeading({ children, aside, id }: HeadingProps) {
  return (
    <div className="flex items-baseline gap-3">
      <h2 id={id} className="card-display shrink-0 text-[1.45rem] leading-tight [font-variant-caps:all-small-caps] tracking-[0.06em] text-c-on-bg">
        {children}
      </h2>
      <span aria-hidden className="h-px min-w-6 flex-1 translate-y-[-0.3em] bg-c-bg-line" />
      {aside && <span className="shrink-0 text-sm tabular-nums text-c-on-bg-muted">{aside}</span>}
    </div>
  );
}

const STYLE = {
  renderHeading: (p: HeadingProps) => <BulletinHeading {...p} />,
  quote: "italic text-[clamp(1.45rem,6.4cqi,2.05rem)] leading-[1.3] [text-wrap:pretty]",
};

/** Last two parts of an address, e.g. "Pulilan, Bulacan". */
function placeLine(address?: string): string | undefined {
  const parts = address?.split(",").map((p) => p.trim()).filter(Boolean);
  if (!parts?.length) return undefined;
  return parts.slice(-2).join(", ");
}

/**
 * M — Faith & Community. Set like a parish bulletin: a small-caps masthead with
 * the community's name over a double rule, the leader's round portrait, and a
 * side column of the schedule, the next gathering and the ministries.
 */
export default function FaithCommunityCard({ bundle, tokens, mode }: TemplateProps) {
  const H1 = mode === "public" ? "h1" : "p";
  const { card } = bundle;
  const L = useLabels();
  const actionsRef = useRef<HTMLDivElement>(null);
  const sections = visibleSections(bundle);
  const services = useServices();
  const event = useEvent();
  const hasHours = !!card.hours?.length;
  const hasAside = hasHours || services.length > 0 || !!event;
  const cover = card.backgroundPhotoUrl && !card.hiddenSections.includes("backgroundPhoto") ? card.backgroundPhotoUrl : null;
  const place = placeLine(card.address);
  const masthead = card.company?.trim();

  const render: Record<ReorderableSection, () => React.ReactNode> = {
    quote: () => (
      <div className="border-l-[3px] border-c-accent pl-5">
        <QuoteBlock tone="background" />
      </div>
    ),
    about: () => <AboutBlock tone="background" heading />,
    contact: () => (
      <section className="flex flex-col gap-3">
        <BulletinHeading tone="background">{L.contactDetails}</BulletinHeading>
        <ContactList tone="background" variant="rows" />
      </section>
    ),
    socials: () => (
      <section className="flex flex-col gap-3">
        <BulletinHeading tone="background">{L.socialProfiles}</BulletinHeading>
        <SocialLinks tone="background" variant="rows" />
      </section>
    ),
    photos: () => <PhotoAlbum tone="background" layout="grid" />,
    map: () => <MapBlock tone="background" title={L.findUs} />,
    orgChart: () => <OrgChartBlock tone="background" />,
  };

  return (
    <SectionStyle.Provider value={STYLE}>
      <div className="relative min-h-[var(--c-vh)]">
        <div className="mx-auto max-w-[1120px] px-5 @4xl:px-10">
          {/* Masthead */}
          <header className="pt-4 @4xl:pt-8">
            <div className="flex items-center justify-between gap-3">
              {/* Without an image logo the masthead already carries the name; skip the text fallback. */}
              {card.logoUrl || card.logoDarkUrl || !masthead ? <Logo on={tokens.background} className="text-c-on-bg" /> : <span />}
              <ShareButton className="border border-c-bg-line text-c-on-bg hover:bg-c-bg-tint" />
            </div>
            {masthead && (
              <p className="card-display mt-6 text-[clamp(1.5rem,8.4cqi,3.4rem)] leading-[0.95] [font-variant-caps:all-small-caps] tracking-[0.05em] [text-wrap:balance] text-c-on-bg @4xl:mt-8">
                {masthead}
              </p>
            )}
            <div aria-hidden className={cn("flex flex-col gap-[3px]", masthead ? "mt-3" : "mt-5")}>
              <span className="h-[3px] bg-c-on-bg" />
              <span className="h-px bg-c-on-bg" />
            </div>
            {(place || card.title) && (
              <p className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-2 text-[15px] tracking-[0.05em] text-c-on-bg-muted [font-variant-caps:all-small-caps]">
                {place && <span>{place}</span>}
                {card.title && <span>{card.title}</span>}
              </p>
            )}
            <span aria-hidden className="block h-px bg-c-bg-line" />
          </header>

          {cover && (
            <figure className="m-0 mt-5 @4xl:mt-8">
              <div className="motion-photo-settle relative aspect-[16/9] overflow-hidden rounded-[3px] @4xl:aspect-[21/8]">
                <CardImage src={cover} alt={card.backgroundPhotoAlt || ""} sizes="(min-width: 1120px) 1040px, 100vw" priority focal={card.backgroundFocalPoint} className="size-full" failTone="background" />
              </div>
              {card.backgroundPhotoAlt && <figcaption className="mt-2 text-[13px] italic text-c-on-bg-muted">{card.backgroundPhotoAlt}</figcaption>}
            </figure>
          )}

          <div className={cn("@4xl:grid @4xl:gap-x-14", hasAside && "@4xl:grid-cols-[minmax(0,1fr)_340px]")}>
            {/* Leader */}
            <div className="flex flex-col pt-8 @4xl:col-start-1 @4xl:row-start-1 @4xl:pt-12">
              <div className="flex items-center gap-5">
                {!card.hiddenSections.includes("agentPhoto") && (
                  <div className="shrink-0 rounded-full p-[3px] ring-2 ring-c-accent">
                    <AgentPhoto shape="circle" sizes="120px" priority tone="background" className="w-[26cqi] max-w-[124px]" />
                  </div>
                )}
                <div className="flex min-w-0 flex-col gap-1">
                  <H1 className="card-display text-[clamp(1.7rem,8cqi,2.75rem)] leading-[1.02] [overflow-wrap:anywhere] [text-wrap:balance]">
                    <NameText name={card.name} />
                  </H1>
                  {(card.title || card.company) && (
                    <p className="text-[15px] leading-snug text-c-on-bg-muted">{[card.title, masthead ? undefined : card.company].filter(Boolean).join(", ")}</p>
                  )}
                </div>
              </div>
              {hasHours && <OpenBadge tone="background" className="mt-5" />}
              <div ref={actionsRef} className="pt-6">
                <PrimaryActions layout="pair" />
              </div>
            </div>

            {/* Bulletin side column: schedule, next gathering, ministries */}
            {hasAside && (
              <aside aria-label={L.hours} className="mt-10 flex flex-col gap-9 @4xl:col-start-2 @4xl:row-span-2 @4xl:row-start-1 @4xl:mt-12 @4xl:self-start @4xl:border-l @4xl:border-c-bg-line @4xl:pl-10">
                {event && <NextGathering />}
                {hasHours && (
                  <section className="flex flex-col gap-2">
                    <BulletinHeading tone="background">Mass & gatherings</BulletinHeading>
                    <HoursTable tone="background" title="Mass & gatherings" />
                  </section>
                )}
                {services.length > 0 && (
                  <section className="flex flex-col gap-3">
                    <BulletinHeading tone="background">Ministries</BulletinHeading>
                    <ul className="flex flex-col">
                      {services.map((s, i) => (
                        <li key={s} className="flex items-baseline gap-3 border-b border-dotted border-c-bg-line py-2.5">
                          <span aria-hidden className="w-6 shrink-0 font-[family-name:var(--c-font-display)] text-sm tabular-nums text-c-accent">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <span className="card-display text-lg italic leading-snug">{s}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </aside>
            )}

            <main className="flex flex-col gap-12 pt-12 pb-28 @4xl:col-start-1 @4xl:row-start-2 @4xl:pb-16">
              {sections.map((key) => (
                <div key={key}>{render[key]()}</div>
              ))}
              <CardFooter tone="background" className="border-t border-c-bg-line pt-4" />
            </main>
          </div>
        </div>

        <StickyActionBar watch={actionsRef} />
      </div>
    </SectionStyle.Provider>
  );
}
