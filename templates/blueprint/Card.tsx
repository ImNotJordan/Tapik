"use client";

import { ArrowRight, ArrowUpRight, ChevronRight, Phone, UserPlus } from "lucide-react";
import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { visibleSections } from "@/lib/design/sections";
import { displayHandle, getPlatform } from "@/lib/social";
import type { ReorderableSection } from "@/lib/types";
import { phoneDigits } from "@/lib/validate";
import { cn, initials } from "@/lib/utils";
import { MessageIcon, ShareButton, useContactActions } from "@/components/card/actions";
import { useCard } from "@/components/card/context";
import { usePrimaryCta, type PrimaryCta } from "@/components/card/extras";
import { useLabels } from "@/components/card/labels";
import { CardImage, Logo, NameText } from "@/components/card/primitives";
import { AboutBlock, BreakableEmail, CardFooter } from "@/components/card/sections";
import { useScrollRoot } from "@/components/ui/device-preview";
import { cropStyle } from "@/components/ui/image-tools";
import type { TemplateProps } from "../types";
import { NumHeading, Numbered } from "./sections/heading";
import { ProjectPlates } from "./sections/plates";
import { SitePlan } from "./sections/site-plan";
import { TeamDiagram } from "./sections/team-diagram";

const CTA_LABEL = "Start a project consult";

const TITLES: Record<Exclude<ReorderableSection, "quote">, string> = {
  about: "Brief",
  photos: "Projects",
  map: "Studio",
  orgChart: "Team",
  contact: "Contact",
  socials: "Social",
};

/** Colors derived from the theme tokens. The label tint stays AA on the sheet and its grid lines. */
const VARS = {
  "--bp-label": "color-mix(in oklab, var(--c-on-bg) 82%, var(--c-bg))",
  "--bp-line": "color-mix(in oklab, var(--c-on-bg) 55%, var(--c-bg))",
  "--bp-rule": "color-mix(in oklab, var(--c-on-bg) 26%, var(--c-bg))",
  "--bp-grid": "color-mix(in oklab, var(--c-on-bg) 8%, transparent)",
  backgroundImage: "linear-gradient(to right, var(--bp-grid) 1px, transparent 1px), linear-gradient(to bottom, var(--bp-grid) 1px, transparent 1px)",
  backgroundSize: "26px 26px",
  backgroundPosition: "-1px -1px",
} as CSSProperties;

/* Button looks and the one motion moment, scoped to this template. */
const CSS = `
[data-template="blueprint"] .bp-outline { background: transparent; color: var(--c-on-bg); border: 1.5px solid var(--c-on-bg); }
[data-template="blueprint"] .bp-outline:hover { background: color-mix(in oklab, var(--c-on-bg) 9%, transparent); }
[data-template="blueprint"] .bp-cta:focus-visible { outline-color: var(--c-on-bg); }
[data-template="blueprint"] .bp-row:hover { background: color-mix(in oklab, var(--c-on-bg) 6%, transparent); }
@media (prefers-reduced-motion: no-preference) {
  [data-template="blueprint"][data-motion="on"] .bp-dim-x { animation: bp-dim-x 1100ms var(--ease-out-expo) 120ms both; }
  [data-template="blueprint"][data-motion="on"] .bp-dim-y { animation: bp-dim-y 1100ms var(--ease-out-expo) 260ms both; }
  [data-template="blueprint"][data-motion="on"] .bp-dim-label { animation: bp-fade 600ms var(--ease-out-quart) 700ms both; }
}
@keyframes bp-dim-x { from { transform: scaleX(0); } }
@keyframes bp-dim-y { from { transform: scaleY(0); } }
@keyframes bp-fade { from { opacity: 0; } }
`;

/**
 * O — Blueprint. A drawing sheet with a faint grid: the project photo framed in
 * white under a dimension line, the agent's photo pinned over its corner, the
 * credential in mono above the name, then numbered sections (projects as
 * captioned plates, the studio as a site plan, the team as a line diagram) and
 * a title block to close. Wide screens: the hero holds the left column while
 * the sheet scrolls on the right.
 */
