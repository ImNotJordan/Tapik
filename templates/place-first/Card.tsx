"use client";

import { useRef } from "react";
import { visibleSections } from "@/lib/design/sections";
import type { ReorderableSection } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PrimaryActions, ShareButton, StickyActionBar } from "@/components/card/actions";
import { useLabels } from "@/components/card/labels";
import { AgentPhoto, CardImage, Logo, NameText } from "@/components/card/primitives";
import { AboutBlock, CardFooter, ContactList, MapBlock, OrgChartBlock, PhotoAlbum, QuoteBlock, SectionStyle, SocialLinks } from "@/components/card/sections";
import type { TemplateProps } from "../types";

const STYLE = {
  heading: "text-[clamp(1.75rem,7.5cqi,2.5rem)] leading-tight",
  quote: "text-[clamp(1.6rem,7cqi,2.4rem)] leading-[1.2]",
};

/**
 * C — Place First: a photograph of where you would be standing fills the first
 * screen, logo on the photo. The person, Call, Message and Save sit in a panel
 * laid over the photo's lower edge.
 */
export default function PlaceFirstCard({ bundle, tokens, mode }: TemplateProps) {
  const H1 = mode === "public" ? "h1" : "p";
  const { card } = bundle;
  const L = useLabels();
  const actionsRef = useRef<HTMLDivElement>(null);
  const sections = visibleSections(bundle);
  const photo = card.backgroundPhotoUrl && !card.hiddenSections.includes("backgroundPhoto") ? card.backgroundPhotoUrl : null;
  const visitable = /caf|shop|store|clinic|restaurant|bakery|salon|eatery/i.test(`${card.company} ${card.description}`);

  const render: Record<ReorderableSection, () => React.ReactNode> = {
    quote: () => <QuoteBlock tone="background" />,
    about: () => <AboutBlock tone="background" />,
    contact: () => <ContactList tone="surface" variant="tiles" />,
    socials: () => <SocialLinks tone="background" variant="icons" />,
    photos: () => <PhotoAlbum tone="background" layout="masonry" />,
    map: () => <MapBlock tone="background" title={visitable ? L.findUs : L.office} mapClassName="!h-56 @3xl:!h-72" />,
    orgChart: () => <OrgChartBlock tone="background" />,
  };

  return (
    <SectionStyle.Provider value={STYLE}>
      <div className="relative min-h-[var(--c-vh)]">
        <div className={cn("relative overflow-hidden", photo ? "h-[clamp(460px,calc(var(--c-vh)*0.72),820px)]" : "h-[220px] bg-c-bg-tint")}>
          {photo && (
            <>
              <div className="motion-photo-settle absolute inset-0">
                <CardImage src={photo} alt={card.backgroundPhotoAlt || ""} sizes="100vw" priority focal={card.backgroundFocalPoint} className="size-full" failTone="background" />
              </div>
              <div
                aria-hidden
                className="absolute inset-0"
                style={{ background: "linear-gradient(180deg, color-mix(in oklab, var(--c-bg) 55%, transparent) 0%, transparent 30%, transparent 60%, color-mix(in oklab, var(--c-bg) 70%, transparent) 100%)" }}
              />
              <div aria-hidden className="absolute inset-0 bg-c-bg" style={{ opacity: "calc(var(--c-overlay) * 0.35)" }} />
            </>
          )}
          <header className="absolute inset-x-0 top-0 flex items-center justify-between gap-3 px-4 pt-4 pl-5 @4xl:px-10 @4xl:pt-8">
            <Logo on={tokens.background} className="text-c-on-bg" />
            <ShareButton className="bg-c-bg/70 text-c-on-bg hover:bg-c-bg/90" />
          </header>
        </div>

        {/* The panel over the photo: who, and the three things you can do. */}
        <div className="relative z-10 mx-3 -mt-40 @4xl:mx-auto @4xl:-mt-52 @4xl:max-w-[760px]">
          <section aria-label={card.name} className="rounded-[26px] bg-c-surface p-5 text-c-text shadow-[0_24px_60px_-20px_rgb(0_0_0/0.55)] @4xl:p-8">
            <div className="flex items-end gap-4">
              <AgentPhoto shape="arch" sizes="140px" priority className="w-[24cqi] max-w-[132px] shrink-0" />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5 pb-1">
                <H1 className="card-display text-[clamp(1.9rem,9.5cqi,3.6rem)] leading-[0.98] [overflow-wrap:anywhere] [text-wrap:balance]">
                  <NameText name={card.name} />
                </H1>
                {(card.title || card.company) && <p className="text-[15px] leading-snug text-c-text-muted @3xl:text-base">{[card.title, card.company].filter(Boolean).join(", ")}</p>}
              </div>
            </div>
            <div ref={actionsRef} className="pt-5 @4xl:pt-7 [--c-on-bg:var(--c-text)] [--c-bg-line:var(--c-line)] [--c-bg-tint:var(--c-surface-tint)] [--c-bg:var(--c-surface)]">
              <PrimaryActions layout="trio" />
            </div>
          </section>
        </div>

        <div className="mx-auto max-w-[760px]">
          <main className="flex flex-col gap-12 px-5 pt-12 pb-28 @4xl:px-0 @4xl:pb-16">
            {sections.map((key) => (
              <div key={key}>{render[key]()}</div>
            ))}
            <CardFooter tone="background" className="pt-2" />
          </main>
        </div>

        <StickyActionBar watch={actionsRef} />
      </div>
    </SectionStyle.Provider>
  );
}
