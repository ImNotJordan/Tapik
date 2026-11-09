"use client";

import { ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useCard } from "@/components/card/context";
import { CardImage } from "@/components/card/primitives";
import { cn } from "@/lib/utils";

export const MONO = "font-[family-name:var(--c-font-mono)]";

/*
 * The hero: a chat window. The client's ask in the accent bubble, the
 * builder's reply in mono, the Deployed line in the primary color and a block
 * cursor. With motion on, the reply types itself out once (about 3 seconds);
 * with reduced motion, the motion toggle off, or in thumbnails the finished
 * chat shows at once. Screen readers always get the full text: the typed copy
 * is an aria-hidden layer over the real, transparent text, so nothing reflows.
 *
 * No chat set: the cover photo fills the window. No cover either: an empty
 * "new chat" window with a prompt line.
 */

const THINK_AT = 420; // ms: the reply cursor appears
const TYPE_AT = 820; // ms: typing starts
const LINE_PAUSE = 140; // ms between lines
const TYPE_BUDGET = 2000; // ms for all characters together

export function ChatHero({ animate }: { animate: boolean }) {
  const { bundle, isHidden } = useCard();
  const c = bundle.card;
  const ask = c.promptDemo?.ask?.trim() ?? "";
  const lines = (c.promptDemo?.replyLines ?? []).map((l) => l.trim()).filter(Boolean);
  const result = c.promptDemo?.resultLabel?.trim() ?? "";
  const cover = !isHidden("backgroundPhoto") && c.backgroundPhotoUrl ? c.backgroundPhotoUrl : null;
  const who = firstName(c.name);

  if (!ask && !lines.length && !result) {
    return cover ? <CoverWindow src={cover} /> : <EmptyWindow who={who} />;
  }

  const chat = <ChatWindow ask={ask} lines={lines} result={result} who={who} animate={animate} />;
  if (!cover) return chat;
  // The cover becomes the desktop wallpaper behind the chat window.
  return (
    <div className="relative isolate overflow-hidden rounded-[24px] p-2.5 pt-9 @4xl:rounded-[28px] @4xl:p-7 @4xl:pt-14">
      <div aria-hidden className="absolute inset-0 -z-10">
        <CardImage src={cover} alt="" sizes="(min-width: 896px) 600px, 100vw" priority focal={c.backgroundFocalPoint} className="size-full" failTone="background" />
        <span className="absolute inset-0 bg-c-bg" style={{ opacity: "max(0.6, var(--c-overlay))" }} />
      </div>
      {c.backgroundPhotoAlt && <span className="sr-only">Behind the chat: {c.backgroundPhotoAlt}</span>}
      <div className="shadow-[0_18px_40px_-14px_rgb(0_0_0/0.7)]">{chat}</div>
    </div>
  );
}

/** The window chrome: a title bar in mono, then the body. */
function Frame({ title, children, className }: { title: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-[18px] border border-[var(--pr-border)] bg-c-surface text-c-text", className)}>
      <div className={cn(MONO, "flex h-10 items-center gap-2 border-b border-[var(--pr-border)] px-4 text-[12px] text-c-text-muted")}>
        <span aria-hidden className="size-2 shrink-0 rounded-full bg-[var(--pr-primary-ink)]" />
        <span className="truncate">{title}</span>
      </div>
      {children}
    </div>
  );
}

function Cursor({ blink }: { blink?: boolean }) {
  return <span aria-hidden className={cn("ml-[0.15em] inline-block h-[1.1em] w-[0.55em] translate-y-[0.18em] bg-[var(--pr-primary-ink)]", blink && "pr-blink")} />;
}

type Timeline = { starts: number[]; perChar: number; end: number };

function timeline(segments: string[]): Timeline {
  const total = segments.reduce((n, s) => n + s.length, 0) || 1;
  const perChar = Math.min(28, Math.max(12, TYPE_BUDGET / total));
  const starts: number[] = [];
  let t = TYPE_AT;
  segments.forEach((s) => {
    starts.push(t);
    t += s.length * perChar + LINE_PAUSE;
  });
  return { starts, perChar, end: t };
}

