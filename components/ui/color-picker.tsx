"use client";

import { useId, useState } from "react";
import { isHex } from "@/lib/design/contrast";
import { cn } from "@/lib/utils";

/** Swatch (native color input) + hex field. Invalid hex is held locally until fixed. */
export function ColorPicker({
  label,
  value,
  onChange,
  description,
}: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
  description?: string;
}) {
  const id = useId();
  const [text, setText] = useState(value.toUpperCase());
  // Follow outside changes (theme switch, "Fix text color") without an effect.
  const [seen, setSeen] = useState(value);
  if (value !== seen) {
    setSeen(value);
    setText(value.toUpperCase());
  }
  const invalid = !isHex(text);

  return (
    <div className="flex items-center gap-3">
      <label
        className="relative size-11 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-studio-line-strong"
        style={{ background: isHex(text) ? normalize(text) : value }}
      >
        <span className="sr-only">Pick {label}</span>
        <input
          type="color"
          value={normalize(value)}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
        />
      </label>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <label htmlFor={id} className="text-sm font-semibold text-studio-ink">
          {label}
        </label>
        {description && <span className="text-2xs text-studio-ink-3">{description}</span>}
      </div>
      <input
        id={id}
        value={text}
        spellCheck={false}
        aria-invalid={invalid || undefined}
        aria-label={`${label} hex value`}
        onChange={(e) => {
          const v = e.target.value.trim();
          setText(v);
          if (isHex(v)) onChange(normalize(v));
        }}
        onBlur={() => {
          if (!isHex(text)) setText(value.toUpperCase());
        }}
        className={cn(
          "h-10 w-[6.5rem] rounded-lg border bg-studio-surface px-2.5 font-mono text-sm uppercase tabular-nums text-studio-ink focus:border-studio-action focus:outline-none",
          invalid ? "border-studio-danger" : "border-studio-line-strong",
        )}
      />
    </div>
  );
}

function normalize(hex: string) {
  const h = hex.replace(/^#?/, "#").toUpperCase();
  return h.length === 4 ? `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}` : h;
}
