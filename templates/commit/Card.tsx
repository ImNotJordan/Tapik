"use client";

import { ArrowRight, GitBranch, MapPin, Phone, UserPlus } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { visibleSections } from "@/lib/design/sections";
import type { ReorderableSection } from "@/lib/types";
import { cn, slugify } from "@/lib/utils";
import { MessageIcon, ShareButton, useContactActions } from "@/components/card/actions";
import { useCard } from "@/components/card/context";
import { usePrimaryCta, useStatusChip, type PrimaryCta } from "@/components/card/extras";
import { useLabels } from "@/components/card/labels";
import { AgentPhoto, CardImage, Logo, NameText } from "@/components/card/primitives";
import { AboutBlock, CardFooter, MapBlock, SectionStyle } from "@/components/card/sections";
import { useScrollRoot } from "@/components/ui/device-preview";
import type { TemplateProps } from "../types";
import { ActivityGraph, cityOf, Heading, IntroCode, StackTable, useActivity, useStackRows } from "./sections/blocks";
import { ContactRows, Links, Projects, TeamTree } from "./sections/lists";

const CTA_LABEL = "Hire me for a project";

/**
 * Q — Commit. A README with a person behind it: a repo path, a cover with a
 * round photo, an Open to projects status, the intro as a code block, Hire me,
 * a commit graph, the stack as a table, projects as plates and the team as a
 * file tree. On wide screens it becomes a profile: identity and actions in a
 * sticky sidebar, the README beside it.
 */
