"use client";

import { Check } from "lucide-react";
import { FONT_PAIRINGS, type FontPairing } from "@/lib/design/fonts";
import { cn } from "@/lib/utils";

/**
 * Curated pairings shown as live specimens, never as a raw font list.
 * The template's own pairing is pinned first; the rest follow under "Other pairings".
 */
export function FontPicker({
  value,
  onChange,
  sampleName,
  pinnedId,
  pinnedLabel = "Made for this template",
}: {
  value: string;
  onChange: (id: string) => void;
  sampleName?: string;
  pinnedId?: string;
  pinnedLabel?: string;
}) {
  const pinned = FONT_PAIRINGS.find((f) => f.id === pinnedId);
  const rest = FONT_PAIRINGS.filter((f) => f.id !== pinnedId);
  const name = (f: FontPairing) => sampleName?.trim().split(/\s+/).slice(-1)[0] || f.sample;

  const option = (f: FontPairing) => {
    const active = f.id === value;
    return (
      <button
        key={f.id}
        type="button"
        role="radio"
        aria-checked={active}
        onClick={() => onChange(f.id)}
        className={cn(
          "group flex cursor-pointer items-center gap-4 rounded-xl border p-4 text-left transition-colors duration-150",
          active ? "border-studio-action bg-studio-action-soft/60 shadow-[inset_0_0_0_1px_var(--studio-action)]" : "border-studio-line bg-studio-surface hover:border-studio-line-strong",
        )}
      >
        <span
          aria-hidden
          className="w-[42%] shrink-0 truncate text-[28px] leading-none text-studio-ink"
          style={{ fontFamily: f.display, fontWeight: f.displayWeight, letterSpacing: f.displayTracking }}
        >
          {name(f)}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex items-center gap-2 text-sm font-semibold text-studio-ink">
            {f.name}
            {active && <Check aria-hidden className="size-4 text-studio-action" />}
          </span>
          <span className="text-2xs text-studio-ink-3" style={{ fontFamily: f.body }}>
            {f.note}
          </span>
        </span>
      </button>
    );
  };

  return (
    <div role="radiogroup" aria-label="Font pairing" className="flex flex-col gap-2">
      {pinned && (
        <>
          <p className="text-2xs font-semibold text-studio-ink-3">{pinnedLabel}</p>
          {option(pinned)}
          <p className="pt-2 text-2xs font-semibold text-studio-ink-3">Other pairings</p>
        </>
      )}
      <div className="grid gap-2">{rest.map(option)}</div>
    </div>
  );
}
