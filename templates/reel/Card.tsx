"use client";

import { Phone, UserPlus } from "lucide-react";
import { useRef, type CSSProperties } from "react";
import { visibleSections } from "@/lib/design/sections";
import type { ReorderableSection } from "@/lib/types";
import { cn } from "@/lib/utils";
import { MessageIcon, ShareButton, StickyActionBar, useContactActions } from "@/components/card/actions";
import { FitLine } from "@/components/card/fit-line";
import { useLabels } from "@/components/card/labels";
import { AgentPhoto, CardImage, Logo } from "@/components/card/primitives";
import { AboutBlock, CardFooter, ContactList, MapBlock, OrgChartBlock, QuoteBlock, SectionStyle, T, type SectionStyleValue } from "@/components/card/sections";
import type { TemplateProps } from "../types";
import { FilmStrip } from "./sections/film-strip";
import { SocialRows } from "./sections/social-rows";

/** Poster lines: the last word gets its own (neon) line; the rest balance over at most two lines. */
function nameLines(name: string): string[] {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 1) return words;
  const last = words.pop()!;
  if (words.length <= 2) return [...words, last];
  let split = 1;
  let best = Infinity;
  for (let i = 1; i < words.length; i++) {
    const d = Math.abs(words.slice(0, i).join(" ").length - words.slice(i).join(" ").length);
    if (d < best) {
      best = d;
      split = i;
    }
  }
  return [words.slice(0, split).join(" "), words.slice(split).join(" "), last];
}

const mono = "[font-family:var(--c-font-mono)] uppercase tracking-[0.12em]";

const STYLE: SectionStyleValue = {
  quote: "uppercase text-[clamp(2rem,10.5cqi,3.6rem)] leading-[0.95]",
  renderHeading: ({ children, tone, aside, id }) => (
    <div className={cn("flex items-end justify-between gap-4 border-t-2 pt-3", tone === "surface" ? "border-c-text" : "border-c-on-bg")}>
      <h2 id={id} className={cn("card-display text-[clamp(2.5rem,13cqi,4.5rem)] leading-[0.88] uppercase", T[tone].text)}>
        {children}
      </h2>
      {aside && <span className={cn("shrink-0 pb-1.5 text-[12px] tabular-nums", mono, T[tone].muted)}>{aside}</span>}
    </div>
  ),
};

/** Viewfinder corners: frame the hero like a camera monitor. */
function Corners() {
  const c = "absolute size-6 border-c-accent";
  return (
    <span aria-hidden className="pointer-events-none absolute inset-4 @4xl:inset-8">
      <span className={cn(c, "top-0 left-0 border-t-2 border-l-2")} />
      <span className={cn(c, "top-0 right-0 border-t-2 border-r-2")} />
      <span className={cn(c, "bottom-0 left-0 border-b-2 border-l-2")} />
      <span className={cn(c, "right-0 bottom-0 border-r-2 border-b-2")} />
    </span>
  );
}

/**
 * F — Reel: a film poster. A tall photo with the name in huge uppercase (last
 * line in neon), a tilted portrait with a neon border, square buttons, a film
 * strip album and socials as big type rows. Mono labels throughout.
 */
