import { BRAND_ORIGIN } from "@/lib/brand";

export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

export function uid(prefix = "id"): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${rand}`;
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Titles that shouldn't become a monogram letter ("Atty. Gabriel Aquino-Reyes" → "GA"). */
const HONORIFICS = /^(atty|dr|dra|engr|arch|fr|rev|sr|sis|hon|mr|mrs|ms|prof|gen|capt|col|ptr|pastor|bro)\.?$/i;

export function initials(name: string): string {
  // Placeholder names like "[Executive Name]" give "EN", not "[N".
  const all = name.trim().split(/\s+/).map((p) => p.replace(/^[^\p{L}\p{N}]+/u, "")).filter(Boolean);
  const parts = all.length > 1 ? all.filter((p, i) => !(i === 0 && HONORIFICS.test(p))) : all;
  if (parts.length === 0) return "?";
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

/** How an email greets someone: "Carmela", or "Dr. Salonga" when the name starts with a title. */
export function greetingName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "there";
  if (parts.length > 1 && HONORIFICS.test(parts[0])) return `${parts[0]} ${parts[parts.length - 1]}`;
  return parts[0];
}

const DATE_FMT = new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric" });
const TIME_FMT = new Intl.DateTimeFormat("en-PH", { hour: "numeric", minute: "2-digit" });

export function formatDate(iso: string | undefined): string {
  if (!iso) return "";
  return DATE_FMT.format(new Date(iso));
}

/** "just now", "5 min ago", "3 hours ago", "Oct 28, 2026". */
export function formatRelative(iso: string | undefined, now = Date.now()): string {
  if (!iso) return "";
  const diff = Math.round((now - new Date(iso).getTime()) / 1000);
  if (diff < 45) return "just now";
  if (diff < 3600) return `${Math.round(diff / 60)} min ago`;
  if (diff < 86400) {
    const h = Math.round(diff / 3600);
    return `${h} hour${h === 1 ? "" : "s"} ago`;
  }
  if (diff < 86400 * 2) return `yesterday, ${TIME_FMT.format(new Date(iso))}`;
  return formatDate(iso);
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function moveItem<T>(list: T[], from: number, to: number): T[] {
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function publicCardPath(slug: string): string {
  return `/c/${slug}`;
}

/** Absolute URL for sharing; falls back to a production-like host on the server. */
export function publicCardUrl(slug: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : BRAND_ORIGIN;
  return `${origin}${publicCardPath(slug)}`;
}
