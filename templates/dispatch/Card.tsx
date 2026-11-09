"use client";

import { ArrowRight, Phone, UserPlus } from "lucide-react";
import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { visibleSections } from "@/lib/design/sections";
import type { ReorderableSection } from "@/lib/types";
import { cn } from "@/lib/utils";
import { MessageIcon, ShareButton, useContactActions } from "@/components/card/actions";
import { useCard } from "@/components/card/context";
import { usePrimaryCta, useServiceAreas, useStatusChip } from "@/components/card/extras";
import { useLabels } from "@/components/card/labels";
import { AgentPhoto, CardImage, NameText } from "@/components/card/primitives";
import { CardFooter, ContactList, PhotoAlbum, QuoteBlock, SectionHeading, SectionStyle, SocialLinks, type HeadingProps } from "@/components/card/sections";
import { useScrollRoot } from "@/components/ui/device-preview";
import type { TemplateProps } from "../types";
import { RouteMap } from "./sections/route";
import { TeamBoard } from "./sections/team";

/*
 * K — Dispatch. Transport and logistics: a hazard-stripe band, a square
 * company badge in the signal color, the cover photo with an "On duty now"
 * chip, the agent photo framed in signal and overlapping it, the name in big
 * condensed capitals, then Request a pickup first. Below: About with the quote
 * on a signal rule, service areas, the yard-to-port route map, the fleet
 * album and the team board. Wide screens put the identity in a sticky left
 * column and the sections on the right.
 */

/** Theme-derived roles. Only tokens and mixes of tokens; checked AA in the report. */
const VARS = {
  // Secondary text (roles, address): about #A9AEB3 on the default ground.
  "--dp-muted": "color-mix(in oklab, var(--c-on-bg) 70%, var(--c-bg))",
  // Rules between rows (decorative) and the indent ticks (UI marks).
  "--dp-line": "color-mix(in oklab, var(--c-on-bg) 16%, var(--c-bg))",
  "--dp-line-strong": "color-mix(in oklab, var(--c-on-bg) 45%, var(--c-bg))",
  // Tiles and plates: one step up from the ground.
  "--dp-plate": "var(--c-surface)",
  "--dp-plate-hover": "color-mix(in oklab, var(--c-on-bg) 8%, var(--c-surface))",
  // Live status dot. A fixed status green (not a brand color), like a traffic signal.
  "--dp-live": "oklch(0.8 0.19 148)",
} as CSSProperties;

const STYLE = {
  renderHeading: (p: HeadingProps) => <DispatchHeading {...p} />,
  quote: "uppercase text-[clamp(1.6rem,7.4cqi,2.1rem)] leading-[1.02]",
};

export default function DispatchCard({ bundle, mode }: TemplateProps) {
  const { isHidden } = useCard();
  const actionsRef = useRef<HTMLDivElement>(null);
  const areas = useServiceAreas();

  const blocks = arrange(visibleSections(bundle), areas.length > 0);

  const render = (b: Block): ReactNode => {
    switch (b) {
      case "about+quote":
        return <About withQuote />;
      case "about":
        return <About />;
      case "quote":
        return <QuoteBlock tone="background" className="border-l-4 border-c-accent py-1 pl-4" />;
      case "areas":
        return <ServiceAreas areas={areas} />;
      case "map":
        return <RouteMap />;
      case "photos":
        return <PhotoAlbum tone="background" layout="grid" title="Photos · Fleet" />;
      case "orgChart":
        return <TeamBoard />;
      case "contact":
        return <Contact />;
      case "socials":
        return <Socials />;
    }
  };

  return (
    <SectionStyle.Provider value={STYLE}>
      <div style={VARS} className="relative min-h-[var(--c-vh)] text-c-on-bg">
        <HazardBand />

        <header className="mx-auto flex max-w-[480px] items-center gap-3 px-4 py-3 @4xl:max-w-[1160px] @4xl:px-10 @4xl:py-5">
          <CompanyBadge />
          <ShareButton className="border-[1.5px] border-[var(--dp-line-strong)] text-c-on-bg hover:bg-[var(--dp-plate-hover)]" />
        </header>

        <div className="mx-auto max-w-[480px] @4xl:grid @4xl:max-w-[1160px] @4xl:grid-cols-[440px_minmax(0,1fr)] @4xl:gap-16 @4xl:px-10">
          {/* Identity column */}
          <div className="flex flex-col @4xl:sticky @4xl:top-6 @4xl:self-start">
            <Hero />
            <Identity mode={mode} logoHidden={isHidden("logo")} />
            <div ref={actionsRef} className="px-4 pt-6 @4xl:px-0">
              <Actions />
            </div>
          </div>

          {/* Sections */}
          <main className="flex flex-col gap-12 px-5 pt-14 pb-28 @4xl:px-0 @4xl:pt-1 @4xl:pb-16">
            {blocks.map((b) => (
              <div key={b}>{render(b)}</div>
            ))}
            <CardFooter tone="background" className="pt-2" />
          </main>
        </div>

        <BottomBar watch={actionsRef} />
      </div>
    </SectionStyle.Provider>
  );
}

