"use client";

import { AddToCalendarButton, eventDate, useCountdown, useEvent } from "@/components/card/extras";
import { useLabels } from "@/components/card/labels";

/**
 * The next gathering as a bulletin notice: a calendar block (month in small caps,
 * day set large), what and where, and Add to calendar.
 */
export function NextGathering() {
  const e = useEvent();
  const L = useLabels();
  const cd = useCountdown(e);
  if (!e) return null;
  const d = eventDate(e);
  const status =
    cd?.state === "live" ? L.started : cd?.state === "ended" ? L.ended : cd ? (cd.days > 0 ? `In ${cd.days} ${L.days}` : `In ${cd.hours} ${L.hoursShort} ${cd.minutes} ${L.minutes}`) : null;

  return (
    <section aria-label="Next gathering" className="rounded-[4px] border border-c-line bg-c-surface p-5 text-c-text">
      <p className="text-[13px] tracking-[0.08em] text-c-text-muted [font-variant-caps:all-small-caps]">Next gathering</p>
      <div className="mt-3 flex gap-4">
        <div aria-hidden className="flex w-[68px] shrink-0 flex-col items-center border-y-2 border-c-text py-1.5">
          <span className="text-[13px] font-bold tracking-[0.12em]">{d.month}</span>
          <span className="card-display text-[2.6rem] leading-none">{d.day}</span>
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <p className="card-display text-[1.45rem] leading-tight">{e.title}</p>
          <p className="text-[15px] leading-snug">
            {d.weekday}, {d.time}
          </p>
          {e.venue && <p className="text-sm leading-snug text-c-text-muted">{e.venue}</p>}
        </div>
      </div>
      {e.note && <p className="mt-3 text-[15px] italic leading-snug text-c-text-muted">{e.note}</p>}
      <p className="sr-only">{d.full}</p>
      {status && <p className="mt-3 text-sm font-semibold tabular-nums">{status}</p>}
      <AddToCalendarButton className="cbtn-surface mt-4 h-12 w-full px-4 text-[15px]" />
    </section>
  );
}
