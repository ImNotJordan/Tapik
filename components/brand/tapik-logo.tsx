import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

type Size = "sm" | "md" | "lg";

const TEXT: Record<Size, string> = {
  sm: "text-sm gap-1",
  md: "text-[17px] gap-1.5",
  lg: "text-[26px] gap-2",
};

/**
 * Temporary text wordmark until a real logo exists: "Tapik" in the studio's
 * heading face with a small tap wave after it. Colour is currentColor, so it
 * works on light and dark surfaces. `app="admin"` reads "Tapik Studio".
 * Sizes: sm (footers), md (headers), lg (sign-in, invite landing).
 */
export function TapikLogo({ size = "md", app = "client", href, className }: { size?: Size; app?: "admin" | "client"; href?: string; className?: string }) {
  const suffix = app === "admin" ? BRAND.adminAppName.replace(BRAND.name, "").trim() : "";
  const mark = (
    <span className={cn("inline-flex items-center leading-none font-semibold tracking-[-0.025em] whitespace-nowrap [font-family:var(--font-atkinson),system-ui,sans-serif]", TEXT[size])}>
      <span>
        {BRAND.name}
        {suffix && <span className="font-normal tracking-[-0.01em]"> {suffix}</span>}
      </span>
      <TapWave />
    </span>
  );
  if (!href) return <span className={cn("inline-flex", className)}>{mark}</span>;
  return (
    <Link href={href} className={cn("inline-flex rounded-md py-1 text-current", className)}>
      {mark}
    </Link>
  );
}

/** Two short arcs: the ripple of a tap. Decorative; the name carries the meaning. */
function TapWave() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 16 20" className="h-[0.9em] w-auto shrink-0 -translate-y-[0.04em]" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round">
      <path d="M3.5 6a7 7 0 0 1 0 8" />
      <path d="M9.5 2.75a12.5 12.5 0 0 1 0 14.5" />
    </svg>
  );
}