/* ------------------------------------------------------------ Ordering */

type Block = ReorderableSection | "about+quote" | "areas";

/**
 * The admin's order, with two template rules: a quote right before About
 * joins it (About shows the quote on its signal rule, then the bio), and
 * service areas follow About (or the quote, or lead the list).
 */
export function arrange(order: ReorderableSection[], hasAreas: boolean): Block[] {
  const out: Block[] = [];
  for (let i = 0; i < order.length; i++) {
    if (order[i] === "quote" && order[i + 1] === "about") {
      out.push("about+quote");
      i++;
    } else out.push(order[i]);
  }
  if (hasAreas) {
    const after = ["about+quote", "about", "quote"].map((k) => out.indexOf(k as Block)).find((i) => i >= 0);
    out.splice(after === undefined ? 0 : after + 1, 0, "areas");
  }
  return out;
}

/** Company initials for the badge: "Zamboanga South Haulers & Freight" → "ZSH". */
export function badgeLetters(company: string): string {
  const skip = /^(and|of|the|inc\.?|corp\.?|co\.?|ltd\.?)$/i;
  const words = company
    .split(/\s+/)
    .map((w) => w.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter((w) => w && !skip.test(w));
  return words
    .slice(0, 3)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

/** Splits a name into two balanced lines at a word break: "Ramil / Catalan". */
export function twoLines(name: string): string[] {
  const words = name.trim().split(/\s+/);
  if (words.length < 2) return [name.trim()];
  let best = 1;
  let diff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const d = Math.abs(words.slice(0, i).join(" ").length - words.slice(i).join(" ").length);
    if (d < diff) {
      diff = d;
      best = i;
    }
  }
  return [words.slice(0, best).join(" "), words.slice(best).join(" ")];
}

/** Font size that keeps the longest unbreakable part on one line and a long name to about three lines. */
function nameSize(name: string): string {
  const parts = name.trim().split(/[\s]+|(?<=-)/).filter(Boolean);
  const longest = Math.max(5, ...parts.map((p) => p.length));
  const total = Math.max(12, name.trim().length);
  // Barlow Condensed Bold capitals run about 0.52em wide on average.
  return `min(52px, calc(100cqi / ${(longest * 0.56).toFixed(2)}), calc(300cqi / ${(total * 0.56).toFixed(2)}))`;
}

/* -------------------------------------------------------------- Pieces */

function HazardBand() {
  return (
    <div
      aria-hidden
      className="h-2.5 w-full"
      style={{ background: "repeating-linear-gradient(-45deg, var(--c-primary) 0 11px, var(--c-bg) 11px 22px)" }}
    />
  );
}

/** Square signal badge with the company's initials and name; the card's logo image replaces the badge. */
function CompanyBadge() {
  const { bundle, isHidden } = useCard();
  const c = bundle.card;
  const src = isHidden("logo") ? undefined : c.logoDarkUrl || c.logoUrl;
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- logos are of unknown aspect ratio
      <img src={src} alt={c.logoAlt || c.company || "Logo"} className="h-11 w-auto max-w-[200px] shrink-0 object-contain object-left" />
    );
  }
  if (!c.company) return <span />;
  const letters = badgeLetters(c.company);
  return (
    <div className="flex min-w-0 items-center gap-3">
      {!isHidden("logo") && letters && (
        <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-[2px] bg-c-primary text-c-on-primary">
          <span className="card-display text-[17px] leading-none tracking-[0.02em]">{letters}</span>
        </span>
      )}
      <span className="card-display line-clamp-2 min-w-0 text-[16px] leading-[1.1] tracking-[0.03em] uppercase">{c.company}</span>
    </div>
  );
}

