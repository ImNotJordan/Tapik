"use client";

import { ArrowRight, Phone, UserPlus } from "lucide-react";
import { useRef } from "react";
import { visibleSections } from "@/lib/design/sections";
import type { ReorderableSection } from "@/lib/types";
import { cn, initials } from "@/lib/utils";
import { MessageIcon, ShareButton, StickyActionBar, useContactActions } from "@/components/card/actions";
import { HoursTable, OpenBadge } from "@/components/card/extras";
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
  SectionHeading,
  SectionStyle,
  SocialLinks,
  type HeadingProps,
} from "@/components/card/sections";
import type { TemplateProps } from "../types";
import { ServiceRoute } from "./sections/route";

/** Road-sign headings: a primary post beside condensed capitals. */
function SignHeading({ children, aside, id }: HeadingProps) {
  return (
    <div className="flex items-center gap-3">
      <span aria-hidden className="h-[22px] w-[7px] shrink-0 bg-c-primary" />
      <h2 id={id} className="card-display min-w-0 flex-1 text-[1.75rem] leading-none uppercase">
        {children}
      </h2>
      {aside && <span className="shrink-0 font-[family-name:var(--c-font-mono)] text-xs text-c-on-bg-muted">{aside}</span>}
    </div>
  );
}

const STYLE = {
  renderHeading: (p: HeadingProps) => <SignHeading {...p} />,
  quote: "uppercase text-[clamp(1.9rem,9cqi,2.9rem)] leading-[1] [text-wrap:balance]",
};

function longestWord(name: string): number {
  return Math.max(6, ...name.trim().split(/\s+/).map((w) => w.length));
}

/** Route shield:the digits of the ID ("0417"), else initials. */
function shieldCode(employeeId: string | undefined, name: string) {
  const digits = employeeId?.match(/\d+/g)?.pop();
  return digits ? digits.slice(-4) : initials(name);
}

/**
 * N — Transport & Logistics. The header is a highway sign standing in front of
 * the road photo; Call dispatch is big enough for gloved hands; service areas
 * run as stops along a route; dispatch hours and the fleet follow.
 */
