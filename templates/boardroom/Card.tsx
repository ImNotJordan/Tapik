"use client";

import { useRef } from "react";
import { visibleSections } from "@/lib/design/sections";
import type { ReorderableSection } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ShareButton, StickyActionBar } from "@/components/card/actions";
import { useLabels } from "@/components/card/labels";
import { AgentPhoto, Logo, NameText } from "@/components/card/primitives";
import { AboutBlock, CardFooter, ContactList, MapBlock, PhotoAlbum, QuoteBlock, SectionStyle, SocialLinks } from "@/components/card/sections";
import type { TemplateProps } from "../types";
import { ActionTiles, MONO, OrgTree, Panel, PanelHeading } from "./sections/boardroom";

/**
 * G — Boardroom. A brand band with the logo, an employee ID card laid over its
 * edge, four action tiles, every section in a bordered panel, and an org chart
 * tree with the card's owner highlighted.
 */
export default function BoardroomCard({ bundle, tokens, mode }: TemplateProps) {
  const H1 = mode === "public" ? "h1" : "p";
  const { card } = bundle;
  const L = useLabels();
  const actionsRef = useRef<HTMLDivElement>(null);
  const sections = visibleSections(bundle);

  const render: Record<ReorderableSection, () => React.ReactNode> = {
    quote: () => (
      <Panel>
        <QuoteBlock tone="surface" />
      </Panel>
    ),
    about: () => (
      <Panel>
        <AboutBlock tone="surface" heading />
      </Panel>
    ),
    contact: () => (
      <Panel>
        <section aria-label={L.contactDetails} className="flex flex-col gap-3">
          <PanelHeading tone="surface">{L.contactDetails}</PanelHeading>
          <ContactList tone="surface" variant="rows" />
        </section>
      </Panel>
    ),
    socials: () => (
      <Panel>
        <section aria-label={L.socialProfiles} className="flex flex-col gap-2">
          <PanelHeading tone="surface">{L.socialProfiles}</PanelHeading>
          <SocialLinks tone="surface" variant="rows" className="[&>a:last-child]:border-b-0" />
        </section>
      </Panel>
    ),
    photos: () => (
      <Panel>
        <PhotoAlbum tone="surface" layout="grid" />
      </Panel>
    ),
    map: () => (
      <Panel>
        <MapBlock tone="surface" mapClassName="!rounded-lg" />
      </Panel>
    ),
    orgChart: () => (
      <Panel>
        <OrgTree />
      </Panel>
    ),
  };

  return (
    <SectionStyle.Provider
      value={{
        renderHeading: (p) => <PanelHeading {...p} />,
        quote: "text-[clamp(1.3rem,5.6cqi,1.6rem)] leading-[1.35] font-medium !tracking-[-0.01em]",
      }}
    >
      <div className="relative min-h-[var(--c-vh)] text-c-on-bg">
        {/* Brand band */}
        <div className="relative bg-c-primary text-c-on-primary">
          <header className="flex items-center justify-between gap-3 px-4 pt-4 pb-[112px] pl-5 @4xl:mx-auto @4xl:max-w-[1160px] @4xl:px-10 @4xl:pt-8 @4xl:pb-[150px]">
            <Logo on={tokens.primary} className="text-c-on-primary" />
            <ShareButton className="border border-c-on-primary/30 text-c-on-primary hover:bg-c-on-primary/10" />
          </header>
          <span aria-hidden className="absolute inset-x-0 bottom-0 h-1.5 bg-c-accent" />
        </div>

        <div className="relative px-4 @4xl:mx-auto @4xl:grid @4xl:max-w-[1160px] @4xl:grid-cols-[380px_minmax(0,1fr)] @4xl:items-start @4xl:gap-10 @4xl:px-10">
          <div className="-mt-[92px] flex flex-col gap-4 @4xl:sticky @4xl:top-6 @4xl:-mt-[124px]">
            {/* Employee ID card */}
            <article aria-label={card.name} className="relative rounded-2xl border border-c-line bg-c-surface px-5 pt-7 pb-5 text-c-text shadow-[0_14px_32px_-18px_rgb(0_0_0/0.45)]">
              <span aria-hidden className="absolute top-3 left-1/2 h-2 w-12 -translate-x-1/2 rounded-full border border-c-line bg-c-bg" />
              <div className="flex items-start gap-4">
                <AgentPhoto shape="square" sizes="120px" priority className="w-[88px] shrink-0 !rounded-lg @4xl:w-[104px]" />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  {card.company && <p className={cn(MONO, "truncate text-[11px] tracking-[0.1em] text-c-text-muted uppercase")}>{card.company}</p>}
                  <H1 className="text-[1.5rem] leading-[1.12] font-semibold tracking-[-0.015em] [overflow-wrap:anywhere] [text-wrap:balance]">
                    <NameText name={card.name} />
                  </H1>
                  {card.title && <p className="text-[15px] leading-snug text-c-text-muted">{card.title}</p>}
                </div>
              </div>
              {(card.department || card.employeeId) && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-c-line pt-3.5">
                  {card.department && <span className="inline-flex min-h-7 items-center rounded-md bg-c-accent px-2.5 text-[13px] font-semibold text-c-primary">{card.department}</span>}
                  {card.employeeId && (
                    <span className={cn(MONO, "text-[13px] tabular-nums")}>
                      <span className="text-c-text-muted">ID </span>
                      {card.employeeId}
                    </span>
                  )}
                </div>
              )}
            </article>

            <div ref={actionsRef}>
              <ActionTiles />
            </div>
          </div>

          <main className="flex flex-col gap-4 pt-6 pb-28 @4xl:pt-8 @4xl:pb-16">
            {sections.map((key) => (
              <div key={key}>{render[key]()}</div>
            ))}
            <CardFooter tone="background" className="px-1 pt-2" />
          </main>
        </div>

        <StickyActionBar watch={actionsRef} />
      </div>
    </SectionStyle.Provider>
  );
}