export default function CommitCard({ bundle, tokens, mode }: TemplateProps) {
  const { card } = bundle;
  const { isHidden } = useCard();
  const H1 = mode === "public" ? "h1" : "p";
  const actionsRef = useRef<HTMLDivElement>(null);
  const activity = useActivity();
  const hasStack = useStackRows().length > 0;
  const city = cityOf(card.address);
  const cover = card.backgroundPhotoUrl && !isHidden("backgroundPhoto") ? card.backgroundPhotoUrl : null;
  const showPhoto = !isHidden("agentPhoto");

  // The quote lives inside the intro code block, so it isn't a section of its own.
  const sections = visibleSections(bundle).filter((k) => k !== "quote");
  type Key = ReorderableSection | "activity" | "stack";
  const order: Key[] = [...sections];
  const at = order.indexOf("about");
  // The graph sits above the bio and the stack below it; with no bio both lead.
  order.splice(at >= 0 ? at + 1 : 0, 0, "stack");
  order.splice(at >= 0 ? at : 0, 0, "activity");

  const render: Record<Key, () => ReactNode> = {
    activity: () => (activity ? <ActivityGraph activity={activity} /> : null),
    about: () => <AboutBlock tone="background" heading className="[&>div]:text-c-on-bg [&>div]:text-[16px]" />,
    stack: () => (hasStack ? <StackTable /> : null),
    photos: () => <Projects />,
    orgChart: () => <TeamTree />,
    map: () => <MapBlock tone="background" title="Location" mapClassName="!h-48 !rounded-[12px] @4xl:!h-60" />,
    contact: () => <ContactRows />,
    socials: () => <Links />,
    quote: () => null,
  };

  const vars = {
    "--cm-muted": "color-mix(in srgb, var(--c-on-bg) 72%, var(--c-bg))",
    "--cm-line": "color-mix(in srgb, var(--c-on-bg) 13%, var(--c-bg))",
    "--cm-rule": "color-mix(in srgb, var(--c-on-bg) 50%, var(--c-bg))",
    "--cm-tint": "color-mix(in srgb, var(--c-on-bg) 5%, var(--c-bg))",
    "--cm-cell-0": "color-mix(in srgb, var(--c-on-bg) 7%, var(--c-bg))",
    "--cm-code-bg": "var(--c-text)",
    "--cm-code-fg": "var(--c-surface)",
    "--cm-code-dim": "color-mix(in srgb, var(--c-surface) 62%, var(--c-text))",
    "--cm-code-kw": "color-mix(in srgb, var(--c-accent) 62%, var(--c-surface))",
    "--cm-code-str": "color-mix(in srgb, var(--c-accent) 34%, var(--c-surface))",
  } as CSSProperties;

  return (
    <SectionStyle.Provider value={{ renderHeading: (p) => <Heading {...p} /> }}>
      <style>{CSS}</style>
      <div style={vars} className="relative min-h-[var(--c-vh)] text-c-on-bg">
        <div className="mx-auto flex min-h-[var(--c-vh)] max-w-[480px] flex-col @4xl:max-w-[1160px] @4xl:px-10 @4xl:pb-12">
          <RepoBar />

          {cover && (
            <div className="relative mx-4 h-[150px] overflow-hidden rounded-[12px] bg-[var(--cm-cell-0)] @4xl:mx-0 @4xl:h-[220px] @4xl:rounded-[16px]">
              <CardImage src={cover} alt={card.backgroundPhotoAlt || ""} sizes="(min-width: 896px) 1080px, 92vw" priority focal={card.backgroundFocalPoint} className="size-full" failTone="background" />
            </div>
          )}

          <div className="flex flex-1 flex-col @4xl:grid @4xl:grid-cols-[296px_minmax(0,1fr)] @4xl:items-start @4xl:gap-14">
            {/* Profile: photo, status, identity, actions */}
            <div className="flex flex-col @4xl:top-6 @4xl:[@media(min-height:720px)]:sticky">
              <div
                className={cn(
                  "flex items-end justify-between gap-3 px-4 @4xl:flex-col @4xl:items-start @4xl:gap-5 @4xl:px-0",
                  cover && showPhoto ? "-mt-12 @4xl:-mt-24" : "mt-4 @4xl:mt-8",
                )}
              >
                {showPhoto && (
                  <div className="relative z-10 shrink-0 rounded-full bg-c-bg p-1 @4xl:p-1.5">
                    <AgentPhoto shape="circle" sizes="(min-width: 896px) 200px, 104px" priority tone="background" className="w-[96px] @4xl:w-[200px]" />
                  </div>
                )}
                <Status />
              </div>

              <div className="flex flex-col gap-2 px-4 pt-4 @4xl:px-0">
                <H1 className="card-display text-[clamp(1.75rem,8.2cqi,2rem)] leading-[1.08] [overflow-wrap:anywhere] [text-wrap:balance] @4xl:text-[1.875rem]">
                  <NameText name={card.name} />
                </H1>
                {card.title && <p className="text-[17px] leading-snug text-[var(--cm-muted)] [overflow-wrap:anywhere]">{card.title}</p>}
                <Meta city={city} logoGround={tokens.background} />
              </div>

              <IntroCode className="px-4 pt-6 @4xl:hidden" />

              <div ref={actionsRef} className="px-4 pt-6 @4xl:px-0">
                <HeroActions />
              </div>
            </div>

            {/* The README */}
            <main className="flex flex-col gap-11 px-4 pt-12 pb-28 @4xl:gap-12 @4xl:px-0 @4xl:pt-8 @4xl:pb-0">
              <IntroCode className="hidden @4xl:block" />
              {order.map((key) => {
                const node = render[key]();
                return node ? <div key={key}>{node}</div> : null;
              })}
              <CardFooter tone="background" className="border-t border-[var(--cm-line)] pt-6 text-[var(--cm-muted)]" />
            </main>
          </div>
        </div>

        <BottomBar watch={actionsRef} />
      </div>
    </SectionStyle.Provider>
  );
}

/* ------------------------------------------------------------- Header */

/** `~/joshua-reyes ⎇ main`, the repo path the README lives at. */
function RepoBar() {
  const { bundle } = useCard();
  const slug = slugify(bundle.card.name) || bundle.card.slug;
  return (
    <header className="flex h-16 items-center gap-3 px-4 @4xl:h-20 @4xl:px-0">
      <p aria-hidden className="flex min-w-0 flex-1 items-center gap-2.5 font-[family-name:var(--c-font-mono)] text-[13.5px] @4xl:text-[14.5px]">
        <span className="min-w-0 truncate">
          <span className="text-[var(--cm-muted)]">~/</span>
          <span className="font-medium text-c-on-bg">{slug}</span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--cm-line)] px-2 py-0.5 text-[12px] text-[var(--cm-muted)]">
          <GitBranch aria-hidden className="size-3.5" strokeWidth={2} />
          main
        </span>
      </p>
      <ShareButton className="border border-[var(--cm-line)] text-c-on-bg hover:bg-[var(--cm-tint)]" />
    </header>
  );
}

