"use client";

import { CalendarCheck, Phone, UserPlus } from "lucide-react";
import { useRef } from "react";
import { visibleSections } from "@/lib/design/sections";
import type { ReorderableSection } from "@/lib/types";
import { cn } from "@/lib/utils";
import { MessageIcon, ShareButton, useContactActions } from "@/components/card/actions";
import { HoursTable, OpenBadge, ServiceChips, useBookingHref } from "@/components/card/extras";
import { useLabels } from "@/components/card/labels";
import { AgentPhoto, Logo, NameText } from "@/components/card/primitives";
import { AboutBlock, CardFooter, ContactList, MapBlock, PhotoAlbum, QuoteBlock, SectionStyle, SocialLinks } from "@/components/card/sections";
import type { TemplateProps } from "../types";
import { TeamList } from "./sections/team-list";
import { useScrolledPast } from "./sections/use-scrolled-past";

const STYLE = {
  heading: "text-[1.7rem] leading-tight",
  quote: "text-[clamp(1.45rem,6.4cqi,1.95rem)] leading-[1.3] italic",
};

const external = (href: string) => (href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {});

/**
 * H — Clinic Calm: an arched portrait and a centered name, the services as
 * chips, and Book an appointment as the one obvious action. Clinic hours sit
 * in a table; the team is an indented list. Everything below the hero is left-aligned.
 */
export default function ClinicCalmCard({ bundle, tokens, mode }: TemplateProps) {
  const H1 = mode === "public" ? "h1" : "p";
  const { card } = bundle;
  const L = useLabels();
  const { call, message, messageLabel, saveContact } = useContactActions();
  const booking = useBookingHref();
  const book = booking ?? message ?? call;
  const actionsRef = useRef<HTMLDivElement>(null);
  const past = useScrolledPast(actionsRef);
  const sections = visibleSections(bundle);

  const render: Record<ReorderableSection, () => React.ReactNode> = {
    quote: () => <QuoteBlock tone="background" />,
    about: () => <AboutBlock tone="background" heading />,
    contact: () => <ContactList tone="background" variant="rows" />,
    socials: () => <SocialLinks tone="background" variant="icons" />,
    photos: () => <PhotoAlbum tone="background" layout="grid" />,
    map: () => <MapBlock tone="background" title={L.findUs} mapClassName="!h-52 !rounded-[24px] @3xl:!h-64" />,
    orgChart: () => <TeamList />,
  };

  const secondary = [call, message, true].filter(Boolean).length;

  return (
    <SectionStyle.Provider value={STYLE}>
      <div className="relative min-h-[var(--c-vh)]">
        <div className="@4xl:mx-auto @4xl:grid @4xl:max-w-[1120px] @4xl:grid-cols-[minmax(0,420px)_minmax(0,620px)] @4xl:items-start @4xl:justify-center @4xl:gap-16 @4xl:px-10 @4xl:py-10">
          <div className="flex flex-col">
            <header className="flex items-center justify-between gap-3 px-4 pt-4 pl-5 @4xl:px-0 @4xl:pt-0">
              <Logo on={tokens.background} className="text-c-on-bg" />
              <ShareButton className="border border-c-bg-line text-c-on-bg hover:bg-c-bg-tint" />
            </header>

            {/* Hero: the one centered moment on the page */}
            <div className="flex flex-col items-center px-5 pt-8 text-center @4xl:px-0">
              <div className="relative w-[min(54cqi,224px)] @4xl:w-[230px]">
                <span aria-hidden className="absolute inset-0 translate-x-3 -translate-y-3 rounded-[999px_999px_14px_14px] border-[1.5px] border-c-accent" />
                <AgentPhoto shape="arch" sizes="240px" priority tone="background" className="relative w-full" />
              </div>
              <H1 className="card-display mt-7 max-w-[16ch] text-[clamp(2rem,9.4cqi,2.75rem)] leading-[1.08] [overflow-wrap:anywhere] [text-wrap:balance]">
                <NameText name={card.name} />
              </H1>
              {card.title && <p className="mt-2 text-[17px] leading-snug text-c-on-bg">{card.title}</p>}
              {card.company && <p className="text-[15px] leading-snug text-c-on-bg-muted">{card.company}</p>}
              {card.credential && <p className="mt-1 text-sm tabular-nums text-c-on-bg-muted">{card.credential}</p>}
              <ServiceChips tone="background" className="mt-5 justify-center" chipClassName="bg-c-bg-tint !border-transparent" />
            </div>

            <div ref={actionsRef} className="flex flex-col gap-2.5 px-5 pt-7 @4xl:px-0">
              {book && (
                <a href={book} {...external(book)} className="cbtn cbtn-primary h-14 w-full text-base">
                  <CalendarCheck aria-hidden className="size-5" strokeWidth={2} />
                  {L.book}
                </a>
              )}
              <div className={cn("grid gap-2", secondary === 3 ? "grid-cols-3" : secondary === 2 ? "grid-cols-2" : "grid-cols-1")}>
                {call && (
                  <a href={call} className="cbtn cbtn-secondary h-12 text-sm">
                    <Phone aria-hidden className="size-[18px]" strokeWidth={2} />
                    {L.call}
                  </a>
                )}
                {message && (
                  <a href={message} {...external(message)} className="cbtn cbtn-secondary h-12 min-w-0 px-2 text-sm">
                    <MessageIcon className="size-[18px] shrink-0" />
                    <span className="truncate">{messageLabel}</span>
                  </a>
                )}
                <button type="button" onClick={saveContact} className="cbtn cbtn-secondary h-12 cursor-pointer text-sm">
                  <UserPlus aria-hidden className="size-[18px]" strokeWidth={2} />
                  {L.save}
                </button>
              </div>
            </div>

            {card.hours?.length ? (
              <section aria-label={L.hours} className="mx-5 mt-8 rounded-[24px] bg-c-surface px-5 pt-5 pb-2 text-c-text @4xl:mx-0">
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                  <h2 className="card-display text-xl">{L.hours}</h2>
                  <OpenBadge tone="surface" className="!text-sm" />
                </div>
                <HoursTable tone="surface" title={L.hours} grouped={false} className="mt-1 [&_tr:last-child]:border-b-0" />
              </section>
            ) : null}
          </div>

          <main className="flex flex-col gap-12 px-5 pt-12 pb-32 @4xl:px-0 @4xl:pt-14 @4xl:pb-10">
            {sections.map((key) => (
              <div key={key}>{render[key]()}</div>
            ))}
            <CardFooter tone="background" />
          </main>
        </div>

        {/* Bottom bar: Book takes two thirds, Call one third. */}
        {book && (
          <div
            aria-hidden={!past}
            inert={!past}
            className={cn(
              "sticky bottom-0 z-40 -mt-[84px] h-[84px] transition-[transform,opacity] duration-300 [transition-timing-function:var(--ease-out-expo)] @4xl:hidden",
              past ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0",
            )}
          >
            <div className={cn("grid h-full gap-2 bg-c-bg px-4 pt-3 pb-[max(14px,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgb(0_0_0/0.12)]", call && book !== call ? "grid-cols-[2fr_1fr]" : "grid-cols-1")}>
              <a href={book} {...external(book)} className="cbtn cbtn-primary text-[15px]">
                <CalendarCheck aria-hidden className="size-[18px]" strokeWidth={2} />
                {L.book}
              </a>
              {call && book !== call && (
                <a href={call} className="cbtn cbtn-secondary text-[15px]">
                  <Phone aria-hidden className="size-[18px]" strokeWidth={2} />
                  {L.call}
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </SectionStyle.Provider>
  );
}