export default function TransitCard({ bundle, tokens, mode }: TemplateProps) {
  const H1 = mode === "public" ? "h1" : "p";
  const { card } = bundle;
  const L = useLabels();
  const { call, message, messageLabel, saveContact } = useContactActions();
  const actionsRef = useRef<HTMLDivElement>(null);
  const sections = visibleSections(bundle);
  const cover = card.backgroundPhotoUrl && !card.hiddenSections.includes("backgroundPhoto") ? card.backgroundPhotoUrl : null;
  const hasHours = !!card.hours?.length;

  const render: Record<ReorderableSection, () => React.ReactNode> = {
    quote: () => <QuoteBlock tone="background" />,
    about: () => <AboutBlock tone="background" heading />,
    contact: () => (
      <section className="flex flex-col gap-3">
        <SignHeading tone="background">{L.contactDetails}</SignHeading>
        <ContactList tone="background" variant="rows" />
      </section>
    ),
    socials: () => <SocialLinks tone="background" variant="icons" />,
    photos: () => <PhotoAlbum tone="background" layout="carousel" />,
    map: () => <MapBlock tone="background" title={L.office} />,
    orgChart: () => <OrgChartBlock tone="background" />,
  };

  return (
    <SectionStyle.Provider value={STYLE}>
      <div className="relative min-h-[var(--c-vh)]">
        <header className="mx-auto flex max-w-[1180px] items-center justify-between gap-3 px-4 py-3 pl-5 @4xl:px-10 @4xl:py-5">
          {/* The sign carries the company name; without an image logo, skip the text fallback. */}
          {card.logoUrl || card.logoDarkUrl || !card.company ? <Logo on={tokens.background} className="text-c-on-bg" /> : <span />}
          <ShareButton className="border-2 border-c-on-bg text-c-on-bg hover:bg-c-bg-tint" />
        </header>

        {cover && (
          <div className="relative h-[clamp(240px,62cqi,400px)] overflow-hidden">
            <div className="motion-photo-settle absolute inset-0">
              <CardImage src={cover} alt={card.backgroundPhotoAlt || ""} sizes="100vw" priority focal={card.backgroundFocalPoint} className="size-full" failTone="background" />
            </div>
            <div aria-hidden className="absolute inset-0 bg-black" style={{ opacity: "calc(var(--c-overlay) * 0.5)" }} />
          </div>
        )}

        <div className="mx-auto max-w-[1180px] @4xl:grid @4xl:grid-cols-[minmax(380px,440px)_minmax(0,1fr)] @4xl:gap-14 @4xl:px-10">
          <div className={cn("relative z-10 flex flex-col px-4 @4xl:sticky @4xl:top-6 @4xl:self-start @4xl:px-0", cover ? "-mt-20 @4xl:-mt-36" : "mt-2")}>
            {/* The sign */}
            <section aria-label={card.name} className="rounded-[14px] bg-c-primary p-[7px] text-c-on-primary shadow-[0_18px_40px_-18px_rgb(0_0_0/0.6)]">
              <div className="rounded-[9px] border-[2.5px] border-c-on-primary px-5 pt-4 pb-5">
                <div className="flex items-center gap-3">
                  <span aria-hidden className="relative flex h-11 w-10 shrink-0 items-center justify-center">
                    <svg viewBox="0 0 40 44" className="absolute inset-0 size-full">
                      <path d="M3 5.5Q20 -0.5 37 5.5V22Q37 36 20 43Q3 36 3 22Z" fill="var(--c-accent)" stroke="var(--c-on-primary)" strokeWidth="2" />
                    </svg>
                    <span className="relative pt-0.5 font-[family-name:var(--c-font-mono)] text-[11px] font-bold text-c-primary">{shieldCode(card.employeeId, card.name)}</span>
                  </span>
                  <p className="card-display min-w-0 flex-1 text-[15px] leading-tight tracking-[0.04em] uppercase">{card.company}</p>
                  <AgentPhoto shape="rounded-square" sizes="80px" priority className="w-[68px] shrink-0 border-2 border-c-on-primary" />
                </div>
                {/* Sized from the longest word so the name wraps only between words, like sign lettering. */}
                <H1
                  className="card-display mt-4 leading-[0.9] uppercase"
                  style={{ fontSize: `min(3.6rem, calc((min(100cqi, 440px) - 92px) / ${(longestWord(card.name) * 0.5).toFixed(2)}))` }}
                >
                  <NameText name={card.name} />
                </H1>
                {card.title && (
                  <p className="mt-2 flex items-center gap-2 text-[17px] font-semibold">
                    <ArrowRight aria-hidden className="size-5 shrink-0" strokeWidth={2.75} />
                    {card.title}
                  </p>
                )}
              </div>
            </section>

            {card.employeeId && (
              <div className="mt-4 flex items-center gap-3">
                <span className="inline-flex flex-col items-center rounded-[6px] border-[3px] border-c-text bg-c-surface px-4 pt-0.5 pb-1 text-c-text">
                  <span className="text-[11px] font-semibold tracking-[0.16em] uppercase">Dispatch</span>
                  <span className="font-[family-name:var(--c-font-mono)] text-[19px] leading-none font-bold tracking-[0.08em]">{card.employeeId}</span>
                </span>
              </div>
            )}

            <div ref={actionsRef} className="flex flex-col gap-2.5 pt-5">
              {call && (
                <a href={call} className="cbtn cbtn-primary min-h-[72px] justify-between px-5">
                  <span className="flex items-center gap-3">
                    <Phone aria-hidden className="size-6" strokeWidth={2.5} />
                    <span className="card-display text-[1.75rem] leading-none uppercase">{L.call}</span>
                  </span>
                  <span className="font-[family-name:var(--c-font-mono)] text-sm tabular-nums">{card.phone}</span>
                </a>
              )}
              <div className="flex gap-2.5">
                {message && (
                  <a href={message} target={message.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="cbtn cbtn-secondary h-14 flex-1 border-2 px-4 text-base">
                    <MessageIcon />
                    {messageLabel}
                  </a>
                )}
                <button
                  type="button"
                  onClick={saveContact}
                  aria-label={L.saveContact}
                  className={cn("cbtn cbtn-secondary h-14 cursor-pointer border-2", message ? "w-14 shrink-0" : "flex-1 px-4 text-base")}
                >
                  <UserPlus aria-hidden className="size-5" strokeWidth={2.25} />
                  {!message && L.saveContact}
                </button>
              </div>
              {hasHours && <OpenBadge tone="background" className="pt-2" />}
            </div>
          </div>

          <main className="flex flex-col gap-12 px-5 pt-12 pb-28 @4xl:px-0 @4xl:pt-10 @4xl:pb-16">
            <ServiceRoute />
            {hasHours && (
              <section aria-label={L.hours} className="flex flex-col gap-2">
                <SectionHeading tone="background">{L.hours}</SectionHeading>
                <HoursTable tone="background" title={L.hours} />
              </section>
            )}
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
