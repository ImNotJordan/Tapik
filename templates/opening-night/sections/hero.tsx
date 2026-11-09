"use client";

import { Clock } from "lucide-react";
import type { CardEvent } from "@/lib/types";
import { cn, initials } from "@/lib/utils";
import { useCard } from "@/components/card/context";
import { eventDate, useEventClock, type EventClock } from "@/components/card/extras";
import { useLabels, type CardLabels } from "@/components/card/labels";
import { AgentPhoto, CardImage } from "@/components/card/primitives";

/* The circle sits top-right so the time chip (bottom-left) never touches it. */
const CIRCLE = "absolute top-5 right-5 size-[min(220px,58cqi)] rounded-full @4xl:top-6 @4xl:right-6";

/**
 * The rounded 300px panel: cover photo washed in the ground color, the big
 * pop-colored circle with the date, and the time chip. With no event the
 * circle holds the owner's photo (or initials) instead, and there is no chip.
 */
export function HeroPanel({ event }: { event: CardEvent | null }) {
  const { bundle, isHidden } = useCard();
  const c = bundle.card;
  const cover = !isHidden("backgroundPhoto") && c.backgroundPhotoUrl ? c.backgroundPhotoUrl : null;

  return (
    <div className="relative h-[300px] overflow-hidden rounded-[28px] bg-[color:color-mix(in_oklab,var(--c-on-bg)_8%,var(--c-bg))]">
      {cover ? (
        <>
          <div className="absolute inset-0">
            <CardImage src={cover} alt={c.backgroundPhotoAlt || ""} sizes="(min-width: 1024px) 480px, 92vw" priority focal={c.backgroundFocalPoint} className="size-full" failTone="background" />
          </div>
          <div aria-hidden className="absolute inset-0 bg-c-bg" style={{ opacity: "var(--c-overlay)" }} />
        </>
      ) : (
        <Ripples />
      )}
      {event ? <DateCircle event={event} /> : <HostCircle />}
      {event && <TimeChip event={event} />}
    </div>
  );
}

/** Without a cover photo: two faint rings spreading from the circle, so the panel still reads as a stage. */
function Ripples() {
  return (
    <svg aria-hidden viewBox="0 0 400 300" preserveAspectRatio="xMaxYMin slice" className="absolute inset-0 size-full" fill="none" stroke="var(--c-on-bg)">
      <circle cx="290" cy="128" r="150" strokeOpacity="0.14" strokeWidth="1.5" />
      <circle cx="290" cy="128" r="205" strokeOpacity="0.09" strokeWidth="1.5" />
    </svg>
  );
}

function DateCircle({ event }: { event: CardEvent }) {
  const d = eventDate(event);
  const wd = d.weekday.slice(0, 3).toUpperCase();
  return (
    <div className={cn(CIRCLE, "on-stamp flex flex-col items-center justify-center bg-c-primary text-c-on-primary shadow-[0_18px_40px_-18px_rgb(0_0_0/0.6)]")}>
      <span aria-hidden className="card-display text-[56px] leading-none tabular-nums">
        {d.day}
      </span>
      <span aria-hidden className="mt-2.5 text-[13px] leading-none font-bold tracking-[0.18em]">
        {d.month} · {wd}
      </span>
      <span className="sr-only">{d.full}</span>
    </div>
  );
}

function HostCircle() {
  const { bundle, isHidden } = useCard();
  const c = bundle.card;
  if (c.agentPhotoUrl && !isHidden("agentPhoto")) {
    return (
      <div className={cn(CIRCLE, "on-stamp bg-c-primary p-2 shadow-[0_18px_40px_-18px_rgb(0_0_0/0.6)]")}>
        <AgentPhoto shape="circle" sizes="220px" priority tone="background" className="size-full" />
      </div>
    );
  }
  // Initials stand in for the photo; the name itself is the h1 below.
  return (
    <div aria-hidden className={cn(CIRCLE, "on-stamp flex items-center justify-center bg-c-primary text-c-on-primary shadow-[0_18px_40px_-18px_rgb(0_0_0/0.6)]")}>
      <span className="card-display text-[56px] leading-none">{initials(c.name)}</span>
    </div>
  );
}

