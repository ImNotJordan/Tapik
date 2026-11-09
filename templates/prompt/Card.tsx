"use client";

import { ArrowRight, Phone, UserPlus } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { visibleSections } from "@/lib/design/sections";
import { cn } from "@/lib/utils";
import { MessageIcon, ShareButton, useContactActions } from "@/components/card/actions";
import { useCard } from "@/components/card/context";
import { usePrimaryCta, type PrimaryCta } from "@/components/card/extras";
import { useLabels } from "@/components/card/labels";
import { AgentPhoto, Logo, NameText } from "@/components/card/primitives";
import { CardFooter, OrgChartBlock, SectionStyle } from "@/components/card/sections";
import { useScrollRoot } from "@/components/ui/device-preview";
import type { TemplateProps } from "../types";
import { promptRoles } from "./roles";
import { BasedIn, CommentHeading, HowIBuild, Online, ReachMe, Shipped, useTools } from "./sections/blocks";
import { ChatHero, MONO } from "./sections/chat";

/**
 * P — Prompt. For people who build software by talking to AI. The hero is a
 * chat window: the client's ask, the builder's reply typed out in mono and a
 * Deployed line with a block cursor. Then the builder, their line with its
 * last phrase in the primary color, Book a build sprint, and sections headed
 * like code comments. Wide screens: the chat sits beside the builder and the
 * sections pair up in two columns.
 */

const CSS = `
@media (prefers-reduced-motion: no-preference) {
  [data-template="prompt"][data-motion="on"] [data-pr-chat="pending"] .pr-hold { animation: pr-hold 0s 1.4s backwards; }
  [data-template="prompt"][data-motion="on"] .pr-blink { animation: pr-blink 1.06s steps(1) 2; }
  [data-template="prompt"][data-motion="on"] .pr-rise { animation: pr-rise 460ms var(--ease-out-expo) both; }
}
@keyframes pr-hold { from, to { opacity: 0; } }
@keyframes pr-blink { 50% { opacity: 0; } }
@keyframes pr-rise { from { opacity: 0; transform: translateY(10px); } }
[data-template="prompt"] .pr-cta:focus-visible { outline-color: var(--c-primary); }
`;

/** Sections that sit two across on wide screens when they meet; the rest take the full width. */
const NARROW = new Set<string>(["orgChart", "map", "socials", "contact"]);