export default function BlueprintCard({ bundle, tokens, mode }: TemplateProps) {
  const { card } = bundle;
  const actionsRef = useRef<HTMLDivElement>(null);
  const H1 = mode === "public" ? "h1" : "p";
  const credential = card.credential?.trim();

  const visible = visibleSections(bundle);
  // Social links join the Contact list when they follow it directly.
  const mergeSocials = visible[visible.indexOf("contact") + 1] === "socials" && visible.includes("contact");
  let n = 0;
  const blocks = visible
    .filter((k) => !(mergeSocials && k === "socials"))
    .map((key) => {
      if (key === "quote") return <Note key={key} />;
      const num = ++n;
      const title = TITLES[key];
      const node: Record<Exclude<ReorderableSection, "quote">, () => ReactNode> = {
        about: () => (
          <Numbered n={num} title={title}>
            <AboutBlock tone="background" heading className="gap-5 [&>div]:text-[16px] [&>div]:text-[var(--bp-label)]" />
          </Numbered>
        ),
        photos: () => <ProjectPlates n={num} title={title} />,
        map: () => <SitePlan n={num} title={title} />,
        orgChart: () => <TeamDiagram n={num} title={title} />,
        contact: () => <ContactSheet n={num} title={title} withSocials={mergeSocials} />,
        socials: () => <ContactSheet n={num} title={title} socialsOnly />,
      };
      return <div key={key}>{node[key]()}</div>;
    });

  return (
    <div style={VARS} className="relative isolate min-h-[var(--c-vh)] text-c-on-bg">
      <style href="tpl-blueprint" precedence="medium">
        {CSS}
      </style>
      {/* Wide screens: the sheet's border, inset from the edge. */}
      <span aria-hidden className="pointer-events-none absolute inset-5 -z-10 hidden border border-[var(--bp-rule)] @4xl:block" />

      <div className="mx-auto max-w-[520px] @4xl:grid @4xl:max-w-[1180px] @4xl:grid-cols-[minmax(380px,440px)_minmax(0,1fr)] @4xl:gap-x-20 @4xl:px-14">
        <div className="@4xl:sticky @4xl:top-0 @4xl:self-start @4xl:pt-8 @4xl:pb-10">
          <header className="flex min-h-[68px] items-center gap-3 px-5 pt-3 pb-2 @4xl:px-0">
            <div className="min-w-0 flex-1 text-c-on-bg">
              <Logo on={tokens.background} className="h-9 max-w-[220px] text-[17px]" />
            </div>
            <ShareButton className="rounded-[var(--c-btn-radius)] border-[1.5px] border-c-on-bg text-c-on-bg hover:bg-[color:color-mix(in_oklab,var(--c-on-bg)_9%,transparent)]" />
          </header>

          <Hero />

          <div className="flex flex-col gap-2.5 px-5 pt-5 @4xl:px-0">
            {credential && <p className="font-[family-name:var(--c-font-mono)] text-[12.5px] leading-snug font-medium tracking-[0.14em] text-[var(--bp-label)] uppercase [overflow-wrap:anywhere]">{credential}</p>}
            <H1 className="card-display text-[clamp(2rem,10.6cqi,2.5rem)] leading-[1.02] [overflow-wrap:anywhere] [text-wrap:balance] @4xl:text-[2.5rem]">
              <NameText name={card.name} />
            </H1>
            {(card.title || card.company) && (
              <p className="flex flex-col text-[16px] leading-snug">
                {card.title && <span className="font-medium [overflow-wrap:anywhere]">{card.title}</span>}
                {card.company && <span className="text-[var(--bp-label)] [overflow-wrap:anywhere]">{card.company}</span>}
              </p>
            )}
          </div>

          <div ref={actionsRef} className="px-5 pt-6 @4xl:px-0">
            <HeroActions />
          </div>
        </div>

        <main className="flex flex-col gap-14 px-5 pt-14 pb-28 @4xl:px-0 @4xl:pt-[104px] @4xl:pb-16">
          {blocks}
          <TitleBlock />
        </main>
      </div>

      <BottomBar watch={actionsRef} />
    </div>
  );
}