/** Milliseconds since the chat started typing, or null when it shows finished. */
function useTypingClock(animate: boolean, key: string, end: number): number | null {
  const [clock, setClock] = useState<{ key: string; t: number } | null>(null);
  useEffect(() => {
    if (!animate || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    let t0 = 0;
    const tick = (now: number) => {
      if (!t0) t0 = now;
      const t = now - t0;
      setClock({ key, t });
      if (t < end + 60) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [animate, key, end]);
  if (!animate || !clock || clock.key !== key) return null;
  return clock.t;
}

function ChatWindow({ ask, lines, result, who, animate }: { ask: string; lines: string[]; result: string; who: string; animate: boolean }) {
  const segments = useMemo(() => (result ? [...lines, result] : lines), [lines, result]);
  const key = JSON.stringify([ask, segments]);
  const tl = useMemo(() => timeline(segments), [segments]);
  const t = useTypingClock(animate, key, tl.end);
  // Before the clock starts (server render, first paint) the chat is "pending":
  // CSS holds the moving parts back for a moment so the finished text doesn't flash first.
  const state = t === null ? (animate ? "pending" : "static") : t >= tl.end ? "done" : "typing";
  const typing = state === "typing";
  const typed = segments.map((s, i) => (t === null ? s.length : Math.max(0, Math.min(s.length, Math.floor((t - tl.starts[i]) / tl.perChar)))));
  // The segment the cursor sits in while typing: the last one that has started.
  const active = typing ? Math.max(0, tl.starts.findLastIndex((s) => (t ?? 0) >= s)) : segments.length - 1;
  const thinking = typing && (t ?? 0) < TYPE_AT;

  return (
    <Frame title={`${who.toLowerCase()} · build chat`}>
      <div data-pr-chat={state} className="flex flex-col gap-4 p-4 @4xl:gap-5 @4xl:p-6">
        {ask && (
          <div className={cn("pr-hold flex flex-col items-end gap-1.5", t !== null && "pr-rise")}>
            <span className={cn(MONO, "text-[12px] text-c-text-muted")}>client</span>
            <p className="max-w-[88%] rounded-[18px] rounded-br-[6px] bg-[var(--pr-bubble)] px-4 py-2.5 text-[15px] leading-[1.45] text-c-on-bg [text-wrap:pretty] @4xl:text-base">
              {ask}
            </p>
          </div>
        )}
        {segments.length > 0 && (
          <div className={cn("pr-hold flex flex-col gap-1.5", t !== null && t < THINK_AT && "opacity-0")}>
            <span className={cn(MONO, "text-[12px] text-[var(--pr-accent-ink)]")}>{who.toLowerCase()}</span>
            <div className={cn(MONO, "flex flex-col gap-1 text-[13.5px] leading-[1.6] @4xl:text-[14.5px]")}>
              {segments.map((s, i) => {
                const isResult = !!result && i === segments.length - 1;
                const shown = typed[i];
                const started = !typing || (t ?? 0) >= tl.starts[i];
                const cursorHere = typing ? i === active || (thinking && i === 0) : i === segments.length - 1;
                return (
                  <p key={i} className={cn("relative", isResult ? "mt-1.5 font-semibold text-[var(--pr-primary-ink)]" : "pl-5 text-c-text")}>
                    {!isResult && <ChevronRight aria-hidden className={cn("absolute top-[0.32em] left-0 size-3.5 text-c-text-muted transition-opacity", started ? "opacity-100" : "opacity-0")} strokeWidth={2.5} />}
                    <span className={cn(typing && "text-transparent")}>
                      {s}
                      {!typing && cursorHere && <Cursor blink={state === "done" || state === "static"} />}
                    </span>
                    {typing && (
                      <span aria-hidden className={cn("absolute inset-y-0 right-0", isResult ? "left-0" : "left-5")}>
                        {s.slice(0, shown)}
                        {cursorHere && (thinking ? i === 0 : true) && <Cursor />}
                      </span>
                    )}
                  </p>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Frame>
  );
}

function CoverWindow({ src }: { src: string }) {
  const { bundle } = useCard();
  const c = bundle.card;
  return (
    <Frame title={c.backgroundPhotoAlt || c.company || "preview"}>
      <div className="relative aspect-[16/10]">
        <CardImage src={src} alt={c.backgroundPhotoAlt || ""} sizes="(min-width: 896px) 600px, 100vw" priority focal={c.backgroundFocalPoint} className="absolute inset-0" failTone="surface" />
      </div>
    </Frame>
  );
}

/** Nothing to show yet: a fresh chat waiting for the visitor's idea. */
function EmptyWindow({ who }: { who: string }) {
  return (
    <Frame title={`${who.toLowerCase()} · new chat`}>
      <div className="flex min-h-[168px] flex-col justify-end gap-3 p-4 @4xl:min-h-[260px] @4xl:p-6">
        <p className={cn(MONO, "text-[14px] leading-[1.6] text-c-text @4xl:text-[15px]")}>
          <span aria-hidden className="mr-2 text-[var(--pr-accent-ink)]">&gt;</span>
          what should we build?
          <Cursor blink />
        </p>
      </div>
    </Frame>
  );
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || "me";
}
