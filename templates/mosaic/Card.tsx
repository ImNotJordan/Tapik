"use client";

import { ArrowRight, ArrowUpRight, Phone, UserPlus } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { visibleSections } from "@/lib/design/sections";
import type { ReorderableSection } from "@/lib/types";
import { cn } from "@/lib/utils";
import { MessageIcon, useContactActions } from "@/components/card/actions";
import { usePrimaryCta, type PrimaryCta } from "@/components/card/extras";
import { useLabels } from "@/components/card/labels";
import { AgentPhoto, NameText } from "@/components/card/primitives";
import { AboutBlock, CardFooter, QuoteBlock, SectionStyle, T, type SectionStyleValue } from "@/components/card/sections";
import { useScrollRoot } from "@/components/ui/device-preview";
import type { TemplateProps } from "../types";
import { MosaicHero, useMosaicPhotos } from "./sections/hero";
import { Album, ContactRules, OUTLINE, QuietMap, SocialRules, Team } from "./sections/parts";

const CTA_LABEL = "Order or inquire";

const STYLE: SectionStyleValue = {
  quote: "text-[clamp(1.55rem,6.8cqi,2rem)] leading-[1.22] italic [font-weight:500] !tracking-[-0.01em]",
  renderHeading: ({ children, tone, aside, id }) => (
    <div className="flex items-baseline justify-between gap-4">
      <h2 id={id} className={cn("card-display text-[1.75rem] leading-[1.1]", T[tone].text)}>
        {children}
      </h2>
      {aside && <span className={cn("shrink-0 text-[14px] tabular-nums", T[tone].muted)}>{aside}</span>}
    </div>
  ),
};

/**
 * L — Habi Mosaic. The work first: a three-column mosaic of the cover photo
 * and the album with the label pill on it, then a small round photo beside
 * the serif name, "Order or inquire", and the sections on white. On wide
 * screens the mosaic becomes a sticky panel on the left and the card scrolls
 * beside it.
 */
