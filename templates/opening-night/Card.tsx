"use client";

import { ArrowRight, MapPin, Phone, UserPlus } from "lucide-react";
import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { luminance } from "@/lib/design/contrast";
import { visibleSections } from "@/lib/design/sections";
import type { ReorderableSection } from "@/lib/types";
import { cn } from "@/lib/utils";
import { MessageIcon, ShareButton, useContactActions } from "@/components/card/actions";
import { useCard } from "@/components/card/context";
import { usePrimaryCta, useEvent, type PrimaryCta } from "@/components/card/extras";
import { useLabels } from "@/components/card/labels";
import { NameText } from "@/components/card/primitives";
import { AboutBlock, CardFooter, ContactList, MapBlock, SectionStyle, SocialLinks } from "@/components/card/sections";
import { useScrollRoot } from "@/components/ui/device-preview";
import type { TemplateProps } from "../types";
import { Countdown, HeroPanel } from "./sections/hero";
import { Album, Crew, Owners, SheetHeading } from "./sections/sheet";

const CTA_LABEL = "Reserve a table";

/*
 * Template-scoped CSS: the one motion moment (the date circle stamps in),
 * the live dot, and focus rings that stay visible where the default
 * currentColor ring would vanish (ink text on the pop button, the dark bar).
 */
const CSS = `
[data-template="opening-night"] .on-cta:focus-visible { outline-color: var(--c-on-bg); }
[data-template="opening-night"] .on-bar :focus-visible { outline-color: var(--c-surface); outline-offset: 2px; }
@media (prefers-reduced-motion: no-preference) {
  [data-template="opening-night"][data-motion="on"] .on-stamp { animation: on-stamp 1000ms var(--ease-out-expo) both; }
  [data-template="opening-night"][data-motion="on"] .on-ping { animation: on-ping 1.8s var(--ease-out-quart) infinite; }
}
@keyframes on-stamp { from { transform: scale(0.72) rotate(-12deg); opacity: 0.35; } to { transform: none; opacity: 1; } }
@keyframes on-ping { from { transform: scale(1); opacity: 0.7; } to { transform: scale(2.4); opacity: 0; } }
`;

/**
 * M — Opening Night. Events and promos: a rounded panel with the date in a
 * big pop-colored circle and the time on a chip, the event headline, a live
 * countdown to the second, Reserve a table, then a cream sheet with the
 * owners and their quote, a strip of photos, the map, the crew, socials and
 * Save. A floating dark pill keeps Reserve and Call in reach. On wide
 * screens the hero holds still on the left while the sheet scrolls beside it.
 */
