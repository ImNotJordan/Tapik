"use client";

import { Mail, Phone, UserPlus } from "lucide-react";
import { useRef } from "react";
import { visibleSections } from "@/lib/design/sections";
import type { ReorderableSection } from "@/lib/types";
import { cn } from "@/lib/utils";
import { MessageIcon, ShareButton, useContactActions } from "@/components/card/actions";
import { HoursTable, OpenBadge, ServiceChips } from "@/components/card/extras";
import { useLabels } from "@/components/card/labels";
import { AgentPhoto, CardImage, Logo, NameText } from "@/components/card/primitives";
import { AboutBlock, CardFooter, ContactList, MapBlock, QuoteBlock, SectionStyle, SocialLinks } from "@/components/card/sections";
import type { TemplateProps } from "../types";
import { CrewRow, TiltedAlbum } from "./sections/counter-blocks";
import { useScrolledPast } from "./sections/use-scrolled-past";

const STYLE = {
  heading: "text-[clamp(1.9rem,9cqi,2.6rem)] leading-[0.95]",
  quote: "text-[clamp(1.7rem,8cqi,2.4rem)] leading-[1.05]",
};

/** The inked border every Sunny Counter element shares. */
const INK = "border-[2.5px] border-c-on-bg";

/**
 * E — Sunny Counter: a cheerful shopfront. A photo collage on top, the owner's
 * round photo over its edge, an Open now status, the business name as a heavy
 * headline, inked pill buttons and a floating pill bar once you scroll.
 */
