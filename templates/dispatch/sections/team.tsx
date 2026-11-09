"use client";

import { useId, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useCard } from "@/components/card/context";
import { useLabels } from "@/components/card/labels";
import { buildTree, OrgChartBlock, SectionHeading, type Node } from "@/components/card/sections";

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

/**
 * The team as an indented ruled list, like a dispatch board: each level steps
 * in, and the card's owner is picked out in the signal color. An uploaded
 * chart (image or PDF) uses the shared block.
 */
export function TeamBoard() {
  const { bundle } = useCard();
  const L = useLabels();
  const uid = useId();
  const { orgChart, orgMembers, card } = bundle;

  const rows = useMemo(() => {
    const out: { n: Node; depth: number; parent?: Node }[] = [];
    const walk = (ns: Node[], depth: number, parent?: Node) =>
      ns.forEach((n) => {
        out.push({ n, depth, parent });
        walk(n.children, depth + 1, n);
      });
    walk(buildTree(orgMembers), 0);
    return out;
  }, [orgMembers]);

  if (!orgChart) return null;
  if (orgChart.mode === "upload") return <OrgChartBlock tone="background" />;
  if (!rows.length) return null;

  const self = norm(card.name);

  return (
    <section aria-labelledby={`${uid}-h`} className="flex flex-col gap-4">
      <SectionHeading tone="background" id={`${uid}-h`} aside={L.people(orgMembers.length)}>
        {L.team}
      </SectionHeading>
      <ul className="flex flex-col border-t border-[var(--dp-line)]">
        {rows.map(({ n, depth, parent }) => {
          const owner = norm(n.name) === self;
          return (
            <li
              key={n.id}
              className="relative flex min-h-[60px] items-center border-b border-[var(--dp-line)] py-2.5"
              style={{ paddingLeft: `${Math.min(depth, 4) * 22}px` }}
            >
              {owner && <span aria-hidden className="absolute top-0 bottom-0 -left-5 w-1 bg-c-accent @4xl:-left-4" />}
              {depth > 0 && <span aria-hidden className="mr-3 h-0.5 w-3 shrink-0 bg-[var(--dp-line-strong)]" />}
              <span className="flex min-w-0 flex-1 flex-col">
                <span
                  className={cn(
                    "card-display text-[1.25rem] leading-tight uppercase [overflow-wrap:anywhere]",
                    owner ? "text-c-accent" : "text-c-on-bg",
                  )}
                >
                  {n.name}
                  {owner && <span className="sr-only"> (this card)</span>}
                </span>
                <span className="text-[15px] leading-snug text-[var(--dp-muted)]">
                  {n.role}
                  {parent && <span className="sr-only">, reports to {parent.name}</span>}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