/* ------------------------------------------------------------ Identity */

function Status() {
  const chip = useStatusChip("Open to projects");
  if (!chip) return <span />;
  const live = chip.tone === "live";
  return (
    <p className="mb-1 inline-flex min-h-8 max-w-full items-center gap-2 rounded-full border border-[var(--cm-line)] bg-c-bg py-1 pr-3.5 pl-3 text-[13.5px] leading-tight font-medium text-c-on-bg @4xl:mb-0">
      <span aria-hidden className={cn("cm-dot relative size-2.5 shrink-0 rounded-full", live ? "bg-c-accent" : "border-2 border-[var(--cm-muted)]")} data-live={live || undefined} />
      <span className="min-w-0 [overflow-wrap:anywhere]">{chip.label}</span>
    </p>
  );
}

/** Logo (or company) and city: the line under the title. */
function Meta({ city, logoGround }: { city: string | null; logoGround: string }) {
  const { bundle, isHidden } = useCard();
  const c = bundle.card;
  const hasLogo = !isHidden("logo") && (c.logoUrl || c.logoDarkUrl || c.company);
  if (!hasLogo && !city) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1 text-[14.5px] text-[var(--cm-muted)] @4xl:flex-col @4xl:items-start">
      {hasLogo && <Logo on={logoGround} className="h-6 max-w-[180px] text-[14.5px] font-semibold text-c-on-bg" />}
      {city && (
        <span className="inline-flex items-center gap-1.5">
          <MapPin aria-hidden className="size-4 shrink-0" strokeWidth={1.75} />
          {city}
        </span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------- Actions */

function HeroActions() {
  const cta = usePrimaryCta(CTA_LABEL);
  const { call, message, messageLabel, saveContact } = useContactActions();
  const L = useLabels();
  const outline = "cbtn cbtn-secondary h-12 min-w-0 px-2 text-[15px]";

  const rest = [
    call && cta?.kind !== "call" && (
      <a key="call" href={call} className={outline}>
        <Phone aria-hidden className="size-[18px] shrink-0" strokeWidth={2} />
        <span className="truncate">{L.call}</span>
      </a>
    ),
    message && cta?.kind !== "message" && (
      <a key="msg" href={message} {...ext(message)} className={outline}>
        <MessageIcon className="size-[18px] shrink-0" />
        <span className="truncate">{messageLabel}</span>
      </a>
    ),
    <button key="save" type="button" onClick={saveContact} className={cn(outline, "cursor-pointer")}>
      <UserPlus aria-hidden className="size-[18px] shrink-0" strokeWidth={2} />
      <span className="truncate">{L.save}</span>
    </button>,
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-2.5">
      {cta && <Cta cta={cta} />}
      <div className="grid gap-2.5" style={{ gridTemplateColumns: `repeat(${rest.length}, minmax(0, 1fr))` }}>
        {rest}
      </div>
    </div>
  );
}

const ext = (h: string) => (h.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {});

function Cta({ cta }: { cta: PrimaryCta }) {
  const icon =
    cta.kind === "message" ? <MessageIcon className="size-5 shrink-0" /> : cta.kind === "call" ? <Phone aria-hidden className="size-5 shrink-0" strokeWidth={2} /> : null;
  return (
    <a
      href={cta.href}
      {...(cta.external ? { target: "_blank", rel: "noreferrer" } : {})}
      className="cm-ink cbtn cbtn-primary group min-h-14 w-full justify-between gap-3 px-5 py-2.5 text-left"
    >
      <span className="flex min-w-0 items-center gap-3">
        {icon}
        <span className="flex min-w-0 flex-col">
          <span className="text-[16px] leading-tight font-semibold [overflow-wrap:anywhere]">{cta.label}</span>
          {cta.sub && <span className="mt-0.5 text-[13px] leading-tight font-normal opacity-90">{cta.sub}</span>}
        </span>
      </span>
      <ArrowRight aria-hidden className="ml-auto size-5 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none" strokeWidth={2.25} />
      {cta.external && <span className="sr-only"> (opens in a new tab)</span>}
    </a>
  );
}

/**
 * Sticky bottom bar once the hero actions scroll away: the main button
 * (2fr), then Call and Message unless the main button already is one of them.
 */
function BottomBar({ watch }: { watch: React.RefObject<HTMLElement | null> }) {
  const cta = usePrimaryCta(CTA_LABEL);
  const { call, message, messageLabel } = useContactActions();
  const { bundle } = useCard();
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

  // The full label is long for a third of a phone; the default shortens to "Hire me".
  const ctaLabel = cta && cta.kind === "link" && !bundle.card.bookingLabel?.trim() ? "Hire me" : cta?.label;
  const items = [
    cta && { key: "cta", href: cta.href, cls: "cm-ink cbtn cbtn-primary", label: ctaLabel!, icon: null, span: "2fr", aria: cta.label },
    call && cta?.kind !== "call" && { key: "call", href: call, cls: "cbtn cbtn-secondary", label: L.call, icon: <Phone aria-hidden className="size-[18px] shrink-0" strokeWidth={2} />, span: "1fr" },
    message && cta?.kind !== "message" && { key: "msg", href: message, cls: "cbtn cbtn-secondary", label: messageLabel, icon: <MessageIcon className="size-[18px] shrink-0" />, span: "1fr" },
  ].filter(Boolean) as { key: string; href: string; cls: string; label: string; icon: ReactNode; span: string; aria?: string }[];
  if (!items.length) return null;

  return (
    <div
      aria-hidden={!visible}
      inert={!visible}
      className={cn(
        "sticky bottom-0 z-40 -mt-[80px] h-[80px] transition-[transform,opacity] duration-300 [transition-timing-function:var(--ease-out-expo)] motion-reduce:transition-none @4xl:hidden",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0",
      )}
    >
      <div
        className="mx-auto grid h-full max-w-[480px] gap-2 border-t border-[var(--cm-line)] bg-c-bg px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] shadow-[0_-6px_20px_rgb(0_0_0/0.08)]"
        style={{ gridTemplateColumns: items.map((i) => i.span).join(" ") }}
      >
        {items.map((i) => (
          <a key={i.key} href={i.href} {...ext(i.href)} aria-label={i.aria && i.aria !== i.label ? i.aria : undefined} className={cn(i.cls, "min-w-0 px-2 text-[15px]")}>
            {i.icon}
            <span className="truncate">{i.label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- CSS */

/* Template-scoped rules the utilities can't express: focus rings on ink fills, and the one motion moment. */
const CSS = `
[data-template="commit"] .cm-ink:focus-visible { outline-color: var(--c-on-bg); }
[data-template="commit"] ::selection { background: color-mix(in srgb, var(--c-accent) 26%, var(--c-bg)); color: var(--c-on-bg); }
@media (prefers-reduced-motion: no-preference) {
  [data-template="commit"][data-motion="on"] .cm-cell {
    animation: cm-cell-in 520ms cubic-bezier(0.16, 1, 0.3, 1) both;
    animation-delay: calc(var(--w, 0) * 32ms + 250ms);
  }
  [data-template="commit"][data-motion="on"] .cm-dot[data-live]::after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: 9999px;
    background: var(--c-accent);
    animation: cm-ping 2.4s cubic-bezier(0, 0, 0.2, 1) infinite;
  }
}
@keyframes cm-cell-in { from { opacity: 0.15; transform: scale(0.5); } }
@keyframes cm-ping { 0% { transform: scale(1); opacity: 0.55; } 70%, 100% { transform: scale(2.6); opacity: 0; } }
`;
