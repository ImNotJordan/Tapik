"use client";

import { eventDate, useCountdown } from "@/components/card/extras";
import { useLabels } from "@/components/card/labels";
import type { CardEvent } from "@/lib/types";
import { cn } from "@/lib/utils";

/** The date as a tear-off calendar page, pinned at a slight angle. */
export function CalendarBlock({ event, className }: { event: CardEvent; className?: string }) {
  const d = eventDate(event);
  return (
    <div
      role="img"
      aria-label={d.full}
      className={cn("w-[112px] shrink-0 overflow-hidden rounded-[14px] bg-c-surface text-center text-c-text shadow-[0_14px_30px_-12px_rgb(0_0_0/0.5)]", className)}
      style={{ transform: "rotate(-3deg)" }}
    >
      <span aria-hidden className="block bg-c-primary py-1.5 text-sm font-bold tracking-[0.2em] text-c-on-primary">{d.month}</span>
      <span aria-hidden className="card-display block pt-2 text-[3.6rem] leading-none tabular-nums">{d.day}</span>
      <span aria-hidden className="mx-3 mt-2 block border-t-2 border-dashed border-c-line py-1.5 text-[11px] font-semibold tracking-[0.12em] uppercase">
        {d.weekday}
      </span>
    </div>
  );
}

/** Days / hours / minutes to the event, ticking each minute. */
export function CountdownStrip({ event }: { event: CardEvent }) {
  const L = useLabels();
  const c = useCountdown(event);
  if (!c) return null;

  if (c.state !== "upcoming") {
    return (
      <p className="flex min-h-16 items-center gap-3 border-y-2 border-c-on-bg text-lg font-semibold">
        {c.state === "live" && <span aria-hidden className="size-3 rounded-full bg-c-accent motion-safe:animate-pulse" />}
        {c.state === "live" ? L.started : <span className="text-c-on-bg-muted">{L.ended}</span>}
      </p>
    );
  }

  const cells: [number, string][] = [
    [c.days, L.days],
    [c.hours, L.hoursShort],
    [c.minutes, L.minutes],
  ];
  return (
    <div role="timer" aria-live="off" aria-label={`${c.days} ${L.days}, ${c.hours} ${L.hoursShort}, ${c.minutes} ${L.minutes}`} className="grid grid-cols-3 border-y-2 border-c-on-bg">
      {cells.map(([n, label], i) => (
        <div key={label} className={cn("flex flex-col py-3", i > 0 && "border-l border-c-bg-line pl-4")}>
          <span aria-hidden className="card-display text-[clamp(2.6rem,13cqi,3.6rem)] leading-none tabular-nums">
            {String(n).padStart(2, "0")}
          </span>
          <span aria-hidden className="mt-1 text-xs font-semibold tracking-[0.14em] text-c-on-bg-muted uppercase">
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}
