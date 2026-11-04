"use client";

import { useRef } from "react";
import { visibleSections } from "@/lib/design/sections";
import type { ReorderableSection } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PrimaryActions, ShareButton, StickyActionBar } from "@/components/card/actions";
import { AgentPhoto, CardImage, Logo, NameText } from "@/components/card/primitives";
import { AboutBlock, CardFooter, ContactList, MapBlock, OrgChartBlock, PhotoAlbum, QuoteBlock, SocialLinks } from "@/components/card/sections";
import type { TemplateProps } from "../types";

/**
 * A — Keepsake (default).
 * The page opens as the physical NFC card that was just tapped: name, photo and
 * licence printed at real card proportions (85.6 × 54 mm), tilted on a deep
 * ground. The sections sit on a light sheet below, like the back of the card.
 */
export default function KeepsakeCard({ bundle, tokens, mode }: TemplateProps) {
  // Only the public page owns the document heading; studio previews render the name as text.
  const H1 = mode === "public" ? "h1" : "p";
  const { card } = bundle;
  const actionsRef = useRef<HTMLDivElement>(null);
  const sections = visibleSections(bundle);
  const bgPhoto = card.backgroundPhotoUrl && !card.hiddenSections.includes("backgroundPhoto") ? card.backgroundPhotoUrl : null;

  const render: Record<ReorderableSection, () => React.ReactNode> = {
    quote: () => <QuoteBlock tone="surface" />,
    about: () => <AboutBlock tone="surface" />,
    contact: () => <ContactList tone="surface" variant="rows" />,
    socials: () => <SocialLinks tone="surface" variant="icons" />,
    photos: () => <PhotoAlbum tone="surface" layout="grid" />,
    map: () => <MapBlock tone="surface" />,
    orgChart: () => <OrgChartBlock tone="surface" />,
  };

  return (
    <div className="relative min-h-[var(--c-vh)]">
      {bgPhoto && (
        <div aria-hidden className="absolute inset-x-0 top-0 h-[min(560px,80%)] overflow-hidden @4xl:h-[var(--c-vh)]">
          <CardImage src={bgPhoto} alt="" sizes="100vw" priority focal={card.backgroundFocalPoint} className="size-full" failTone="background" />
          <div className="absolute inset-0 bg-c-bg" style={{ opacity: "var(--c-overlay)" }} />
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-b from-transparent to-c-bg" />
        </div>
      )}

      <div className="relative @4xl:mx-auto @4xl:grid @4xl:max-w-[1180px] @4xl:grid-cols-[minmax(360px,440px)_minmax(0,660px)] @4xl:justify-center @4xl:gap-14 @4xl:px-10 @4xl:py-12">
        {/* Front of the card */}
        <div className="@4xl:sticky @4xl:top-12 @4xl:self-start">
          <header className="flex items-center justify-between gap-3 px-4 pt-4 pl-5 @4xl:px-0 @4xl:pt-0">
            <Logo on={tokens.background} className="text-c-on-bg" />
            <ShareButton className="border border-c-bg-line text-c-on-bg hover:bg-c-bg-tint" />
          </header>

          <div className="px-4 pt-8 @4xl:px-0">
            <article
              aria-label={`${card.name}’s card`}
              className="motion-card-settle relative mx-auto flex aspect-[1.586] w-full max-w-[440px] flex-col justify-between rounded-[14px] bg-c-surface p-[4.6cqi] text-c-text shadow-[0_22px_44px_-12px_rgb(0_0_0/0.5),0_2px_6px_rgb(0_0_0/0.25)] [--card-tilt:-1.5deg] @4xl:p-5"
              style={{ transform: "rotate(var(--card-tilt))" }}
            >
              <div className="flex min-h-0 items-start gap-[4cqi] @4xl:gap-4">
                <AgentPhoto shape="rounded-square" sizes="120px" priority className="w-[22%] shrink-0 !rounded-lg" />
                <div className="flex min-w-0 flex-col gap-[1.4cqi] pt-0.5 @4xl:gap-1.5">
                  <H1 className="card-display line-clamp-3 text-[clamp(1.15rem,6.6cqi,1.85rem)] leading-[1.06] [overflow-wrap:anywhere] [text-wrap:balance] @4xl:text-[1.75rem]">
                    <NameText name={card.name} />
                  </H1>
                  {card.title && <p className="text-[clamp(0.75rem,3.4cqi,0.9rem)] leading-snug text-c-text @4xl:text-sm">{card.title}</p>}
                  {card.company && <p className="text-[clamp(0.75rem,3.4cqi,0.9rem)] leading-snug text-c-text-muted @4xl:text-sm">{card.company}</p>}
                </div>
              </div>
              <div className="flex items-end justify-between gap-3">
                <p className="truncate text-[clamp(0.68rem,2.9cqi,0.78rem)] tabular-nums text-c-text-muted">{card.credential}</p>
                <svg aria-label="Tap to connect" role="img" viewBox="0 0 24 24" className="size-[clamp(22px,7cqi,30px)] shrink-0 text-c-accent" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
                  <path d="M6 8.32a7.43 7.43 0 0 1 0 7.36" />
                  <path d="M9.46 6.21a11.76 11.76 0 0 1 0 11.58" />
                  <path d="M12.91 4.1a15.91 15.91 0 0 1 .01 15.8" />
                  <path d="M16.37 2a20.16 20.16 0 0 1 0 20" />
                </svg>
              </div>
            </article>
          </div>

          <div ref={actionsRef} className="mx-auto max-w-[440px] px-4 pt-8 @4xl:px-0">
            <PrimaryActions layout="pair" />
          </div>
        </div>

        {/* Back of the card */}
        <main
          className={cn(
            "relative mt-7 flex flex-col gap-11 rounded-t-[22px] bg-c-surface px-5 pt-9 pb-28 text-c-text",
            "@4xl:mt-0 @4xl:rounded-[24px] @4xl:px-10 @4xl:pt-11 @4xl:pb-10",
          )}
        >
          {sections.map((key) => (
            <div key={key}>{render[key]()}</div>
          ))}
          <CardFooter tone="surface" className="pt-2" />
        </main>
      </div>

      <StickyActionBar watch={actionsRef} />
    </div>
  );
}