function StatusChip() {
  const chip = useStatusChip("On duty now");
  if (!chip) return null;
  return (
    <p className="inline-flex min-h-8 items-center gap-2 rounded-[2px] bg-[color:color-mix(in_oklab,var(--c-bg)_88%,transparent)] px-3 py-1 text-c-on-bg">
      {chip.tone === "live" && (
        <span aria-hidden className="relative flex size-2.5 shrink-0">
          <span className="absolute inset-0 rounded-full bg-[var(--dp-live)] opacity-60 motion-safe:[[data-motion=on]_&]:animate-ping" />
          <span className="relative size-2.5 rounded-full bg-[var(--dp-live)]" />
        </span>
      )}
      <span className="card-display text-[15px] leading-none tracking-[0.04em] uppercase">{chip.label}</span>
    </p>
  );
}

/** 250px cover photo with the status chip; without one, a quiet striped plate keeps the shape. */
function Hero() {
  const { bundle, isHidden } = useCard();
  const c = bundle.card;
  const cover = c.backgroundPhotoUrl && !isHidden("backgroundPhoto") ? c.backgroundPhotoUrl : null;
  const photo = !isHidden("agentPhoto");
  return (
    <div className="relative">
      <div className={cn("relative overflow-hidden bg-[var(--dp-plate)]", cover ? "h-[250px]" : "h-[150px]")}>
        {cover ? (
          <>
            <div className="motion-photo-settle absolute inset-0">
              <CardImage src={cover} alt={c.backgroundPhotoAlt || ""} sizes="(min-width: 1024px) 440px, 100vw" priority focal={c.backgroundFocalPoint} className="size-full" failTone="surface" />
            </div>
            <div aria-hidden className="absolute inset-0 bg-black" style={{ opacity: "calc(var(--c-overlay) * 0.55)" }} />
          </>
        ) : (
          <div
            aria-hidden
            className="absolute inset-0"
            style={{ background: "repeating-linear-gradient(-45deg, color-mix(in oklab, var(--c-on-bg) 5%, transparent) 0 14px, transparent 14px 28px)" }}
          />
        )}
        <div className="absolute top-3 left-3">
          <StatusChip />
        </div>
      </div>
      {photo && (
        <div className="relative z-10 -mt-[62px] ml-4 w-[124px] border-4 border-c-primary bg-c-surface @4xl:ml-0">
          <AgentPhoto shape="square" sizes="124px" priority tone="surface" className="w-full" />
        </div>
      )}
    </div>
  );
}

function Identity({ mode, logoHidden }: { mode: TemplateProps["mode"]; logoHidden: boolean }) {
  const { bundle } = useCard();
  const c = bundle.card;
  const H1 = mode === "public" ? "h1" : "p";
  const lines = twoLines(c.name);
  return (
    <div className="flex flex-col gap-2.5 px-5 pt-5 [container-type:inline-size] @4xl:px-0">
      <H1 className="card-display leading-[0.92] uppercase [overflow-wrap:anywhere]" style={{ fontSize: nameSize(c.name) }}>
        {lines.map((l, i) => (
          <span key={i} className="block">
            <NameText name={l} />
            {i < lines.length - 1 && " "}
          </span>
        ))}
      </H1>
      {c.title && <p className="card-display text-[1.3rem] leading-tight tracking-[0.02em] text-c-accent uppercase">{c.title}</p>}
      {logoHidden && c.company && <p className="text-[15px] leading-snug text-[var(--dp-muted)]">{c.company}</p>}
    </div>
  );
}