export default function PromptCard({ bundle, tokens, mode }: TemplateProps) {
  const { card } = bundle;
  const { isHidden } = useCard();
  const H1 = mode === "public" ? "h1" : "p";
  const roles = useMemo(() => promptRoles(tokens), [tokens]);
  const actionsRef = useRef<HTMLDivElement>(null);
  const tools = useTools();
  const animate = card.motion && mode !== "thumbnail";

  const vars = {
    "--pr-bubble": roles.bubble,
    "--pr-accent-ink": roles.accentInk,
    "--pr-primary-ink": roles.primaryInk,
    "--pr-border": roles.border,
  } as CSSProperties;

  // The quote lives in the hero; tools ride with About, or stand alone where About would be.
  const sections = visibleSections(bundle).filter((k) => k !== "quote");
  const order: string[] = [...sections];
  if (tools.length && !sections.includes("about")) order.splice(0, 0, "tools");
  const line = !isHidden("quote") && card.quote?.trim() ? splitLine(card.quote) : null;

  const render: Record<string, () => ReactNode> = {
    about: () => <HowIBuild withBio />,
    tools: () => <HowIBuild withBio={false} />,
    photos: () => <Shipped />,
    orgChart: () => <OrgChartBlock tone="background" title="crew" />,
    map: () => <BasedIn />,
    socials: () => <Online />,
    contact: () => <ReachMe />,
  };

  // Wide screens: two narrow sections in a row share a line; anything else spans both columns.
  // Pairs are counted from the start of each run of narrow sections; an odd last one spans.
  const spans = order.map((k) => (NARROW.has(k) ? "" : "@4xl:col-span-2"));
  for (let i = 0, run = 0; i < order.length; i++) {
    if (!NARROW.has(order[i])) {
      run = 0;
      continue;
    }
    run++;
    const runEnds = !NARROW.has(order[i + 1] ?? "");
    if (runEnds && run % 2 === 1) spans[i] = "@4xl:col-span-2";
  }

  return (
    <SectionStyle.Provider value={{ renderHeading: (p) => <CommentHeading {...p} /> }}>
      <style href="tpl-prompt" precedence="default">
        {CSS}
      </style>
      <div style={vars} className="relative min-h-[var(--c-vh)] text-c-on-bg selection:bg-[var(--pr-bubble)] selection:text-c-on-bg">
        <div className="mx-auto flex min-h-[var(--c-vh)] max-w-[480px] flex-col @2xl:max-w-[560px] @4xl:max-w-[1180px] @4xl:px-10">
          <header className="flex h-16 items-center gap-3 px-4 @4xl:h-20 @4xl:px-0">
            <Logo on={tokens.background} className="h-8 text-[17px] font-semibold text-c-on-bg" />
            <ShareButton className="border border-[var(--pr-border)] text-c-on-bg hover:bg-c-bg-tint" />
          </header>

          <div className="grid gap-7 px-4 pt-1 @4xl:grid-cols-[minmax(0,1fr)_minmax(0,1.12fr)] @4xl:items-center @4xl:gap-16 @4xl:px-0 @4xl:pt-6 @4xl:pb-4">
            <div className="@4xl:col-start-2 @4xl:row-start-1">
              <ChatHero animate={animate} />
            </div>

            <div className="flex flex-col gap-6 @4xl:col-start-1 @4xl:row-start-1 @4xl:gap-8">
              <div className="flex flex-col gap-4">
                {!isHidden("agentPhoto") && (
                  <div className="self-start rounded-[19px] border-2 border-c-accent p-[3px]">
                    <AgentPhoto shape="rounded-square" sizes="96px" priority tone="background" className="w-[72px] @4xl:w-[88px]" />
                  </div>
                )}
                <div className="flex flex-col gap-1.5">
                  <H1 className="card-display text-[clamp(2.1rem,10.5cqi,2.75rem)] leading-[1.02] [overflow-wrap:anywhere] [text-wrap:balance] @2xl:text-[2.75rem] @4xl:text-[3.5rem]">
                    <NameText name={card.name} />
                  </H1>
                  {(card.title || card.company) && (
                    <p className="text-base leading-snug text-c-on-bg-muted @4xl:text-[17px]">
                      {card.title && <span className="font-medium text-c-on-bg">{card.title}</span>}
                      {card.title && card.company && <span aria-hidden> · </span>}
                      {card.company && <span>{card.company}</span>}
                    </p>
                  )}
                </div>
              </div>

              {line && (
                <p className="card-display max-w-[24ch] text-[1.45rem] leading-[1.22] [text-wrap:balance] @4xl:text-[1.85rem]">
                  {line[0]}
                  {line[1] && <span className="text-[var(--pr-primary-ink)]">{line[1]}</span>}
                </p>
              )}

              <div ref={actionsRef}>
                <HeroActions />
              </div>
            </div>
          </div>

          <main className="mt-14 grid flex-1 content-start gap-12 px-4 pb-28 @4xl:mt-24 @4xl:grid-cols-2 @4xl:gap-x-16 @4xl:gap-y-20 @4xl:px-0 @4xl:pb-16">
            {order.map((k, i) => (
              <div key={k} className={cn("min-w-0", spans[i])}>
                {render[k]?.()}
              </div>
            ))}
            <CardFooter tone="background" className={cn(MONO, "@4xl:col-span-2 text-[12.5px]")} />
          </main>
        </div>

        <BottomBar watch={actionsRef} />
      </div>
    </SectionStyle.Provider>
  );
}

/** "You describe it. I ship it, this week." → the phrase after the last comma or full stop carries the color. */
export function splitLine(raw: string): [string, string] {
  const q = raw.trim().replace(/^[“"]|[”"]$/g, "");
  const body = q.replace(/[.!?]+$/, "");
  const i = Math.max(body.lastIndexOf(", "), body.lastIndexOf(". "), body.lastIndexOf("; "));
  if (i > 0 && q.length - i - 2 <= 40) return [q.slice(0, i + 1) + " ", q.slice(i + 2)];
  return [q, ""];
}

function useActions() {
  const cta = usePrimaryCta("Book a build sprint");
  const { call, message, messageLabel } = useContactActions();
  return {
    cta,
    call: cta?.kind === "call" ? null : call,
    message: cta?.kind === "message" ? null : message,
    messageLabel,
  };
}

const ext = (h: string) => (h.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {});

