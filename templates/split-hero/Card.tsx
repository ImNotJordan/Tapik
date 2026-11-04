"use client";

import { useRef } from "react";
import { visibleSections } from "@/lib/design/sections";
import type { ReorderableSection } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PrimaryActions, ShareButton, StickyActionBar } from "@/components/card/actions";
import { AgentPhoto, CardImage, Logo, NameText } from "@/components/card/primitives";
import { AboutBlock, CardFooter, ContactList, OrgChartBlock, QuoteBlock, SectionStyle, SocialLinks, T, type SectionStyleValue } from "@/components/card/sections";
import type { TemplateProps } from "../types";
import { ListingAlbum, MapBeside } from "./sections/listing";

const STYLE: SectionStyleValue = {
  quote: "text-[clamp(1.75rem,7.6cqi,2.6rem)] leading-[1.14] @4xl:text-[2.4rem]",
  renderHeading: ({ children, tone, aside, id }) => (
    <div className="flex items-baseline justify-between gap-4">
      <h2 id={id} className={cn("card-display text-[clamp(1.9rem,8cqi,2.4rem)] leading-tight @4xl:text-[2.3rem]", T[tone].text)}>
        {children}
      </h2>
      {aside && <span className={cn("shrink-0 text-sm tabular-nums", T[tone].muted)}>{aside}</span>}
    </div>
  ),
};

/**
 * J — Split Hero: the first screen is cut in two, a photograph above a solid
 * slab of color that carries the name, with the agent's portrait sitting on
 * the seam. On wide screens the split becomes the left half and stays put
 * while the details scroll on the right. With no photo, the slab fills the hero.
 */
export default function SplitHeroCard({ bundle, tokens, mode }: TemplateProps) {
  const H1 = mode === "public" ? "h1" : "p";
  const { card } = bundle;
  const actionsRef = useRef<HTMLDivElement>(null);
  const sections = visibleSections(bundle);
  const photo = card.backgroundPhotoUrl && !card.hiddenSections.includes("backgroundPhoto") ? card.backgroundPhotoUrl : null;
  const showPortrait = !card.hiddenSections.includes("agentPhoto");
  // The longest word (hyphenated names stay whole) decides how large the name can be.
  const longest = Math.max(...card.name.split(/\s+/).map((w) => w.length), 1);
  const fit = { "--name-fit": `${(88 / (longest * 0.56)).toFixed(2)}cqi`, "--name-fit-wide": `${(40 / (longest * 0.56)).toFixed(2)}cqi` } as React.CSSProperties;

  const render: Record<ReorderableSection, () => React.ReactNode> = {
    quote: () => <QuoteBlock tone="background" />,
    about: () => <AboutBlock tone="background" heading />,
    contact: () => <ContactList tone="background" variant="rows" />,
    socials: () => <SocialLinks tone="background" variant="icons" />,
    photos: () => <ListingAlbum />,
    map: () => <MapBeside />,
    orgChart: () => <OrgChartBlock tone="background" />,
  };

  const portrait = (cls: string) => (
    <div className={cn("shrink-0 overflow-hidden rounded-[14px] bg-c-surface shadow-[0_14px_30px_-12px_rgb(0_0_0/0.55)] ring-4 ring-c-surface", cls)}>
      <AgentPhoto shape="rounded-square" sizes="160px" priority className="w-full !rounded-[10px]" />
    </div>
  );

  return (
    <SectionStyle.Provider value={STYLE}>
      <div className="relative min-h-[var(--c-vh)] @4xl:grid @4xl:grid-cols-2">
        {/* The split */}
        <div className="relative flex flex-col @4xl:sticky @4xl:top-0 @4xl:h-[var(--c-vh)] @4xl:self-start">
          {photo && (
            <div className="relative h-[clamp(280px,calc(var(--c-vh)*0.5),460px)] overflow-hidden @4xl:h-auto @4xl:min-h-0 @4xl:flex-[3]">
              <div className="motion-photo-settle absolute inset-0">
                <CardImage src={photo} alt={card.backgroundPhotoAlt || ""} sizes="(min-width: 1024px) 50vw, 100vw" priority focal={card.backgroundFocalPoint} className="size-full" failTone="background" />
              </div>
              <div aria-hidden className="absolute inset-0 bg-black" style={{ opacity: "calc(var(--c-overlay) * 0.5)" }} />
              <div className="absolute top-0 right-0 p-4 @4xl:p-8">
                <ShareButton className="bg-c-surface text-c-text hover:opacity-90" />
              </div>
            </div>
          )}

          <div
            className={cn(
              "relative flex flex-col bg-c-surface px-5 pb-9 text-c-text @4xl:px-12 @4xl:pb-12",
              photo ? "pt-5 @4xl:flex-[2] @4xl:justify-end @4xl:pt-8" : "min-h-[min(calc(var(--c-vh)*0.72),640px)] justify-between pt-5 @4xl:h-full @4xl:min-h-0 @4xl:pt-10",
            )}
          >
            {/* Portrait on the seam between photo and slab */}
            {photo && showPortrait && <div className="absolute top-0 right-5 w-[26cqi] max-w-[132px] -translate-y-1/2 @4xl:right-12 @4xl:w-[150px] @4xl:max-w-none">{portrait("w-full")}</div>}

            <div className={cn("flex items-start justify-between gap-4", photo && "min-h-[64px] pr-[calc(26cqi+1.5rem)] @4xl:absolute @4xl:top-8 @4xl:left-12 @4xl:min-h-0 @4xl:pr-0")}>
              <Logo on={tokens.surface} className="text-c-text" />
              {!photo && <ShareButton className="border border-c-line text-c-text hover:bg-c-surface-tint" />}
            </div>

            <div className={cn("flex flex-col gap-3", photo ? "pt-4" : "pt-16")}>
              {!photo && showPortrait && portrait("mb-4 w-[30cqi] max-w-[150px] @4xl:w-[150px]")}
              <span aria-hidden className="h-[3px] w-12 bg-c-accent" />
              <H1 style={fit} className="motion-name-rise card-display text-[min(12.4cqi,4.25rem,var(--name-fit))] leading-[0.98] [text-wrap:balance] @4xl:text-[min(4.6cqi,5.25rem,var(--name-fit-wide))]">
                <NameText name={card.name} />
              </H1>
              {(card.title || card.company) && (
                <p className="max-w-[36ch] text-[17px] leading-snug">{[card.title, card.company].filter(Boolean).join(" · ")}</p>
              )}
              {card.credential && <p className="text-sm tabular-nums text-c-text-muted">{card.credential}</p>}
            </div>
          </div>
        </div>

        {/* The details */}
        <div className="min-w-0 @4xl:px-14 @4xl:pt-14">
          <div className="@4xl:max-w-[600px]">
            <div ref={actionsRef} className="px-4 pt-6 @4xl:px-0 @4xl:pt-0">
              <PrimaryActions layout="pair" />
            </div>
            <main className="flex flex-col gap-12 px-5 pt-12 pb-28 @4xl:px-0 @4xl:pb-16">
              {sections.map((key) => (
                <div key={key}>{render[key]()}</div>
              ))}
              <CardFooter tone="background" className="pt-2" />
            </main>
          </div>
        </div>

        <StickyActionBar watch={actionsRef} />
      </div>
    </SectionStyle.Provider>
  );
}