/* --------------------------------------------------------------- Hero */

/** The project photo in a white frame, dimensioned "350" across and "240" down; the agent photo pinned over its lower left. */
function Hero() {
  const { bundle, isHidden } = useCard();
  const c = bundle.card;
  const cover = !isHidden("backgroundPhoto") && c.backgroundPhotoUrl ? c.backgroundPhotoUrl : null;
  const showAgent = !isHidden("agentPhoto");

  return (
    <div className="relative px-5 pt-2 @4xl:px-0">
      <div className="grid grid-cols-[minmax(0,1fr)_22px] gap-x-2">
        {/* Dimension across */}
        <div aria-hidden className="relative mb-2 flex h-4 items-center">
          <span className="bp-dim-x absolute inset-x-0 top-1/2 flex h-px items-center bg-c-on-bg">
            <span className="absolute left-0 h-[11px] w-px bg-c-on-bg" />
            <span className="absolute right-0 h-[11px] w-px bg-c-on-bg" />
          </span>
          <span className="bp-dim-label relative mx-auto bg-c-bg px-2 font-[family-name:var(--c-font-mono)] text-[12px] leading-none font-medium tracking-[0.08em]">350</span>
        </div>
        <span />

        {/* Frame */}
        <div className="border-[1.5px] border-c-on-bg p-[5px]">
          <div className="relative aspect-[35/24] overflow-hidden bg-[color:color-mix(in_oklab,var(--c-on-bg)_6%,var(--c-bg))]">
            {cover ? (
              <CardImage src={cover} alt={c.backgroundPhotoAlt || ""} sizes="(min-width: 1024px) 440px, (min-width: 560px) 480px, 90vw" priority focal={c.backgroundFocalPoint} className="size-full" failTone="background" />
            ) : (
              <Elevation />
            )}
          </div>
        </div>

        {/* Dimension down */}
        <div aria-hidden className="relative flex flex-col items-center justify-center">
          <span className="bp-dim-y absolute inset-y-0 left-1/2 w-px bg-c-on-bg">
            <span className="absolute top-0 -left-[5px] h-px w-[11px] bg-c-on-bg" />
            <span className="absolute bottom-0 -left-[5px] h-px w-[11px] bg-c-on-bg" />
          </span>
          <span className="bp-dim-label relative bg-c-bg py-2 font-[family-name:var(--c-font-mono)] text-[12px] leading-none font-medium tracking-[0.08em] [writing-mode:vertical-rl]">240</span>
        </div>
      </div>

      {showAgent && <AgentPlate />}
    </div>
  );
}

/** No cover photo: a front elevation drawn in line, so the frame still holds a drawing. */
function Elevation() {
  return (
    <svg aria-hidden viewBox="0 0 350 240" preserveAspectRatio="xMidYMid meet" className="absolute inset-0 size-full" fill="none" stroke="var(--bp-line)" strokeWidth="1.25">
      <path d="M20 196 H330" stroke="var(--c-on-bg)" strokeWidth="1.5" />
      <path d="M30 196 v6 M50 196 v6 M70 196 v6 M90 196 v6 M110 196 v6 M130 196 v6 M150 196 v6 M170 196 v6 M190 196 v6 M210 196 v6 M230 196 v6 M250 196 v6 M270 196 v6 M290 196 v6 M310 196 v6" />
      <path d="M78 196 V104 L168 52 L258 104 V196" stroke="var(--c-on-bg)" />
      <path d="M62 112 L168 50 L274 112" stroke="var(--c-on-bg)" />
      <path d="M258 140 H312 V196" />
      <rect x="96" y="124" width="40" height="40" />
      <path d="M116 124 V164 M96 144 H136" />
      <rect x="200" y="124" width="40" height="40" />
      <path d="M220 124 V164 M200 144 H240" />
      <rect x="152" y="138" width="32" height="58" />
      <circle cx="160" cy="168" r="1.5" fill="var(--bp-line)" />
      <rect x="270" y="152" width="30" height="22" />
      <circle cx="168" cy="88" r="10" />
      <path d="M20 214 H330" strokeDasharray="2 4" />
    </svg>
  );
}