function HeroActions() {
  const { cta, call, message, messageLabel } = useActions();
  const { saveContact } = useContactActions();
  const L = useLabels();
  const tile = "cbtn h-[68px] flex-col gap-1 border border-[var(--pr-border)] bg-c-surface text-[14px] text-c-text hover:bg-c-surface-tint";
  const tiles = [
    call && (
      <a key="call" href={call} className={tile}>
        <Phone aria-hidden className="size-5" strokeWidth={2} />
        {L.call}
      </a>
    ),
    message && (
      <a key="msg" href={message} {...ext(message)} className={tile}>
        <MessageIcon className="size-5" />
        {messageLabel}
      </a>
    ),
    <button key="save" type="button" onClick={saveContact} className={cn(tile, "cursor-pointer")}>
      <UserPlus aria-hidden className="size-5" strokeWidth={2} />
      {L.save}
    </button>,
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-2.5">
      {cta && <Cta cta={cta} />}
      <div className={cn("grid gap-2.5", tiles.length === 3 ? "grid-cols-3" : tiles.length === 2 ? "grid-cols-2" : "grid-cols-1")}>{tiles}</div>
    </div>
  );
}

function Cta({ cta }: { cta: PrimaryCta }) {
  const icon = cta.kind === "message" ? <MessageIcon className="size-5" /> : cta.kind === "call" ? <Phone aria-hidden className="size-5" strokeWidth={2} /> : null;
  return (
    <a href={cta.href} {...(cta.external ? { target: "_blank", rel: "noreferrer" } : {})} className="cbtn cbtn-primary pr-cta group min-h-[60px] w-full justify-between gap-3 px-5 py-2.5 text-left">
      <span className="flex min-w-0 items-center gap-3">
        {icon}
        <span className="flex min-w-0 flex-col">
          <span className="text-base leading-tight font-semibold">{cta.label}</span>
          {cta.sub && <span className="mt-0.5 text-[13px] leading-tight font-medium opacity-90">{cta.sub}</span>}
        </span>
      </span>
      <ArrowRight aria-hidden className="size-5 shrink-0 transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none" strokeWidth={2.25} />
      {cta.external && <span className="sr-only"> (opens in a new tab)</span>}
    </a>
  );
}

/**
 * Phone bar: the main button, Call and Message within thumb reach whenever the
 * hero buttons are off screen (below the chat on load, or scrolled past).
 */
function BottomBar({ watch }: { watch: React.RefObject<HTMLElement | null> }) {
  const { cta, call, message, messageLabel } = useActions();
  const L = useLabels();
  const root = useScrollRoot();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = watch.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setVisible(!entry.isIntersecting), { root: root?.current ?? null, threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, [watch, root]);

  if (!cta && !call && !message) return null;
  const icon = "cbtn size-[52px] shrink-0 border border-[var(--pr-border)] bg-c-surface text-c-text hover:bg-c-surface-tint";

  return (
    <div
      aria-hidden={!visible}
      inert={!visible}
      className={cn(
        "sticky bottom-0 z-40 -mt-[80px] h-[80px] transition-[transform,opacity] duration-300 [transition-timing-function:var(--ease-out-expo)] motion-reduce:transition-none @4xl:hidden",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0",
      )}
    >
      <div className="mx-auto flex h-full max-w-[560px] items-center gap-2 border-t border-[var(--pr-border)] bg-c-bg px-4 pt-2.5 pb-[max(12px,env(safe-area-inset-bottom))]">
        {cta && (
          <a href={cta.href} {...(cta.external ? { target: "_blank", rel: "noreferrer" } : {})} className="cbtn cbtn-primary pr-cta h-[52px] min-w-0 flex-1 px-4 text-[15px]">
            <span className="truncate">{cta.label}</span>
            <ArrowRight aria-hidden className="size-[18px] shrink-0" strokeWidth={2.25} />
          </a>
        )}
        {call && (
          <a href={call} aria-label={L.call} className={cn(icon, !cta && "flex-1")}>
            <Phone aria-hidden className="size-5" strokeWidth={2} />
            {!cta && L.call}
          </a>
        )}
        {message && (
          <a href={message} {...ext(message)} aria-label={messageLabel} className={cn(icon, !cta && "flex-1")}>
            <MessageIcon className="size-5" />
            {!cta && messageLabel}
          </a>
        )}
      </div>
    </div>
  );
}