export default function MosaicCard({ bundle, tokens, mode }: TemplateProps) {
  const { card } = bundle;
  const H1 = mode === "public" ? "h1" : "p";
  const actionsRef = useRef<HTMLDivElement>(null);
  const sections = visibleSections(bundle);
  const mosaic = useMosaicPhotos();
  // Without photos the woven band runs across the top and the card is one centered column at every width.
  const split = mosaic.length > 0;
  const longName = card.name.length > 28;

  const render: Record<ReorderableSection, () => ReactNode> = {
    quote: () => <QuoteBlock tone="background" />,
    photos: () => <Album />,
    about: () => <AboutBlock tone="background" heading />,
    orgChart: () => <Team />,
    map: () => <QuietMap />,
    contact: () => <ContactRules withSocials={sections[sections.indexOf("contact") + 1] === "socials"} />,
    socials: () => <SocialRules />,
  };
  // Social links right after Contact join its ruled list instead of starting a new one.
  const order = sections.filter((k, i) => !(k === "socials" && sections[i - 1] === "contact"));

  return (
    <SectionStyle.Provider value={STYLE}>
      <div className={cn("relative min-h-[var(--c-vh)] bg-c-bg text-c-on-bg", split && "@4xl:grid @4xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]")}>
        <div className={cn("mx-auto w-full", split ? "max-w-[640px] @4xl:sticky @4xl:top-0 @4xl:h-[var(--c-vh)] @4xl:max-w-none @4xl:self-start @4xl:p-5 @4xl:pr-0" : "max-w-none")}>
          <MosaicHero ground={tokens.background} photos={mosaic} />
        </div>

        <div className={cn("mx-auto flex w-full max-w-[640px] min-w-0 flex-col @4xl:max-w-[600px] @4xl:pt-16", split && "@4xl:px-12")}>
          {/* Identity */}
          <div className="flex items-center gap-4 px-5 pt-6 @4xl:px-0 @4xl:pt-0">
            <AgentPhoto shape="circle" sizes="72px" tone="background" priority className="size-16 shrink-0 @4xl:size-[72px]" />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <H1
                className={cn(
                  "card-display leading-[1.02] [overflow-wrap:anywhere] [text-wrap:balance]",
                  longName ? "text-[clamp(1.75rem,8cqi,2.2rem)] @4xl:text-[2.5rem]" : "text-[clamp(2rem,9.6cqi,2.6rem)] @4xl:text-[3rem]",
                )}
              >
                <NameText name={card.name} />
              </H1>
              {(card.title || card.company) && (
                <p className="flex flex-col text-[15px] leading-snug [overflow-wrap:anywhere]">
                  {card.title && <span className="text-c-on-bg">{card.title}</span>}
                  {card.company && <span className="text-c-on-bg-muted">{card.company}</span>}
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div ref={actionsRef} className="px-5 pt-6 @4xl:px-0 @4xl:pt-8">
            <HeroActions showSave={!sections.includes("contact")} />
          </div>

          <main className="flex flex-col gap-12 px-5 pt-12 pb-28 @4xl:px-0 @4xl:pt-14 @4xl:pb-16">
            {order.map((key) => (
              <div key={key}>{render[key]()}</div>
            ))}
            <CardFooter tone="background" />
          </main>
        </div>

        <BottomBar watch={actionsRef} />
      </div>
    </SectionStyle.Provider>
  );
}

/* ------------------------------------------------------------ Actions */

function ext(href: string) {
  return href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {};
}

/** Order or inquire (accent fill), then Call and Message as outlines. Whatever the main button already does isn't repeated. */
function HeroActions({ showSave }: { showSave: boolean }) {
  const cta = usePrimaryCta(CTA_LABEL);
  const { call, message, messageLabel, saveContact } = useContactActions();
  const L = useLabels();

  const pair: ReactNode[] = [];
  if (call && cta?.kind !== "call") {
    pair.push(
      <a key="call" href={call} className={cn(OUTLINE, "h-12 text-[15px]")}>
        <Phone aria-hidden className="size-[18px]" strokeWidth={2} />
        {L.call}
      </a>,
    );
  }
  if (message && cta?.kind !== "message") {
    pair.push(
      <a key="msg" href={message} {...ext(message)} className={cn(OUTLINE, "h-12 text-[15px]")}>
        <MessageIcon className="size-[18px]" />
        {messageLabel}
      </a>,
    );
  }
  // Save joins the row when there's room, or when the contact list (which carries it) is hidden.
  const save = (
    <button key="save" type="button" onClick={saveContact} className={cn(OUTLINE, "h-12 cursor-pointer text-[15px]")}>
      <UserPlus aria-hidden className="size-[18px]" strokeWidth={2} />
      {L.save}
    </button>
  );
  const saveInPair = !!cta && (pair.length === 1 || (pair.length === 0 && showSave));
  if (saveInPair) pair.push(save);

  return (
    <div className="flex flex-col gap-2.5">
      {cta ? (
        <Cta cta={cta} />
      ) : (
        <button type="button" onClick={saveContact} className="cbtn cbtn-primary h-14 w-full cursor-pointer text-base">
          <UserPlus aria-hidden className="size-5" strokeWidth={2} />
          {L.saveContact}
        </button>
      )}
      {pair.length > 0 && <div className={cn("grid gap-2.5", pair.length > 1 ? "grid-cols-2" : "grid-cols-1")}>{pair}</div>}
      {cta && showSave && !saveInPair && (
        <button
          type="button"
          onClick={saveContact}
          className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 text-[15px] font-medium text-c-on-bg underline decoration-c-bg-line underline-offset-4 hover:decoration-current"
        >
          <UserPlus aria-hidden className="size-[18px]" strokeWidth={2} />
          {L.saveToContacts}
        </button>
      )}
    </div>
  );
}

function Cta({ cta }: { cta: PrimaryCta }) {
  const Icon = cta.kind === "link" ? ArrowUpRight : ArrowRight;
  return (
    <a href={cta.href} {...ext(cta.href)} className="cbtn cbtn-primary group min-h-14 w-full justify-between gap-3 px-5 py-2.5 text-left">
      <span className="flex min-w-0 flex-1 flex-col text-left">
        <span className="text-base leading-tight font-semibold">{cta.label}</span>
        {cta.sub && <span className="mt-0.5 text-[13px] leading-tight font-normal">{cta.sub}</span>}
      </span>
      <Icon aria-hidden className="size-5 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none" strokeWidth={2} />
      {cta.href.startsWith("http") && <span className="sr-only"> (opens in a new tab)</span>}
    </a>
  );
}

/**
 * Bottom bar once the hero actions scroll away: the main button, then Call and
 * Message as icon buttons (whichever the main button isn't). Hidden on wide screens.
 */
function BottomBar({ watch }: { watch: React.RefObject<HTMLElement | null> }) {
  const cta = usePrimaryCta(CTA_LABEL);
  const { call, message, messageLabel, saveContact } = useContactActions();
  const L = useLabels();
  const root = useScrollRoot();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = watch.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting && entry.boundingClientRect.top < (entry.rootBounds?.top ?? 0)),
      { root: root?.current ?? null, threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [watch, root]);

  const icon = "cbtn size-[52px] shrink-0 border-[1.5px] border-[color:color-mix(in_oklab,var(--c-on-bg)_50%,var(--c-bg))] text-c-on-bg hover:bg-c-bg-tint";

  return (
    <div
      aria-hidden={!visible}
      inert={!visible}
      className={cn(
        "sticky bottom-0 z-40 -mt-[80px] h-[80px] transition-[transform,opacity] duration-300 [transition-timing-function:var(--ease-out-expo)] motion-reduce:transition-none @4xl:hidden",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0",
      )}
    >
      <div className="mx-auto flex h-full max-w-[640px] items-start gap-2 border-t border-c-bg-line bg-c-bg px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-12px_rgb(0_0_0/0.22)]">
        {cta ? (
          <a href={cta.href} {...ext(cta.href)} className="cbtn cbtn-primary h-[52px] min-w-0 flex-1 px-4 text-[15px]">
            <span className="truncate">{cta.label}</span>
          </a>
        ) : (
          <button type="button" onClick={saveContact} className="cbtn cbtn-primary h-[52px] min-w-0 flex-1 cursor-pointer px-4 text-[15px]">
            <UserPlus aria-hidden className="size-[18px]" strokeWidth={2} />
            {L.saveContact}
          </button>
        )}
        {call && cta?.kind !== "call" && (
          <a href={call} aria-label={L.call} className={icon}>
            <Phone aria-hidden className="size-5" strokeWidth={2} />
          </a>
        )}
        {message && cta?.kind !== "message" && (
          <a href={message} {...ext(message)} aria-label={messageLabel} className={icon}>
            <MessageIcon className="size-5" />
          </a>
        )}
      </div>
    </div>
  );
}
