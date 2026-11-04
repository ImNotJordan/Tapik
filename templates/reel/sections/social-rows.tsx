"use client";

import { ArrowUpRight } from "lucide-react";
import { useId } from "react";
import { getPlatform, displayHandle } from "@/lib/social";
import { useCard } from "@/components/card/context";
import { useLabels } from "@/components/card/labels";
import { SectionHeading } from "@/components/card/sections";

/** Socials as huge type rows, poster-style, each with a ↗ arrow and the handle in mono. */
export function SocialRows() {
  const { bundle } = useCard();
  const L = useLabels();
  const uid = useId();
  const links = bundle.socials.filter((s) => s.visible);
  if (!links.length) return null;
  return (
    <section aria-labelledby={`${uid}-h`} className="flex flex-col gap-2">
      <SectionHeading tone="background" id={`${uid}-h`}>
        {L.lang === "en" ? "Follow" : L.socialProfiles}
      </SectionHeading>
      <ul className="flex flex-col">
        {links.map((s) => (
          <li key={s.id}>
            <a
              href={s.url}
              target="_blank"
              rel="noreferrer"
              className="group flex min-h-[76px] items-center justify-between gap-4 border-b border-c-bg-line py-3 text-c-on-bg"
            >
              <span className="flex min-w-0 flex-col">
                <span className="card-display truncate text-[clamp(2.4rem,13cqi,4.25rem)] leading-[0.95] uppercase transition-colors group-hover:text-c-accent">
                  {s.label || getPlatform(s.platform).label}
                </span>
                <span className="truncate text-[12px] tracking-[0.04em] text-c-on-bg-muted [font-family:var(--c-font-mono)]">{displayHandle(s.url)}</span>
              </span>
              <ArrowUpRight aria-hidden className="size-9 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={1.75} />
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
