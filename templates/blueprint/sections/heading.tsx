"use client";

import type { ReactNode } from "react";
import { SectionStyle, type HeadingProps } from "@/components/card/sections";

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * "01 / BRIEF": the sheet's numbered heading, ruled underneath like a
 * dimension line with a tick at each end. The number follows the visible
 * order, so hiding or moving a section keeps the count right.
 */
export function NumHeading({ n, children, aside, id }: Omit<HeadingProps, "tone"> & { n: number }) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id={id} className="flex min-w-0 items-baseline gap-2 font-[family-name:var(--c-font-mono)] text-[13px] leading-none font-semibold tracking-[0.14em] text-c-on-bg uppercase">
          <span aria-hidden className="size-[7px] shrink-0 -translate-y-px self-center bg-c-accent" />
          <span className="tabular-nums">{pad(n)}</span>
          <span aria-hidden className="text-[var(--bp-label)]">
            /
          </span>
          <span className="min-w-0">{children}</span>
        </h2>
        {aside && <span className="shrink-0 font-[family-name:var(--c-font-mono)] text-[12px] leading-none tracking-[0.08em] text-[var(--bp-label)] uppercase tabular-nums">{aside}</span>}
      </div>
      <span aria-hidden className="relative block h-px bg-[var(--bp-line)]">
        <span className="absolute -top-[4px] left-0 h-[9px] w-px bg-[var(--bp-line)]" />
        <span className="absolute -top-[4px] right-0 h-[9px] w-px bg-[var(--bp-line)]" />
      </span>
    </div>
  );
}

/** Gives the shared blocks (About, an uploaded org chart) the numbered heading, optionally renamed ("Brief"). */
export function Numbered({ n, title, children }: { n: number; title?: string; children: ReactNode }) {
  return (
    <SectionStyle.Provider value={{ renderHeading: ({ children: label, aside, id }) => <NumHeading n={n} aside={aside} id={id}>{title ?? label}</NumHeading> }}>
      {children}
    </SectionStyle.Provider>
  );
}