export default function SunnyCounterCard({ bundle, tokens, mode }: TemplateProps) {
  const H1 = mode === "public" ? "h1" : "p";
  const { card } = bundle;
  const L = useLabels();
  const { call, message, messageLabel, saveContact } = useContactActions();
  const actionsRef = useRef<HTMLDivElement>(null);
  const past = useScrolledPast(actionsRef);
  const sections = visibleSections(bundle);

  // Collage: the background photo, then album photos (the album repeats them, so these are decorative).
  const bg = card.backgroundPhotoUrl && !card.hiddenSections.includes("backgroundPhoto") ? card.backgroundPhotoUrl : null;
  const tiles = [
    ...(bg ? [{ url: bg, alt: card.backgroundPhotoAlt || "", focal: card.backgroundFocalPoint }] : []),
    ...bundle.photos.filter((p) => p.url !== bg).map((p) => ({ url: p.url, alt: "", focal: undefined })),
  ].slice(0, 3);

  const headline = card.company?.trim() || card.name;
  const byline = card.company?.trim() ? [card.name, card.title].filter(Boolean).join(" · ") : card.title;

  const render: Record<ReorderableSection, () => React.ReactNode> = {
    quote: () => <QuoteBlock tone="background" />,
    about: () => <AboutBlock tone="background" />,
    contact: () => <ContactList tone="background" variant="rows" />,
    socials: () => <SocialLinks tone="background" variant="chips" />,
    photos: () => <TiltedAlbum />,
    map: () => <MapBlock tone="background" title={L.findUs} mapClassName="!h-52 !rounded-[22px] border-[2.5px] border-c-on-bg @3xl:!h-64" />,
    orgChart: () => <CrewRow />,
  };

  return (
    <SectionStyle.Provider value={STYLE}>
      <div className="relative min-h-[var(--c-vh)]">
        <div className="@4xl:mx-auto @4xl:grid @4xl:max-w-[1160px] @4xl:grid-cols-[minmax(0,470px)_minmax(0,600px)] @4xl:justify-center @4xl:gap-14 @4xl:px-10 @4xl:py-10">
          {/* Shopfront */}
          <div className="flex flex-col">
            <div className="relative @4xl:overflow-hidden @4xl:rounded-[28px] @4xl:border-[2.5px] @4xl:border-c-on-bg">
              {tiles.length > 0 ? (
                <div
                  className={cn(
                    "motion-photo-settle grid h-[clamp(240px,66cqi,340px)] gap-1 overflow-hidden bg-c-on-bg @4xl:h-[320px]",
                    tiles.length === 3 ? "grid-cols-[3fr_2fr] grid-rows-2" : tiles.length === 2 ? "grid-cols-2" : "grid-cols-1",
                  )}
                >
                  {tiles.map((t, i) => (
                    <CardImage
                      key={t.url}
                      src={t.url}
                      alt={t.alt}
                      sizes={i === 0 ? "(min-width: 1024px) 470px, 60vw" : "(min-width: 1024px) 200px, 40vw"}
                      priority={i === 0}
                      focal={t.focal}
                      className={cn("size-full", tiles.length === 3 && i === 0 && "row-span-2")}
                      failTone="background"
                    />
                  ))}
                </div>
              ) : (
                <div aria-hidden className="h-24 @4xl:h-16" />
              )}
              <header className="absolute inset-x-0 top-0 flex items-center justify-between gap-3 p-3">
                {(card.logoUrl || card.logoDarkUrl || card.company) && !card.hiddenSections.includes("logo") ? (
                  <span className={cn("flex h-11 max-w-[70%] min-w-0 items-center rounded-full bg-c-surface px-4 text-c-text", INK)}>
                    <Logo on={tokens.surface} className="h-6 max-w-full text-c-text" />
                  </span>
                ) : (
                  <span />
                )}
                <ShareButton className={cn("bg-c-surface text-c-text hover:bg-c-surface-tint", INK)} />
              </header>
            </div>

            {/* Owner over the collage's edge, with today's status beside them */}
            <div className={cn("relative flex items-end gap-3 px-5", tiles.length ? "-mt-14" : "mt-2")}>
              <span className="shrink-0 rounded-full border-[5px] border-c-bg">
                <AgentPhoto shape="circle" sizes="120px" priority tone="background" className="size-[104px]" />
              </span>
              <OpenBadge tone="surface" className={cn("mb-1 h-11 rounded-full bg-c-surface px-3.5 !text-sm", INK)} />
            </div>

            <div className="flex flex-col gap-4 px-5 pt-5 @4xl:px-0">
              <div className="flex flex-col gap-2">
                <H1 className="card-display text-[clamp(2.3rem,12.8cqi,3.4rem)] leading-[0.92] [overflow-wrap:anywhere] [text-wrap:balance]">
                  <NameText name={headline} />
                </H1>
                {byline && <p className="text-[17px] leading-snug font-medium text-c-on-bg-muted">{byline}</p>}
                {card.credential && <p className="text-sm text-c-on-bg-muted">{card.credential}</p>}
              </div>
              <ServiceChips tone="background" chipClassName="!min-h-10 bg-c-surface font-semibold !text-c-text !border-[2.5px] !border-c-on-bg" />
            </div>

            <div ref={actionsRef} className="flex flex-col gap-2.5 px-5 pt-6 @4xl:px-0">
              {(call || message) && (
                <div className="grid grid-cols-2 gap-2.5">
                  {call && (
                    <a href={call} className={cn("cbtn cbtn-primary h-14 text-base font-bold !border-[2.5px] !border-c-on-bg", !message && "col-span-2")}>
                      <Phone aria-hidden className="size-5" strokeWidth={2.25} />
                      {L.call}
                    </a>
                  )}
                  {message && (
                    <a
                      href={message}
                      target={message.startsWith("http") ? "_blank" : undefined}
                      rel="noreferrer"
                      className={cn("cbtn h-14 bg-c-surface text-base font-bold text-c-text hover:bg-c-surface-tint", INK, !call && "col-span-2")}
                    >
                      <MessageIcon />
                      {messageLabel}
                    </a>
                  )}
                </div>
              )}
              <div className="flex flex-wrap items-center justify-between gap-x-4">
                <button type="button" onClick={saveContact} className="inline-flex h-11 cursor-pointer items-center gap-2 text-[15px] font-bold underline decoration-2 underline-offset-4">
                  <UserPlus aria-hidden className="size-[18px]" strokeWidth={2.25} />
                  {L.saveContact}
                </button>
                {card.email && (
                  <a href={`mailto:${card.email}`} className="inline-flex h-11 min-w-0 items-center gap-2 text-[15px] font-bold underline decoration-2 underline-offset-4">
                    <Mail aria-hidden className="size-[18px] shrink-0" strokeWidth={2.25} />
                    {L.email}
                  </a>
                )}
              </div>
            </div>

            {card.hours?.length ? (
              <section aria-label={L.hours} className={cn("mx-5 mt-6 rounded-[22px] bg-c-surface px-5 pt-4 pb-2 text-c-text @4xl:mx-0", INK)}>
                <h2 className="card-display text-xl">{L.hours}</h2>
                <HoursTable tone="surface" title={L.hours} className="[&_tr:last-child]:border-b-0" />
              </section>
            ) : null}
          </div>

          <main className="flex flex-col gap-12 px-5 pt-12 pb-32 @4xl:px-0 @4xl:pt-2 @4xl:pb-10">
            {sections.map((key) => (
              <div key={key}>{render[key]()}</div>
            ))}
            <CardFooter tone="background" />
          </main>
        </div>

        {/* Floating pill bar: appears once the main buttons scroll away. */}
        {(call || message) && (
          <div
            aria-hidden={!past}
            inert={!past}
            className={cn(
              "pointer-events-none sticky bottom-0 z-40 -mt-[92px] flex h-[92px] items-end px-4 pb-[max(14px,env(safe-area-inset-bottom))] transition-[transform,opacity] duration-300 [transition-timing-function:var(--ease-out-expo)] @4xl:hidden",
              past ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
            )}
          >
            <div className={cn("pointer-events-auto grid h-16 w-full grid-cols-[1fr_1fr_64px] items-stretch overflow-hidden rounded-full bg-c-primary p-1.5 text-c-on-primary shadow-[0_10px_30px_-8px_rgb(0_0_0/0.45)]", INK)}>
              {call ? (
                <a href={call} className="flex items-center justify-center gap-2 rounded-full text-[15px] font-bold hover:bg-white/10">
                  <Phone aria-hidden className="size-[18px]" strokeWidth={2.25} />
                  {L.call}
                </a>
              ) : (
                <span />
              )}
              {message ? (
                <a href={message} target={message.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="flex items-center justify-center gap-2 rounded-full bg-c-surface text-[15px] font-bold text-c-text">
                  <MessageIcon className="size-[18px]" />
                  {messageLabel}
                </a>
              ) : (
                <span />
              )}
              <button type="button" onClick={saveContact} aria-label={L.saveToContacts} className="flex cursor-pointer items-center justify-center rounded-full hover:bg-white/10">
                <UserPlus aria-hidden className="size-5" strokeWidth={2.25} />
              </button>
            </div>
          </div>
        )}
      </div>
    </SectionStyle.Provider>
  );
}