/** Request a pickup, full width; then Call, the message channel and Save as square tiles. */
function Actions() {
  const cta = usePrimaryCta("Request a pickup");
  const { call, message, messageLabel, saveContact } = useContactActions();
  const L = useLabels();

  const tile = "flex h-[78px] min-w-0 flex-col items-center justify-center gap-1.5 bg-[var(--dp-plate)] px-2 text-c-text transition-colors hover:bg-[var(--dp-plate-hover)] active:scale-[0.97] motion-reduce:active:scale-100";
  const tileStyle = { borderRadius: "min(var(--c-btn-radius), 6px)" };
  const tileLabel = "card-display text-[15px] leading-none tracking-[0.04em] uppercase";
  const ext = (h: string) => (h.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {});

  const tiles: ReactNode[] = [];
  if (call && cta?.kind !== "call")
    tiles.push(
      <a key="call" href={call} className={tile} style={tileStyle}>
        <Phone aria-hidden className="size-[22px] text-c-accent" strokeWidth={2.25} />
        <span className={tileLabel}>{L.call}</span>
      </a>,
    );
  if (message && cta?.kind !== "message")
    tiles.push(
      <a key="msg" href={message} {...ext(message)} className={tile} style={tileStyle}>
        <span className="text-c-accent">
          <MessageIcon className="size-[22px]" />
        </span>
        <span className={tileLabel}>{messageLabel}</span>
      </a>,
    );
  tiles.push(
    <button key="save" type="button" onClick={saveContact} aria-label={L.saveContact} className={cn(tile, "cursor-pointer")} style={tileStyle}>
      <UserPlus aria-hidden className="size-[22px] text-c-accent" strokeWidth={2.25} />
      <span aria-hidden className={tileLabel}>
        {L.save}
      </span>
    </button>,
  );

  return (
    <div className="flex flex-col gap-2">
      {cta ? (
        <a href={cta.href} {...(cta.external ? { target: "_blank", rel: "noreferrer" } : {})} className="cbtn cbtn-primary group min-h-[64px] focus-visible:![outline-color:var(--c-on-bg)] w-full !justify-between gap-3 px-5 py-2.5 text-left">
          <span className="flex min-w-0 flex-col">
            <span className="card-display text-[1.5rem] leading-[1.05] tracking-[0.03em] uppercase">{cta.label}</span>
            {cta.sub && <span className="mt-0.5 text-[14px] leading-tight font-medium">{cta.sub}</span>}
          </span>
          <ArrowRight aria-hidden className="size-6 shrink-0 transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none" strokeWidth={2.5} />
          {cta.external && <span className="sr-only"> (opens in a new tab)</span>}
        </a>
      ) : null}
      {/* With nothing else to do, Save stands alone as the tile row. */}
      <div className={cn("grid gap-2", tiles.length === 3 ? "grid-cols-3" : tiles.length === 2 ? "grid-cols-2" : "grid-cols-1")}>{tiles}</div>
    </div>
  );
}

/** Section heading: a signal block beside condensed capitals. */
function DispatchHeading({ children, aside, id }: HeadingProps) {
  return (
    <div className="flex items-center gap-3">
      <span aria-hidden className="size-3 shrink-0 bg-c-accent" />
      <h2 id={id} className="card-display min-w-0 flex-1 text-[1.65rem] leading-none tracking-[0.02em] uppercase">
        {children}
      </h2>
      {aside && <span className="shrink-0 text-[15px] text-[var(--dp-muted)] tabular-nums">{aside}</span>}
    </div>
  );
}

