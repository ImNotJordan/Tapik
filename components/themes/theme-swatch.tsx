"use client";

import { Check } from "lucide-react";
import type { ThemeTokens } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * A theme (color preset) as a small card scene: page color, a sheet, the main
 * button and the accent dot. Themes are free, so there is no lock state:
 * only selected (on the card) and previewing (shown with a locked template).
 */
export function ThemeSwatch({
  name,
  tokens,
  selected = false,
  previewing = false,
  onClick,
  className,
}: {
  name: string;
  tokens: ThemeTokens;
  selected?: boolean;
  previewing?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const t = tokens;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      aria-label={`${name} theme${selected ? ", on your card" : ""}${previewing ? ", previewing" : ""}`}
      className={cn(
        "flex min-h-11 w-full cursor-pointer flex-col gap-2 rounded-xl border bg-studio-surface p-2 text-left transition-[border-color,box-shadow,transform] duration-150 ease-out active:translate-y-px",
        selected ? "border-studio-action shadow-[0_0_0_2px_var(--studio-action)]" : "border-studio-line hover:border-studio-line-strong",
        className,
      )}
    >
      <span aria-hidden className="relative flex h-12 overflow-hidden rounded-lg" style={{ background: t.background }}>
        <span className="absolute right-1.5 bottom-1.5 h-5 w-7 rounded" style={{ background: t.surface, boxShadow: `inset 0 0 0 1px ${t.onBackground}1f` }} />
        <span className="absolute bottom-1.5 left-1.5 h-5 w-5 rounded-full" style={{ background: t.primary, boxShadow: `inset 0 0 0 2px ${t.onBackground}26` }} />
        <span className="absolute top-1.5 left-1.5 size-2 rounded-full" style={{ background: t.accent }} />
        {selected && (
          <span className="absolute top-1.5 right-1.5 inline-flex size-5 items-center justify-center rounded-full bg-studio-action text-studio-on-action">
            <Check className="size-3" strokeWidth={3} />
          </span>
        )}
      </span>
      <span aria-hidden className="truncate px-0.5 text-2xs font-semibold">
        {name}
      </span>
    </button>
  );
}
