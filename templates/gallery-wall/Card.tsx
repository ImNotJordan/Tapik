"use client";

import { useRef } from "react";
import { visibleSections } from "@/lib/design/sections";
import type { ReorderableSection } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PrimaryActions, ShareButton, StickyActionBar } from "@/components/card/actions";
import { AgentPhoto, Logo, NameText } from "@/components/card/primitives";
import { AboutBlock, CardFooter, ContactList, MapBlock, OrgChartBlock, QuoteBlock, SectionStyle, SocialLinks, T, type SectionStyleValue } from "@/components/card/sections";
import type { TemplateProps } from "../types";
import { useWallPhotos, Wall } from "./sections/wall";

const STYLE: SectionStyleValue = {
  quote: "text-[clamp(1.45rem,6.2cqi,2rem)] leading-[1.25] italic [font-weight:500]",
  renderHeading: ({ children, tone, aside, id }) => (
    <div className={cn("flex items-baseline justify-between gap-4 border-t pt-3", T[tone].line)}>
      <h2 id={id} className={cn("text-[13px] font-semibold tracking-[0.08em] uppercase", T[tone].text)}>
        {children}
      </h2>
      {aside && <span className={cn("shrink-0 text-[13px] tabular-nums", T[tone].muted)}>{aside}</span>}
    </div>
  ),
};

/**
 * K — Gallery Wall: album first. The photographs hang edge to edge as the
 * hero; the person is set small afterwards, like the label beside a framed
 * print. The album is pinned first on purpose (it is the template's
 * signature); the other sections follow the admin's order. With no photos the
 * label grows and becomes the hero.
 */
export default function GalleryWallCard({ bundle, tokens, mode }: TemplateProps) {
  const H1 = mode === "public" ? "h1" : "p";
  const { card } = bundle;
  const actionsRef = useRef<HTMLDivElement>(null);
  const sections = visibleSections(bundle);
  const wallPhotos = useWallPhotos(bundle.photos);
  const hasWall = sections.includes("photos") && wallPhotos.length > 0;
  const rest = sections.filter((k) => k !== "photos");
  // Size the hero name so its longest word (hyphenated names stay whole) always fits the column.
  const longest = Math.max(...card.name.split(/\s+/).map((w) => w.length), 1);
  const fit = { "--name-fit": `${(88 / (longest * 0.56)).toFixed(2)}cqi`, "--name-fit-wide": `${(30 / (longest * 0.56)).toFixed(2)}cqi` } as React.CSSProperties;

  const render: Record<Exclude<ReorderableSection, "photos">, () => React.ReactNode> = {
    quote: () => <QuoteBlock tone="background" />,
    about: () => <AboutBlock tone="background" heading />,
    contact: () => <ContactList tone="background" variant="rows" />,
    socials: () => <SocialLinks tone="background" variant="rows" />,
    map: () => <MapBlock tone="background" mapClassName="!rounded-none" />,
    orgChart: () => <OrgChartBlock tone="background" />,
  };

  const label = (
    <div className={cn("flex flex-col gap-5", !hasWall && "pt-6 @4xl:pt-16")}>
      <div className={cn("flex items-start gap-4 border-t border-c-on-bg pt-4", !hasWall && "border-t-2 pt-6")}>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <H1
            style={fit}
            className={cn(
              "card-display [overflow-wrap:anywhere] [text-wrap:balance]",
              hasWall ? "text-[1.7rem] leading-[1.1]" : "text-[min(13cqi,5.5rem,var(--name-fit))] leading-[0.95] @4xl:text-[min(5.5rem,var(--name-fit-wide))]",
            )}
          >
            <NameText name={card.name} />
          </H1>
          {card.title && <p className={cn("leading-snug", hasWall ? "text-base" : "pt-2 text-lg")}>{card.title}</p>}
          {card.company && <p className="text-[15px] leading-snug text-c-on-bg-muted">{card.company}</p>}
          {card.credential && <p className="text-[15px] leading-snug text-c-on-bg-muted italic">{card.credential}</p>}
        </div>
        <AgentPhoto
          shape="square"
          sizes="160px"
          tone="background"
          priority={!hasWall}
          className={cn("shrink-0 !rounded-none grayscale-[0.15]", hasWall ? "w-[72px]" : "w-[30cqi] max-w-[180px] @4xl:w-[160px]")}
        />
      </div>
      <div ref={actionsRef}>
        <PrimaryActions layout="pair" />
      </div>
    </div>
  );

  return (
    <SectionStyle.Provider value={STYLE}>
      <div className="relative min-h-[var(--c-vh)]">
        <header className="flex h-16 items-center justify-between gap-3 px-4 @4xl:h-20 @4xl:px-10">
          <Logo on={tokens.background} className="text-c-on-bg" />
          <ShareButton className="rounded-none border border-c-bg-line text-c-on-bg hover:bg-c-bg-tint" />
        </header>

        <div
          className={cn(
            "flex flex-col @4xl:mx-auto @4xl:grid @4xl:max-w-[1360px] @4xl:grid-rows-[auto_1fr] @4xl:gap-x-12 @4xl:px-10",
            hasWall ? "@4xl:grid-cols-[minmax(0,8fr)_minmax(300px,4fr)]" : "@4xl:grid-cols-[minmax(300px,5fr)_minmax(0,7fr)]",
          )}
        >
          {hasWall && (
            <div className="min-w-0 @4xl:col-start-1 @4xl:row-start-1">
              <Wall photos={wallPhotos} />
            </div>
          )}

          {/* One label: after the wall on phones, a sticky side column on wide screens. */}
          <div
            className={cn(
              "px-5 @4xl:sticky @4xl:top-8 @4xl:row-span-2 @4xl:row-start-1 @4xl:self-start @4xl:px-0",
              hasWall ? "pt-6 @4xl:col-start-2 @4xl:pt-0" : "@4xl:col-start-1",
            )}
          >
            {label}
          </div>

          <main className={cn("flex min-w-0 flex-col gap-11 px-5 pt-12 pb-28 @4xl:px-0 @4xl:pb-16", hasWall ? "@4xl:col-start-1 @4xl:row-start-2 @4xl:max-w-[680px]" : "@4xl:col-start-2 @4xl:row-start-1 @4xl:row-span-2 @4xl:pt-16")}>
            {rest.map((key) => (
              <div key={key}>{render[key as Exclude<ReorderableSection, "photos">]()}</div>
            ))}
            <CardFooter tone="background" className="pt-2" />
          </main>
        </div>

        <StickyActionBar watch={actionsRef} />
      </div>
    </SectionStyle.Provider>
  );
}