/** About: the quote on its signal rule (when it comes right before), then the bio. */
function About({ withQuote }: { withQuote?: boolean }) {
  const { bundle } = useCard();
  const L = useLabels();
  const uid = useId();
  const [open, setOpen] = useState(false);
  const text = bundle.card.description?.trim() ?? "";
  const paragraphs = text.split(/\n{2,}/);
  const long = text.length > 320;
  return (
    <section aria-labelledby={`${uid}-h`} className="flex flex-col gap-5">
      <SectionHeading tone="background" id={`${uid}-h`}>
        {L.about}
      </SectionHeading>
      {withQuote && <QuoteBlock tone="background" className="border-l-4 border-c-accent py-1 pl-4" />}
      <div id={`${uid}-bio`} className={cn("flex max-w-[60ch] flex-col gap-3 text-base leading-[1.65] text-c-on-bg-muted", long && !open && "line-clamp-6")}>
        {paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
      {long && (
        <button
          type="button"
          aria-expanded={open}
          aria-controls={`${uid}-bio`}
          onClick={() => setOpen((v) => !v)}
          className="-my-2 inline-flex h-11 cursor-pointer items-center self-start text-[15px] font-semibold text-c-on-bg underline decoration-c-accent decoration-2 underline-offset-4"
        >
          {open ? L.showLess : L.readMore}
        </button>
      )}
    </section>
  );
}

function ServiceAreas({ areas }: { areas: string[] }) {
  const L = useLabels();
  const uid = useId();
  return (
    <section aria-labelledby={`${uid}-h`} className="flex flex-col gap-4">
      <SectionHeading tone="background" id={`${uid}-h`} aside={areas.length}>
        {L.serviceAreas}
      </SectionHeading>
      {/* Plain text in a list: chips are not buttons. */}
      <ul className="flex flex-wrap gap-2">
        {areas.map((a, i) => (
          <li key={`${a}-${i}`} className="inline-flex min-h-10 items-center gap-2 rounded-[2px] bg-[var(--dp-plate)] px-3 py-1.5 text-c-text">
            <span aria-hidden className="size-1.5 shrink-0 bg-c-accent" />
            <span className="card-display text-[16px] leading-tight tracking-[0.03em] uppercase">{a}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Contact() {
  const L = useLabels();
  const uid = useId();
  return (
    <section aria-labelledby={`${uid}-h`} className="flex flex-col gap-3">
      <SectionHeading tone="background" id={`${uid}-h`}>
        {L.contactDetails}
      </SectionHeading>
      <ContactList tone="background" variant="rows" className="[&_svg]:text-c-accent" />
    </section>
  );
}

function Socials() {
  const L = useLabels();
  const uid = useId();
  return (
    <section aria-labelledby={`${uid}-h`} className="flex flex-col gap-4">
      <SectionHeading tone="background" id={`${uid}-h`}>
        {L.socialProfiles}
      </SectionHeading>
      <SocialLinks tone="background" variant="icons" />
    </section>
  );
}

/**
 * Sticky bar once the hero actions scroll away: Call dispatch (2fr, signal)
 * and the message channel (1fr). Hidden on wide layouts.
 */
function BottomBar({ watch }: { watch: React.RefObject<HTMLElement | null> }) {
  const { call, message, messageLabel } = useContactActions();
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

  if (!call && !message) return null;
  const cols = call && message ? "2fr 1fr" : "1fr";

  return (
    <div
      aria-hidden={!visible}
      inert={!visible}
      className={cn(
        "sticky bottom-0 z-40 -mt-[84px] h-[84px] transition-[transform,opacity] duration-300 [transition-timing-function:var(--ease-out-expo)] motion-reduce:transition-none @4xl:hidden",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0",
      )}
    >
      <div className="h-full border-t border-[var(--dp-line)] bg-c-bg shadow-[0_-8px_24px_rgb(0_0_0/0.3)]">
        <div className="mx-auto grid h-full max-w-[480px] gap-2 px-4 pt-3 pb-[max(14px,env(safe-area-inset-bottom))]" style={{ gridTemplateColumns: cols }}>
          {call && (
            <a href={call} className="cbtn cbtn-primary min-w-0 px-3 focus-visible:![outline-color:var(--c-on-bg)]">
              <Phone aria-hidden className="size-[18px] shrink-0" strokeWidth={2.5} />
              <span className="card-display truncate text-[1.2rem] leading-none tracking-[0.03em] uppercase">Call dispatch</span>
            </a>
          )}
          {message && (
            <a
              href={message}
              target={message.startsWith("http") ? "_blank" : undefined}
              rel="noreferrer"
              className="cbtn min-w-0 bg-[var(--dp-plate)] px-3 text-c-text hover:bg-[var(--dp-plate-hover)]"
            >
              <span className="text-c-accent">
                <MessageIcon className="size-[18px]" />
              </span>
              <span className="card-display truncate text-[1.1rem] leading-none tracking-[0.03em] uppercase">{messageLabel}</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