export default function OpeningNightCard({ bundle, tokens, mode }: TemplateProps) {
  const { card } = bundle;
  const L = useLabels();
  const event = useEvent();
  const cta = usePrimaryCta(CTA_LABEL);
  const actionsRef = useRef<HTMLDivElement>(null);
  const H1 = mode === "public" ? "h1" : "p";

  const visible = visibleSections(bundle);
  const quote = visible.includes("quote") ? card.quote?.trim() : undefined;
  const order: (ReorderableSection | "save")[] = visible.filter((k) => k !== "quote");
  // Save follows the socials; without them it closes the sheet.
  order.splice(order.includes("socials") ? order.indexOf("socials") + 1 : order.length, 0, "save");

  const render: Record<ReorderableSection | "save", () => ReactNode> = {
    quote: () => null,
    photos: () => <Album />,
    // The pin takes the ground color: the pop color is too light on cream.
    map: () => (
      <div style={{ "--c-accent": "var(--c-bg)" } as CSSProperties}>
        <MapBlock tone="surface" title={L.findUs} mapClassName="!h-48 !rounded-[24px] @4xl:!h-56" />
      </div>
    ),
    orgChart: () => <Crew />,
    socials: () => (
      <Titled title={L.socialProfiles}>
        <SocialLinks tone="surface" variant="chips" />
      </Titled>
    ),
    contact: () => (
      <Titled title={L.contactDetails}>
        <ContactList tone="surface" variant="rows" />
      </Titled>
    ),
    about: () => <AboutBlock tone="surface" heading />,
    save: () => <SaveButton />,
  };

  return (
    <SectionStyle.Provider value={{ renderHeading: (p) => <SheetHeading {...p} /> }}>
      <style>{CSS}</style>
      <div className="relative min-h-[var(--c-vh)]">
        <div className="mx-auto flex w-full max-w-[560px] flex-col @4xl:grid @4xl:max-w-[1120px] @4xl:grid-cols-[minmax(0,480px)_minmax(0,540px)] @4xl:items-start @4xl:justify-center @4xl:gap-14 @4xl:px-10 @4xl:py-10">
          {/* Hero */}
          <div className="flex flex-col @4xl:sticky @4xl:top-10">
            <header className="flex min-h-[68px] items-center gap-3 px-4 pt-3 pb-2 pl-5 @4xl:px-0 @4xl:pt-0">
              <Wordmark ground={tokens.background} showName={!!event} />
              <ShareButton className="border-[1.5px] border-[color:color-mix(in_oklab,var(--c-on-bg)_55%,var(--c-bg))] text-c-on-bg hover:bg-c-bg-tint" />
            </header>

            <div className="px-4 @4xl:px-0">
              <HeroPanel event={event} />
            </div>

            {event ? (
              <div className="flex flex-col gap-3 px-5 pt-7 @4xl:px-1">
                {event.eyebrow?.trim() && (
                  <p className="inline-flex items-center gap-2 self-start text-[12px] leading-none font-bold tracking-[0.16em] uppercase">
                    <span aria-hidden className="size-2 shrink-0 rounded-full bg-c-primary" />
                    {event.eyebrow.trim()}
                  </p>
                )}
                <H1 className="card-display text-[clamp(1.75rem,8.2cqi,2.5rem)] leading-[1.06] [overflow-wrap:anywhere] [text-wrap:balance] @4xl:text-[2.5rem]">{event.title}</H1>
                {event.note?.trim() && <p className="max-w-[40ch] text-[17px] leading-[1.5] text-c-on-bg-muted">{event.note.trim()}</p>}
                {(event.venue?.trim() || card.address?.trim()) && (
                  <p className="flex items-start gap-2 text-[15px] leading-snug font-medium">
                    <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-c-primary" strokeWidth={2.25} />
                    {event.venue?.trim() || card.address?.trim()}
                  </p>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-2 px-5 pt-7 @4xl:px-1">
                <H1 className="card-display text-[clamp(1.75rem,8.2cqi,2.5rem)] leading-[1.06] [overflow-wrap:anywhere] [text-wrap:balance] @4xl:text-[2.5rem]">
                  <NameText name={card.name} />
                </H1>
                {(card.title || card.company) && (
                  <p className="text-[17px] leading-snug text-c-on-bg-muted">{[card.title, card.company && card.company !== card.name ? card.company : ""].filter(Boolean).join(" · ")}</p>
                )}
              </div>
            )}

            {event && (
              <div className="px-4 pt-6 @4xl:px-0">
                <Countdown event={event} />
              </div>
            )}

            <div ref={actionsRef} className="px-4 pt-6 @4xl:px-0">
              <HeroActions cta={cta} />
            </div>
          </div>

          {/* Cream sheet */}
          <main className="mt-10 flex flex-1 flex-col gap-11 rounded-t-[32px] bg-c-surface px-5 pt-9 pb-32 text-c-text @4xl:mt-0 @4xl:flex-none @4xl:rounded-[32px] @4xl:px-8 @4xl:pt-10 @4xl:pb-10">
            <Owners identity={!!event} quote={quote} />
            {order.map((key) => (
              <div key={key}>{render[key]()}</div>
            ))}
            <CardFooter tone="surface" />
          </main>
        </div>

        <BottomBar watch={actionsRef} cta={cta} />
      </div>
    </SectionStyle.Provider>
  );
}

/* ------------------------------------------------------------- Pieces */

/** Logo on the ground; without one, the name as a wordmark (only when the h1 is the event, not the name). */
function Wordmark({ ground, showName }: { ground: string; showName: boolean }) {
  const { bundle, isHidden } = useCard();
  const c = bundle.card;
  const dark = luminance(ground) < 0.35;
  const src = isHidden("logo") ? undefined : dark ? c.logoDarkUrl || c.logoUrl : c.logoUrl || c.logoDarkUrl;
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element -- logos are of unknown aspect ratio
    return <img src={src} alt={c.logoAlt || c.company || c.name} className="h-10 w-auto max-w-[150px] object-contain object-left" />;
  }
  if (!showName || isHidden("logo")) return <span />;
  return <span className="card-display min-w-0 truncate text-[15px] leading-tight">{c.company?.trim() || c.name}</span>;
}

const ext = (href: string) => (href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {});

/** Reserve a table (the card's main button), then Call and the message channel as outline pills. */
function HeroActions({ cta }: { cta: PrimaryCta | null }) {
  const { call, message, messageLabel, saveContact } = useContactActions();
  const L = useLabels();
  const outline = "cbtn h-[52px] min-w-0 border-[1.5px] border-[color:color-mix(in_oklab,var(--c-on-bg)_55%,var(--c-bg))] px-3 text-[15px] text-c-on-bg hover:bg-c-bg-tint";

  if (!cta) {
    return (
      <button type="button" onClick={saveContact} className="cbtn cbtn-primary on-cta h-14 w-full cursor-pointer text-base">
        <UserPlus aria-hidden className="size-5" strokeWidth={2} />
        {L.saveContact}
      </button>
    );
  }

  const rest: ReactNode[] = [];
  if (call && cta.kind !== "call")
    rest.push(
      <a key="call" href={call} className={outline}>
        <Phone aria-hidden className="size-[18px] shrink-0" strokeWidth={2} />
        {L.call}
      </a>,
    );
  if (message && cta.kind !== "message")
    rest.push(
      <a key="msg" href={message} {...ext(message)} className={outline}>
        <MessageIcon className="size-[18px] shrink-0" />
        <span className="truncate">{messageLabel}</span>
      </a>,
    );
  if (rest.length < 2)
    rest.push(
      <button key="save" type="button" onClick={saveContact} className={cn(outline, "cursor-pointer")}>
        <UserPlus aria-hidden className="size-[18px] shrink-0" strokeWidth={2} />
        {L.save}
      </button>,
    );

  const icon = cta.kind === "call" ? <Phone aria-hidden className="size-5 shrink-0" strokeWidth={2} /> : cta.kind === "message" ? <MessageIcon className="size-5 shrink-0" /> : null;

  return (
    <div className="flex flex-col gap-2.5">
      <a href={cta.href} {...(cta.external ? { target: "_blank", rel: "noreferrer" } : {})} className="cbtn cbtn-primary on-cta group w-full !min-h-[60px] !justify-between !gap-3 px-6 py-2.5 text-left">
        <span className="flex min-w-0 items-center gap-3">
          {icon}
          <span className="flex min-w-0 flex-col">
            <span className="text-[17px] leading-tight font-bold">{cta.label}</span>
            {cta.sub && <span className="mt-0.5 text-[13px] leading-tight font-medium">{cta.sub}</span>}
          </span>
        </span>
        <ArrowRight aria-hidden className="size-5 shrink-0 transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none" strokeWidth={2.25} />
        {cta.external && <span className="sr-only"> (opens in a new tab)</span>}
      </a>
      <div className={cn("grid gap-2.5", rest.length > 1 ? "grid-cols-2" : "grid-cols-1")}>{rest}</div>
    </div>
  );
}

function Titled({ title, children }: { title: string; children: ReactNode }) {
  const uid = useId();
  return (
    <section aria-labelledby={`${uid}-h`} className="flex flex-col gap-4">
      <SheetHeading tone="surface" id={`${uid}-h`}>
        {title}
      </SheetHeading>
      {children}
    </section>
  );
}

function SaveButton() {
  const { saveContact } = useContactActions();
  const L = useLabels();
  return (
    <button type="button" onClick={saveContact} className="cbtn cbtn-surface h-14 w-full cursor-pointer text-base">
      <UserPlus aria-hidden className="size-5" strokeWidth={2} />
      {L.saveToContacts}
    </button>
  );
}

/**
 * The floating dark pill: Reserve (the main button) and Call, shown once the
 * hero's actions scroll away. Phones only; wide screens keep the hero in view.
 */
function BottomBar({ watch, cta }: { watch: React.RefObject<HTMLElement | null>; cta: PrimaryCta | null }) {
  const { call, message, messageLabel } = useContactActions();
  const L = useLabels();
  const root = useScrollRoot();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = watch.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        const above = entry.boundingClientRect.top < (entry.rootBounds?.top ?? 0);
        setVisible(!entry.isIntersecting && above);
      },
      { root: root?.current ?? null, threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [watch, root]);

  if (!cta) return null;
  // Second slot: Call, or the message channel when the main button already calls.
  const second =
    cta.kind !== "call" && call
      ? { href: call, label: L.call, icon: <Phone aria-hidden className="size-[18px] shrink-0" strokeWidth={2} /> }
      : cta.kind !== "message" && message
        ? { href: message, label: messageLabel, icon: <MessageIcon className="size-[18px] shrink-0" /> }
        : null;

  return (
    <div
      aria-hidden={!visible}
      inert={!visible}
      className={cn(
        "sticky bottom-0 z-40 -mt-[88px] flex h-[88px] items-end px-3 pb-[max(14px,env(safe-area-inset-bottom))] transition-[transform,opacity] duration-300 [transition-timing-function:var(--ease-out-expo)] motion-reduce:transition-none @4xl:hidden",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0",
      )}
    >
      <div className="on-bar mx-auto flex w-full max-w-[520px] items-center gap-1.5 rounded-[calc(var(--c-btn-radius)+6px)] bg-c-text p-1.5 shadow-[0_16px_36px_-12px_rgb(0_0_0/0.6)]">
        <a href={cta.href} {...(cta.external ? { target: "_blank", rel: "noreferrer" } : {})} className="cbtn cbtn-primary h-12 min-w-0 flex-[1.6] px-4 text-[15px] !font-bold">
          <span className="truncate">{cta.label}</span>
        </a>
        {second && (
          <a href={second.href} {...ext(second.href)} className="cbtn h-12 min-w-0 flex-1 px-3 text-[15px] text-c-surface hover:bg-[color:color-mix(in_oklab,var(--c-surface)_12%,var(--c-text))]">
            {second.icon}
            <span className="truncate">{second.label}</span>
          </a>
        )}
      </div>
    </div>
  );
}