function AgentPlate() {
  const { bundle } = useCard();
  const c = bundle.card;
  return (
    <div className="relative z-10 -mt-[66px] ml-4 w-[92px] border-[1.5px] border-c-on-bg bg-c-bg p-1 shadow-[0_12px_28px_-12px_rgb(0_0_0/0.55)]">
      <div className="relative aspect-[4/5] overflow-hidden bg-[color:color-mix(in_oklab,var(--c-on-bg)_9%,var(--c-bg))]">
        {c.agentPhotoUrl ? (
          <div className="absolute inset-0" style={cropStyle(c.agentPhotoCrop)}>
            <CardImage src={c.agentPhotoUrl} alt={c.agentPhotoAlt || c.name} sizes="120px" priority className="size-full" failTone="background" />
          </div>
        ) : (
          <div role="img" aria-label={c.name} className="flex size-full items-center justify-center">
            <span aria-hidden className="card-display text-[1.9rem] leading-none">
              {initials(c.name)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ Actions */

const ext = (h: string) => (h.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {});

/** Which of Call / Message still need their own button once the main button has taken one. */
function useSecondary(cta: PrimaryCta | null) {
  const { call, message, messageLabel } = useContactActions();
  return {
    call: cta?.kind === "call" ? null : call,
    message: cta?.kind === "message" ? null : message,
    messageLabel,
  };
}

function HeroActions() {
  const cta = usePrimaryCta(CTA_LABEL);
  const { saveContact } = useContactActions();
  const { call, message, messageLabel } = useSecondary(cta);
  const L = useLabels();

  return (
    <div className="flex flex-col gap-2.5">
      {cta ? (
        <a href={cta.href} {...(cta.external ? { target: "_blank", rel: "noreferrer" } : {})} className="cbtn cbtn-primary bp-cta group min-h-[60px] w-full !justify-between !gap-3 px-5 py-2.5 text-left">
          <span className="flex min-w-0 flex-col">
            <span className="text-[16px] leading-tight font-semibold">{cta.label}</span>
            {cta.sub && <span className="mt-1 font-[family-name:var(--c-font-mono)] text-[12px] leading-tight font-normal tracking-[0.02em]">{cta.sub}</span>}
          </span>
          {cta.external ? (
            <ArrowUpRight aria-hidden className="size-5 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none" strokeWidth={2} />
          ) : (
            <ArrowRight aria-hidden className="size-5 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none" strokeWidth={2} />
          )}
          {cta.external && <span className="sr-only"> (opens in a new tab)</span>}
        </a>
      ) : (
        <button type="button" onClick={saveContact} className="cbtn cbtn-primary bp-cta min-h-[60px] w-full cursor-pointer px-5 text-[16px]">
          <UserPlus aria-hidden className="size-5" strokeWidth={2} />
          {L.saveContact}
        </button>
      )}
      {(call || message || cta) && (
        <div className="flex gap-2.5">
          {call && (
            <a href={call} className="cbtn bp-outline h-[52px] min-w-0 flex-1 px-3 text-[15px]">
              <Phone aria-hidden className="size-[18px] shrink-0" strokeWidth={2} />
              {L.call}
            </a>
          )}
          {message && (
            <a href={message} {...ext(message)} className="cbtn bp-outline h-[52px] min-w-0 flex-1 px-3 text-[15px]">
              <MessageIcon className="size-[18px] shrink-0" />
              <span className="truncate">{messageLabel}</span>
            </a>
          )}
          {cta && (
            <button
              type="button"
              onClick={saveContact}
              aria-label={call || message ? L.saveContact : undefined}
              className={cn("cbtn bp-outline h-[52px] cursor-pointer text-[15px]", call || message ? "w-[52px] shrink-0" : "flex-1 px-4")}
            >
              <UserPlus aria-hidden className="size-[18px]" strokeWidth={2} />
              {!(call || message) && L.saveContact}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ----------------------------------------------------------- Sections */

/** The quote as a general note on the drawing: unnumbered, between the numbered sections. */
function Note() {
  const { bundle } = useCard();
  const L = useLabels();
  const q = bundle.card.quote?.trim().replace(/^[“"]|[”"]$/g, "");
  if (!q) return null;
  return (
    <figure aria-label={L.quote} className="m-0 flex flex-col gap-3 border-y border-[var(--bp-rule)] py-6">
      <span aria-hidden className="font-[family-name:var(--c-font-mono)] text-[12px] leading-none font-semibold tracking-[0.14em] text-[var(--bp-label)] uppercase">
        Note
      </span>
      <blockquote className="card-display m-0 text-[clamp(1.35rem,6cqi,1.65rem)] leading-[1.25] [text-wrap:balance]">
        <p>“{q}”</p>
      </blockquote>
    </figure>
  );
}

/** "https://instagram.com/villaflor.atelier" → "@villaflor.atelier": the row's term already names the platform. */
function handle(url: string): string {
  try {
    const last = new URL(url).pathname.split("/").filter(Boolean).pop();
    return last && !/\.php$/.test(last) ? `@${last.replace(/^@/, "")}` : displayHandle(url);
  } catch {
    return displayHandle(url);
  }
}

type Row = { key: string; term: string; value: ReactNode; href?: string; external?: boolean; onClick?: () => void; mono?: boolean };

/** Contact as a ruled list: term in mono on the left, the link on the right. Socials join it when they follow Contact. */
function ContactSheet({ n, title, withSocials, socialsOnly }: { n: number; title: string; withSocials?: boolean; socialsOnly?: boolean }) {
  const { bundle } = useCard();
  const { saveContact } = useContactActions();
  const L = useLabels();
  const uid = useId();
  const c = bundle.card;
  const socials = bundle.socials.filter((s) => s.visible);

  const socialRows: Row[] = socials.map((s) => ({
    key: s.id,
    term: s.platform === "custom" || s.platform === "website" ? (s.platform === "website" ? L.web : L.social) : getPlatform(s.platform).label,
    value: s.platform === "custom" ? s.label || displayHandle(s.url) : s.platform === "website" ? s.label || displayHandle(s.url) : handle(s.url),
    href: s.url,
    external: true,
  }));
  const rows: Row[] = socialsOnly
    ? socialRows
    : [
        ...(c.email ? [{ key: "email", term: L.email, value: <BreakableEmail value={c.email} />, href: `mailto:${c.email}` }] : []),
        ...(c.phone ? [{ key: "phone", term: L.phone, value: c.phone, href: `tel:${phoneDigits(c.phone)}`, mono: true }] : []),
        ...(withSocials ? socialRows : []),
        { key: "save", term: L.save, value: L.saveToContacts, onClick: saveContact },
      ];
  if (!rows.length) return null;

  const inner = (r: Row) => (
    <>
      <span className={cn("min-w-0 flex-1 text-[15px] font-medium [overflow-wrap:anywhere]", r.mono && "tabular-nums")}>{r.value}</span>
      {r.onClick ? (
        <UserPlus aria-hidden className="size-[18px] shrink-0 text-[var(--bp-label)]" strokeWidth={1.75} />
      ) : (
        r.external ? (
          <ArrowUpRight aria-hidden className="size-[18px] shrink-0 text-[var(--bp-label)]" strokeWidth={1.75} />
        ) : (
          <ChevronRight aria-hidden className="size-[18px] shrink-0 text-[var(--bp-label)]" strokeWidth={1.75} />
        )
      )}
      {r.external && <span className="sr-only"> (opens in a new tab)</span>}
    </>
  );
  const cell = "bp-row flex min-h-[56px] w-full items-center gap-3 py-2.5 pr-1 text-left";

  return (
    <section aria-labelledby={`${uid}-h`} className="flex flex-col gap-3">
      <NumHeading n={n} id={`${uid}-h`}>
        {title}
      </NumHeading>
      <dl className="flex flex-col">
        {rows.map((r) => (
          <div key={r.key} className="grid grid-cols-[92px_minmax(0,1fr)] items-center border-b border-[var(--bp-rule)] @4xl:grid-cols-[120px_minmax(0,1fr)]">
            <dt className="font-[family-name:var(--c-font-mono)] text-[12px] leading-tight font-medium tracking-[0.1em] text-[var(--bp-label)] uppercase">{r.term}</dt>
            <dd className="m-0 min-w-0">
              {r.onClick ? (
                <button type="button" onClick={r.onClick} className={cn(cell, "cursor-pointer")}>
                  {inner(r)}
                </button>
              ) : (
                <a href={r.href} {...(r.external ? { target: "_blank", rel: "noreferrer" } : {})} className={cell}>
                  {inner(r)}
                </a>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** The drawing's title block: who the sheet is for, and the footer line. */
function TitleBlock() {
  const { bundle } = useCard();
  const c = bundle.card;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] border-[1.5px] border-c-on-bg">
      <div className="flex min-w-0 flex-col gap-1 border-r border-[var(--bp-line)] px-3.5 py-3">
        <span className="font-[family-name:var(--c-font-display)] text-[15px] leading-tight font-semibold [overflow-wrap:anywhere]">{c.name}</span>
        {(c.title || c.company) && <span className="font-[family-name:var(--c-font-mono)] text-[12px] leading-snug text-[var(--bp-label)] [overflow-wrap:anywhere]">{[c.title, c.company].filter(Boolean).join(" · ")}</span>}
      </div>
      <div className="flex items-center px-3.5 py-3">
        <CardFooter tone="background" className="font-[family-name:var(--c-font-mono)] text-[12px] text-[var(--bp-label)]" />
      </div>
    </div>
  );
}

/* --------------------------------------------------------- Bottom bar */

/** Sticky bar once the hero actions scroll away: the main button, then Call and Message as square icons (Save stays in the hero and Contact, so the label fits at 360px). */
function BottomBar({ watch }: { watch: React.RefObject<HTMLElement | null> }) {
  const cta = usePrimaryCta(CTA_LABEL);
  const { saveContact } = useContactActions();
  const { call, message, messageLabel } = useSecondary(cta);
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

  const icon = "cbtn bp-outline w-[52px] shrink-0 bg-c-bg";
  return (
    <div
      aria-hidden={!visible}
      inert={!visible}
      className={cn(
        "sticky bottom-0 z-40 -mt-[80px] h-[80px] transition-[transform,opacity] duration-300 [transition-timing-function:var(--ease-out-expo)] motion-reduce:transition-none @4xl:hidden",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0",
      )}
    >
      <div className="mx-auto flex h-full max-w-[520px] gap-2 border-t border-[var(--bp-line)] bg-c-bg px-4 pt-3 pb-[max(14px,env(safe-area-inset-bottom))] shadow-[0_-10px_24px_-8px_rgb(0_0_0/0.35)]">
        {cta ? (
          <a href={cta.href} {...(cta.external ? { target: "_blank", rel: "noreferrer" } : {})} className="cbtn cbtn-primary bp-cta min-w-0 flex-1 px-3 text-[15px]">
            <span className="truncate">{cta.label}</span>
            {cta.external && <span className="sr-only"> (opens in a new tab)</span>}
          </a>
        ) : (
          <button type="button" onClick={saveContact} className="cbtn cbtn-primary bp-cta min-w-0 flex-1 cursor-pointer text-[15px]">
            <UserPlus aria-hidden className="size-[18px]" strokeWidth={2} />
            {L.saveContact}
          </button>
        )}
        {call && (
          <a href={call} aria-label={L.call} className={icon}>
            <Phone aria-hidden className="size-[18px]" strokeWidth={2} />
          </a>
        )}
        {message && (
          <a href={message} {...ext(message)} aria-label={messageLabel} className={icon}>
            <MessageIcon className="size-[18px]" />
          </a>
        )}
      </div>
    </div>
  );
}
