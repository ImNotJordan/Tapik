"use client";

import { CalendarPlus } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { MESSAGE_LABEL, generateCalendarFile, messageHref } from "@/lib/services/card-utils";
import type { CardEvent, OpeningHours, StatusChip } from "@/lib/types";
import { phoneDigits } from "@/lib/validate";
import { cn } from "@/lib/utils";
import { useCard } from "./context";
import { useLabels, type CardLabels } from "./labels";
import type { Tone } from "./sections";
import { T } from "./sections";

/*
 * Template-specific details (hours, services, service areas, event).
 * Stored on every card; only templates whose manifest supports them render them.
 */

/** "18:30" → "6:30 PM" */
export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m ? `${h12}:${String(m).padStart(2, "0")} ${suffix}` : `${h12} ${suffix}`;
}

/** Days with the same hours collapsed: "Tue–Sun · 6 AM–8 PM". */
export function groupHours(hours: OpeningHours[], L: CardLabels): { days: string; time: string; closed: boolean; includes: number[] }[] {
  const sorted = [...hours].sort((a, b) => ((a.day + 6) % 7) - ((b.day + 6) % 7));
  const groups: { from: number; to: number; key: string; h: OpeningHours; includes: number[] }[] = [];
  sorted.forEach((h) => {
    const key = h.closed ? "closed" : `${h.open}-${h.close}`;
    const last = groups[groups.length - 1];
    if (last && last.key === key && (last.to + 1) % 7 === h.day) {
      last.to = h.day;
      last.includes.push(h.day);
    } else groups.push({ from: h.day, to: h.day, key, h, includes: [h.day] });
  });
  return groups.map((g) => ({
    days: g.from === g.to ? L.dayShort[g.from] : `${L.dayShort[g.from]}–${L.dayShort[g.to]}`,
    time: g.h.closed ? L.closed : `${formatTime(g.h.open)}–${formatTime(g.h.close)}`,
    closed: !!g.h.closed,
    includes: g.includes,
  }));
}

/* Manila time without hydration mismatches: the server renders no status, the client fills it in. */
const noop = () => () => {};
function useMounted() {
  return useSyncExternalStore(noop, () => true, () => false);
}

