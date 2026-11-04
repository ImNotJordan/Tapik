"use client";

import { MapPin, Phone, UserPlus } from "lucide-react";
import { useRef } from "react";
import { visibleSections } from "@/lib/design/sections";
import type { ReorderableSection } from "@/lib/types";
import { cn } from "@/lib/utils";
import { MessageIcon, PrimaryActions, ShareButton, StickyActionBar, useContactActions } from "@/components/card/actions";
import { AddToCalendarButton, eventDate, useEvent } from "@/components/card/extras";
import { useLabels } from "@/components/card/labels";
import { AgentPhoto, CardImage, Logo, NameText } from "@/components/card/primitives";
import { AboutBlock, CardFooter, ContactList, MapBlock, OrgChartBlock, PhotoAlbum, QuoteBlock, SectionStyle, SocialLinks } from "@/components/card/sections";
import type { TemplateProps } from "../types";
import { CalendarBlock, CountdownStrip } from "./sections/poster";

const STYLE = {
  heading: "text-[clamp(2.1rem,10cqi,3rem)] leading-[0.92] uppercase",
  quote: "text-[clamp(1.9rem,9cqi,2.8rem)] leading-[1] uppercase",
};

/**
 * L — Event / Promo: a poster for a dated event. A live countdown, the date as
 * a tear-off calendar page, Add to calendar, then the host's contact card.
 * With no event set, the host's card becomes the poster.
 */