function TimeChip({ event }: { event: CardEvent }) {
  const label = event.timeLabel?.trim() || eventDate(event).time;
  return (
    <p className="absolute bottom-4 left-4 inline-flex min-h-10 max-w-[calc(100%-2rem)] items-center gap-2 rounded-full bg-c-surface px-4 text-[15px] font-semibold text-c-text shadow-[0_8px_20px_-10px_rgb(0_0_0/0.5)]">
      <Clock aria-hidden className="size-4 shrink-0" strokeWidth={2.25} />
      <span className="truncate">{label}</span>
    </p>
  );
}

/* ---------------------------------------------------------- Countdown */

const pad = (n: number) => String(n).padStart(2, "0");

/** "Starts in 12 days": coarse on purpose, so the accessible text barely changes while the boxes tick. */
function startsIn(c: Extract<EventClock, { state: "upcoming" }>, L: CardLabels): string {
  const fil = L.lang === "fil";
  const [n, unit] =
    c.days > 0 ? [c.days, fil ? "araw" : c.days === 1 ? "day" : "days"] : c.hours > 0 ? [c.hours, fil ? "oras" : c.hours === 1 ? "hour" : "hours"] : c.minutes > 0 ? [c.minutes, fil ? "minuto" : c.minutes === 1 ? "minute" : "minutes"] : [0, ""];
  if (!n) return fil ? "Magsisimula na sa loob ng isang minuto" : "Starts in under a minute";
  return fil ? `Magsisimula sa loob ng ${n} ${unit}` : `Starts in ${n} ${unit}`;
}

/**
 * Days, hours, minutes and seconds to the doors opening, ticking each second
 * (paused while the tab is hidden). The ticking boxes are hidden from screen
 * readers; they get one coarse line instead. The live region only changes
 * when the state does: upcoming → Happening now → Thanks for coming.
 */
export function Countdown({ event }: { event: CardEvent }) {
  const L = useLabels();
  const { bundle } = useCard();
  const clock = useEventClock(event);
  if (!clock) return null;
  const fil = L.lang === "fil";

  const live = clock.state === "live" ? L.started : clock.state === "after" ? (fil ? "Salamat sa pagpunta" : "Thanks for coming") : "";

  return (
    <div>
      <p aria-live="polite" className="sr-only">
        {live}
      </p>
      {clock.state === "upcoming" ? (
        <>
          <p className="sr-only">{startsIn(clock, L)}</p>
          <div aria-hidden className="grid grid-cols-4 gap-2">
            {(
              [
                [clock.days, L.days],
                [clock.hours, L.hoursShort],
                [clock.minutes, L.minutes],
                [clock.seconds, fil ? "seg" : "sec"],
              ] as const
            ).map(([n, label]) => (
              <div key={label} className="flex flex-col items-center gap-1.5 rounded-[18px] bg-[color:color-mix(in_oklab,var(--c-text)_35%,var(--c-bg))] pt-3.5 pb-3">
                <span className="card-display text-[clamp(1.5rem,7.4cqi,2rem)] leading-none tabular-nums">{pad(n)}</span>
                <span className="text-[12px] leading-none font-semibold tracking-[0.12em] text-c-on-bg-muted uppercase">{label}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="flex min-h-[84px] items-center gap-4 rounded-[18px] bg-[color:color-mix(in_oklab,var(--c-text)_35%,var(--c-bg))] px-5 py-4">
          {clock.state === "live" ? (
            <span aria-hidden className="relative flex size-4 shrink-0">
              <span className="on-ping absolute inset-0 rounded-full bg-c-primary" />
              <span className="relative size-4 rounded-full bg-c-primary" />
            </span>
          ) : null}
          <span className="flex min-w-0 flex-col gap-1">
            {/* Read once through the live region above. */}
            <span aria-hidden className="card-display text-[1.35rem] leading-tight">
              {live}
            </span>
            <span className="text-[15px] leading-snug text-c-on-bg-muted">
              {clock.state === "live"
                ? [event.timeLabel?.trim(), event.venue?.trim() || bundle.card.address?.trim()].filter(Boolean).join(" · ") || eventDate(event).full
                : fil
                  ? `Hanggang sa susunod sa ${bundle.card.name}.`
                  : `See you again at ${bundle.card.name}.`}
            </span>
          </span>
        </div>
      )}
    </div>
  );
}