function manilaNow(): { day: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Manila", weekday: "short", hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { day, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

export type OpenStatus = { open: boolean; label: string; today?: OpeningHours };

/** Open/closed right now in Manila, with a short label. Null until mounted or with no hours. */
export function useOpenStatus(): OpenStatus | null {
  const { bundle, mode } = useCard();
  const L = useLabels();
  const mounted = useMounted();
  const hours = bundle.card.hours;
  if (!hours?.length) return null;
  // Thumbnails and SSR show a stable status so previews don't flicker.
  const now = mounted && mode !== "thumbnail" ? manilaNow() : { day: 2, minutes: 10 * 60 };
  const today = hours.find((h) => h.day === now.day);
  if (today && !today.closed && now.minutes >= toMin(today.open) && now.minutes < toMin(today.close)) {
    return { open: true, label: `${L.openNow} · ${L.until(formatTime(today.close))}`, today };
  }
  for (let i = 0; i < 7; i++) {
    const day = (now.day + i) % 7;
    const h = hours.find((x) => x.day === day && !x.closed);
    if (!h) continue;
    if (i === 0 && now.minutes >= toMin(h.open)) continue;
    const when = i === 0 ? formatTime(h.open) : `${L.dayShort[day]} ${formatTime(h.open)}`;
    return { open: false, label: `${L.closedNow} · ${L.opens(when)}`, today };
  }
  return { open: false, label: L.closedNow, today };
}

/** Dot + status text. The dot carries the accent; the words carry the meaning. */
export function OpenBadge({ tone, className }: { tone: Tone; className?: string }) {
  const status = useOpenStatus();
  if (!status) return null;
  return (
    <p className={cn("inline-flex items-center gap-2 text-[15px] font-semibold", T[tone].text, className)}>
      <span aria-hidden className={cn("size-2.5 shrink-0 rounded-full", status.open ? "bg-c-accent" : cn("border-2", tone === "surface" ? "border-c-text" : "border-c-on-bg"))} />
      {status.label}
    </p>
  );
}

/** Hours as a table with today marked. */
export function HoursTable({ tone, className, title, grouped = true }: { tone: Tone; className?: string; title?: string; grouped?: boolean }) {
  const { bundle } = useCard();
  const L = useLabels();
  const status = useOpenStatus();
  const hours = bundle.card.hours;
  if (!hours?.length) return null;
  const todayDay = status?.today?.day;
  const rows = grouped
    ? groupHours(hours, L)
    : [...hours]
        .sort((a, b) => ((a.day + 6) % 7) - ((b.day + 6) % 7))
        .map((h) => ({ days: L.dayNames[h.day], time: h.closed ? L.closed : `${formatTime(h.open)}–${formatTime(h.close)}`, closed: !!h.closed, includes: [h.day] }));
  return (
    <table className={cn("w-full border-collapse text-[15px]", className)}>
      {title && <caption className="sr-only">{title}</caption>}
      <tbody>
        {rows.map((r) => {
          const isToday = todayDay !== undefined && r.includes.includes(todayDay);
          return (
            <tr key={r.days} className={cn("border-b", T[tone].line)}>
              <th scope="row" className={cn("py-3 pr-4 text-left font-medium", T[tone].text)}>
                {r.days}
                {isToday && <span className={cn("ml-2 text-sm font-normal", T[tone].muted)}>({L.today})</span>}
              </th>
              <td className={cn("py-3 text-right tabular-nums", r.closed ? T[tone].muted : T[tone].text, isToday && "font-semibold")}>{r.time}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function useServices(): string[] {
  const { bundle } = useCard();
  return (bundle.card.services ?? []).map((s) => s.trim()).filter(Boolean);
}

export function useServiceAreas(): string[] {
  const { bundle } = useCard();
  return (bundle.card.serviceAreas ?? []).map((s) => s.trim()).filter(Boolean);
}

/** Services as chips. Plain text in a list: chips are not buttons. */
export function ServiceChips({ tone, className, chipClassName }: { tone: Tone; className?: string; chipClassName?: string }) {
  const services = useServices();
  const L = useLabels();
  if (!services.length) return null;
  return (
    <ul aria-label={L.services} className={cn("flex flex-wrap gap-2", className)}>
      {services.map((s) => (
        <li key={s} className={cn("inline-flex min-h-9 items-center rounded-full border px-3.5 text-sm font-medium", T[tone].line, T[tone].text, chipClassName)}>
          {s}
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------- Event */

export function useEvent(): CardEvent | null {
  const { bundle } = useCard();
  const e = bundle.card.event;
  return e?.title?.trim() && e.startsAt ? e : null;
}

export type Countdown = { days: number; hours: number; minutes: number; state: "upcoming" | "live" | "ended" };

function countdownTo(e: CardEvent, now: number): Countdown {
  const start = new Date(e.startsAt).getTime();
  const end = e.endsAt ? new Date(e.endsAt).getTime() : start + 4 * 3600_000;
  if (now >= end) return { days: 0, hours: 0, minutes: 0, state: "ended" };
  if (now >= start) return { days: 0, hours: 0, minutes: 0, state: "live" };
  const diff = Math.floor((start - now) / 60_000);
  return { days: Math.floor(diff / 1440), hours: Math.floor((diff % 1440) / 60), minutes: diff % 60, state: "upcoming" };
}

/**
 * Live countdown, ticking each minute. Before mount (SSR) and in thumbnails it
 * counts from a fixed moment so markup is stable.
 */
export function useCountdown(e: CardEvent | null): Countdown | null {
  const { mode } = useCard();
  const mounted = useMounted();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (mode === "thumbnail") return;
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [mode]);
  if (!e) return null;
  const fixed = new Date(e.startsAt).getTime() - (12 * 1440 + 5 * 60 + 42) * 60_000;
  return countdownTo(e, mounted && mode !== "thumbnail" ? now : fixed);
}

/** Date parts in Manila time for calendar blocks. */
export function eventDate(e: CardEvent) {
  const d = new Date(e.startsAt);
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", ...o }).format(d);
  return {
    day: f({ day: "numeric" }),
    month: f({ month: "short" }).toUpperCase(),
    weekday: f({ weekday: "long" }),
    time: f({ hour: "numeric", minute: "2-digit" }).replace(":00", "").toUpperCase(),
    full: f({ weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" }),
  };
}

export function AddToCalendarButton({ className, children }: { className?: string; children?: React.ReactNode }) {
  const { bundle, url } = useCard();
  const L = useLabels();
  const e = useEvent();
  if (!e) return null;
  return (
    <button
      type="button"
      onClick={() => {
        const ics = generateCalendarFile(e, bundle.card, url);
        const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${bundle.card.slug}-event.ics`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      }}
      className={cn("cbtn cursor-pointer", className)}
    >
      <CalendarPlus aria-hidden className="size-5" strokeWidth={2} />
      {children ?? L.addToCalendar}
    </button>
  );
}

/** Booking link if the card has one; otherwise Book falls back to the message channel, then Call. */
export function useBookingHref(): string | null {
  const { bundle } = useCard();
  const c = bundle.card;
  if (c.bookingUrl?.trim()) return c.bookingUrl.trim();
  return null;
}

/* ------------------------------------------------- Main button (K–Q) */

/**
 * The template's main call to action. The card's own button (bookingUrl +
 * bookingLabel + bookingNote, edited as "Main button") when it has a link;
 * otherwise it falls back to Message, then Call. Null when there's nothing to do.
 */
export type PrimaryCta = { kind: "link" | "message" | "call"; href: string; label: string; sub?: string; external: boolean };

export function usePrimaryCta(defaultLabel: string): PrimaryCta | null {
  const { bundle } = useCard();
  const L = useLabels();
  const c = bundle.card;
  const label = c.bookingLabel?.trim() || defaultLabel;
  const sub = c.bookingNote?.trim() || undefined;
  if (c.bookingUrl?.trim()) return { kind: "link", href: c.bookingUrl.trim(), label, sub, external: true };
  const message = messageHref(c);
  if (message) return { kind: "message", href: message, label: c.bookingLabel?.trim() || L.messageOn(MESSAGE_LABEL[c.messageChannel]), sub, external: !message.startsWith("sms:") };
  if (c.phone) return { kind: "call", href: `tel:${phoneDigits(c.phone)}`, label: L.call, sub, external: false };
  return null;
}

/* ------------------------------------------------ Status chip (K, Q) */

/** The card's status pill, or the template's default. An empty label hides it. */
export function useStatusChip(defaultLabel: string): StatusChip | null {
  const { bundle } = useCard();
  const s = bundle.card.statusChip;
  if (!s) return { label: defaultLabel, tone: "live" };
  return s.label.trim() ? s : null;
}

/* ------------------------------------------ Event clock with seconds */

export type EventClock =
  | { state: "upcoming"; days: number; hours: number; minutes: number; seconds: number }
  | { state: "live" | "after" };

/**
 * Countdown to event.startsAt to the second. "live" from the start for 24 hours
 * (or until endsAt), then "after". Ticks once a second while the tab is
 * visible and pauses when it's hidden. SSR and thumbnails count from a fixed
 * moment so the markup is stable.
 */
export function useEventClock(e: CardEvent | null): EventClock | null {
  const { mode } = useCard();
  const mounted = useMounted();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (mode === "thumbnail" || !e) return;
    let id: ReturnType<typeof setInterval> | undefined;
    const start = () => {
      clearInterval(id);
      setNow(Date.now());
      id = setInterval(() => setNow(Date.now()), 1000);
    };
    const onVis = () => (document.hidden ? clearInterval(id) : start());
    start();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [mode, e]);
  if (!e) return null;
  const startAt = new Date(e.startsAt).getTime();
  const t = mounted && mode !== "thumbnail" ? now : startAt - ((12 * 24 + 5) * 3600 + 42 * 60 + 17) * 1000;
  const endAt = e.endsAt ? new Date(e.endsAt).getTime() : startAt + 24 * 3600_000;
  if (t >= endAt) return { state: "after" };
  if (t >= startAt) return { state: "live" };
  const s = Math.floor((startAt - t) / 1000);
  return { state: "upcoming", days: Math.floor(s / 86400), hours: Math.floor((s % 86400) / 3600), minutes: Math.floor((s % 3600) / 60), seconds: s % 60 };
}