export default function EventPromoCard({ bundle, tokens, mode }: TemplateProps) {
  const H1 = mode === "public" ? "h1" : "p";
  const { card } = bundle;
  const L = useLabels();
  const event = useEvent();
  const { call, message, messageLabel, saveContact } = useContactActions();
  const actionsRef = useRef<HTMLDivElement>(null);
  const sections = visibleSections(bundle);
  const bg = card.backgroundPhotoUrl && !card.hiddenSections.includes("backgroundPhoto") ? card.backgroundPhotoUrl : null;
  const host = card.company?.trim() || card.name;
  const when = event ? eventDate(event) : null;

  const render: Record<ReorderableSection, () => React.ReactNode> = {
    quote: () => <QuoteBlock tone="background" />,
    about: () => <AboutBlock tone="background" heading />,
    contact: () => <ContactList tone="background" variant="rows" />,
    socials: () => <SocialLinks tone="background" variant="chips" />,
    photos: () => <PhotoAlbum tone="background" layout="carousel" />,
    map: () => <MapBlock tone="background" title={L.findUs} mapClassName="!h-52 !rounded-[20px] @3xl:!h-64" />,
    orgChart: () => <OrgChartBlock tone="background" />,
  };

  return (
    <SectionStyle.Provider value={STYLE}>
      <div className="relative min-h-[var(--c-vh)]">
        {bg && (
          <div aria-hidden className="absolute inset-x-0 top-0 h-[min(560px,72%)] overflow-hidden">
            <div className="motion-photo-settle absolute inset-0">
              <CardImage src={bg} alt="" sizes="100vw" priority focal={card.backgroundFocalPoint} className="size-full" failTone="background" />
            </div>
            <div className="absolute inset-0 bg-c-bg" style={{ opacity: "var(--c-overlay)" }} />
            <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-b from-transparent to-c-bg" />
          </div>
        )}

        <div className="relative @4xl:mx-auto @4xl:grid @4xl:max-w-[1160px] @4xl:grid-cols-[minmax(0,540px)_minmax(0,560px)] @4xl:items-start @4xl:justify-center @4xl:gap-16 @4xl:px-10 @4xl:py-10">
          {/* The poster */}
          <div className="flex flex-col @4xl:sticky @4xl:top-10">
            <header className="flex items-center justify-between gap-3 px-4 pt-4 pl-5 @4xl:px-0 @4xl:pt-0">
              <Logo on={tokens.background} className="text-c-on-bg" />
              <ShareButton className="border-2 border-c-on-bg text-c-on-bg hover:bg-c-bg-tint" />
            </header>

            {event && when ? (
              <div className="flex flex-col gap-6 px-5 pt-10 @4xl:px-0 @4xl:pt-14">
                <div className="flex flex-col gap-3">
                  <H1 className="motion-name-rise card-display text-[clamp(3rem,15cqi,5.25rem)] leading-[0.88] uppercase [overflow-wrap:anywhere] [text-wrap:balance]">
                    <span className="block">{event.title}</span>
                  </H1>
                  {/* The host reads as a byline under the title, poster-style, not as an eyebrow above it. */}
                  <p className="text-[17px] leading-snug">
                    {event.note && <span className="block max-w-[36ch]">{event.note}</span>}
                    {host && <span className="mt-1 block text-[15px] font-semibold text-c-on-bg-muted">{L.lang === "fil" ? "Handog ng" : "Presented by"} {host}</span>}
                  </p>
                </div>

                <div className="flex items-center gap-5">
                  <CalendarBlock event={event} />
                  <dl className="flex min-w-0 flex-col gap-2 text-[15px]">
                    <div>
                      <dt className="sr-only">When</dt>
                      <dd className="text-lg leading-tight font-semibold">
                        {when.weekday}, {when.time}
                      </dd>
                    </div>
                    {(event.venue || card.address) && (
                      <div className="flex gap-1.5">
                        <dt className="sr-only">Where</dt>
                        <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-c-accent" strokeWidth={2.25} />
                        <dd className="leading-snug text-c-on-bg-muted">{event.venue || card.address}</dd>
                      </div>
                    )}
                  </dl>
                </div>

                <CountdownStrip event={event} />
                <AddToCalendarButton className="cbtn-primary h-14 w-full text-base" />
              </div>
            ) : (
              /* No event: the host is the poster. */
              <div className="flex flex-col gap-6 px-5 pt-10 @4xl:px-0 @4xl:pt-14">
                <AgentPhoto shape="rounded-square" sizes="160px" priority tone="background" className="w-[34cqi] max-w-[150px]" />
                <div className="flex flex-col gap-2">
                  <H1 className="motion-name-rise card-display text-[clamp(2.8rem,14cqi,5rem)] leading-[0.9] uppercase [overflow-wrap:anywhere] [text-wrap:balance]">
                    <span className="block">
                      <NameText name={host} />
                    </span>
                  </H1>
                  <p className="text-[17px] leading-snug text-c-on-bg-muted">
                    {card.company?.trim() ? [card.name, card.title].filter(Boolean).join(", ") : card.title}
                  </p>
                </div>
                <div ref={actionsRef}>
                  <PrimaryActions layout="pair" />
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col">
            {event && (
              /* Host card: who to call about the event. */
              <section aria-label={card.name} className="mx-3 mt-12 rounded-[24px] bg-c-surface p-5 text-c-text @4xl:mx-0 @4xl:mt-[104px] @4xl:p-7">
                <p className="text-xs font-semibold tracking-[0.16em] text-c-text-muted uppercase">{L.lang === "fil" ? "Organisador" : "Hosted by"}</p>
                <div className="mt-3 flex items-center gap-4">
                  <AgentPhoto shape="rounded-square" sizes="96px" className="w-[76px] shrink-0" />
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <h2 className="card-display text-[1.75rem] leading-[0.95] uppercase [overflow-wrap:anywhere]">
                      <NameText name={card.name} />
                    </h2>
                    {card.title && <p className="text-[15px] leading-snug">{card.title}</p>}
                    {card.company && <p className="text-sm leading-snug text-c-text-muted">{card.company}</p>}
                  </div>
                </div>
                <div ref={actionsRef} className="mt-5 grid grid-cols-[1fr_1fr_48px] gap-2">
                  {call ? (
                    <a href={call} className={cn("cbtn cbtn-surface h-12 text-[15px]", !message && "col-span-2")}>
                      <Phone aria-hidden className="size-[18px]" strokeWidth={2} />
                      {L.call}
                    </a>
                  ) : null}
                  {message ? (
                    <a
                      href={message}
                      target={message.startsWith("http") ? "_blank" : undefined}
                      rel="noreferrer"
                      className={cn("cbtn h-12 min-w-0 border-[1.5px] border-c-line px-2 text-[15px] text-c-text hover:bg-c-surface-tint", !call && "col-span-2")}
                    >
                      <MessageIcon className="size-[18px] shrink-0" />
                      <span className="truncate">{messageLabel}</span>
                    </a>
                  ) : null}
                  {!call && !message && <span className="col-span-2" />}
                  <button type="button" onClick={saveContact} aria-label={L.saveToContacts} className="cbtn h-12 cursor-pointer border-[1.5px] border-c-line text-c-text hover:bg-c-surface-tint">
                    <UserPlus aria-hidden className="size-[18px]" strokeWidth={2} />
                  </button>
                </div>
              </section>
            )}

            <main className="flex flex-col gap-12 px-5 pt-12 pb-28 @4xl:px-0 @4xl:pb-10">
              {sections.map((key) => (
                <div key={key}>{render[key]()}</div>
              ))}
              <CardFooter tone="background" />
            </main>
          </div>
        </div>

        <StickyActionBar watch={actionsRef} />
      </div>
    </SectionStyle.Provider>
  );
}