export default function ReelCard({ bundle, tokens, mode }: TemplateProps) {
  const H1 = mode === "public" ? "h1" : "p";
  const { card } = bundle;
  const L = useLabels();
  const { call, message, messageLabel, saveContact } = useContactActions();
  const actionsRef = useRef<HTMLDivElement>(null);
  const sections = visibleSections(bundle);
  const photo = card.backgroundPhotoUrl && !card.hiddenSections.includes("backgroundPhoto") ? card.backgroundPhotoUrl : null;
  const lines = nameLines(card.name);
  const meta = [card.title, card.company].filter(Boolean).join(" — ");

  const render: Record<ReorderableSection, () => React.ReactNode> = {
    quote: () => <QuoteBlock tone="background" />,
    about: () => <AboutBlock tone="background" heading />,
    contact: () => <ContactList tone="background" variant="rows" />,
    socials: () => <SocialRows />,
    photos: () => <FilmStrip />,
    map: () => <MapBlock tone="background" title={L.lang === "en" ? "Studio" : L.office} mapClassName="!rounded-none !h-52 @3xl:!h-64" />,
    orgChart: () => <OrgChartBlock tone="background" title={L.lang === "en" ? "Crew" : L.team} />,
  };

  return (
    <SectionStyle.Provider value={STYLE}>
      <div className="relative min-h-[var(--c-vh)]">
        {/* Poster */}
        <div className="relative h-[560px] overflow-hidden @4xl:h-[min(var(--c-vh),860px)]">
          {photo && (
            <>
              <div className="motion-photo-settle absolute inset-0">
                <CardImage src={photo} alt={card.backgroundPhotoAlt || ""} sizes="100vw" priority focal={card.backgroundFocalPoint} className="size-full" failTone="background" />
              </div>
              <div aria-hidden className="absolute inset-0 bg-c-bg" style={{ opacity: "calc(var(--c-overlay) * 0.6)" }} />
              <div
                aria-hidden
                className="absolute inset-0"
                style={{ background: "linear-gradient(180deg, color-mix(in oklab, var(--c-bg) 70%, transparent) 0%, transparent 22%, transparent 38%, color-mix(in oklab, var(--c-bg) 88%, transparent) 72%, var(--c-bg) 100%)" }}
              />
            </>
          )}
          <Corners />

          <header className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-3 px-7 pt-7 @4xl:px-14 @4xl:pt-12">
            <Logo on={tokens.background} className="text-c-on-bg" />
            <ShareButton className="rounded-none border-2 border-c-on-bg bg-c-bg/40 text-c-on-bg hover:bg-c-bg" />
          </header>

          {!card.hiddenSections.includes("agentPhoto") && (
          <div className="absolute top-[84px] right-[7cqi] z-10 w-[33cqi] max-w-[220px] rotate-[4deg] border-[3px] border-c-accent bg-c-bg shadow-[0_18px_40px_-12px_rgb(0_0_0/0.7)] @4xl:top-32 @4xl:right-16 @4xl:w-[220px]">
            <AgentPhoto shape="square" sizes="220px" priority tone="background" className="w-full !rounded-none" />
          </div>
          )}

          <H1
            className="motion-name-rise card-display absolute inset-x-0 bottom-0 z-10 flex flex-col px-5 pb-5 leading-[0.84] uppercase [--reel-cap:132px] @4xl:px-14 @4xl:pb-12 @4xl:[--reel-cap:220px]"
          >
            {lines.map((line, i) => (
              <FitLine
                key={i}
                max={`min(var(--reel-cap), ${(94 / Math.max(line.length * 0.47, 1)).toFixed(2)}cqi)`}
                style={{ color: i === lines.length - 1 ? "var(--c-accent)" : undefined, paddingTop: i > 0 ? "0.09em" : undefined } as CSSProperties}
              >
                {line}
                {i < lines.length - 1 ? " " : ""}
              </FitLine>
            ))}
          </H1>
        </div>

        <div className="@4xl:mx-auto @4xl:grid @4xl:max-w-[1280px] @4xl:grid-cols-[minmax(300px,4fr)_minmax(0,7fr)] @4xl:items-start @4xl:gap-16 @4xl:px-14 @4xl:pt-12">
          {/* Slate: who, and the three things to do */}
          <div className="flex flex-col gap-5 px-5 pt-5 @4xl:sticky @4xl:top-10 @4xl:px-0 @4xl:pt-0">
            {(meta || card.credential) && (
              <div className={cn("flex flex-col gap-1 text-[12px] leading-relaxed text-c-on-bg-muted", mono)}>
                {meta && <p className="text-c-on-bg">{meta}</p>}
                {card.credential && <p>{card.credential}</p>}
              </div>
            )}
            <div ref={actionsRef} className="flex flex-col gap-2">
              {(call || message) && (
                <div className="grid grid-cols-2 gap-2">
                  {call && (
                    <a href={call} className={cn("cbtn cbtn-primary h-14 text-base", !message && "col-span-2")}>
                      <Phone aria-hidden className="size-5" strokeWidth={2.25} />
                      {L.call}
                    </a>
                  )}
                  {message && (
                    <a
                      href={message}
                      target={message.startsWith("http") ? "_blank" : undefined}
                      rel="noreferrer"
                      className={cn("cbtn cbtn-secondary h-14 border-2 text-base", !call && "col-span-2")}
                      style={{ borderColor: "var(--c-on-bg)" }}
                    >
                      <MessageIcon />
                      {messageLabel}
                    </a>
                  )}
                </div>
              )}
              <button type="button" onClick={saveContact} className={cn("cbtn cbtn-secondary h-12 cursor-pointer text-[13px]", mono)}>
                <UserPlus aria-hidden className="size-[18px]" strokeWidth={2} />
                {L.saveContact}
              </button>
            </div>
          </div>

          <main className="flex flex-col gap-14 px-5 pt-14 pb-28 @4xl:px-0 @4xl:pt-0 @4xl:pb-16">
            {sections.map((key) => (
              <div key={key}>{render[key]()}</div>
            ))}
            <CardFooter tone="background" className={cn("text-[11px]", mono)} />
          </main>
        </div>

        <StickyActionBar watch={actionsRef} />
      </div>
    </SectionStyle.Provider>
  );
}
