"use client";

import { useId, useMemo } from "react";
import { useCard } from "@/components/card/context";
import { useLabels } from "@/components/card/labels";
import { buildTree, OrgChartBlock, type Node } from "@/components/card/sections";
import { cn } from "@/lib/utils";
import { NumHeading, Numbered } from "./heading";

/** Distance from a row's top to the middle of its box: where the connector meets it. */
const STUB = 48;

/**
 * The team as a line diagram: each person in a ruled box, reports hanging off
 * the lead on elbow connectors. An uploaded chart uses the shared viewer.
 */
export function TeamDiagram({ n, title }: { n: number; title: string }) {
  const { bundle } = useCard();
  const L = useLabels();
  const uid = useId();
  const { orgChart, orgMembers } = bundle;
  const tree = useMemo(() => buildTree(orgMembers), [orgMembers]);
  if (!orgChart) return null;
  if (orgChart.mode === "upload") {
    return (
      <Numbered n={n}>
        <OrgChartBlock tone="background" title={title} />
      </Numbered>
    );
  }
  if (!orgMembers.length) return null;

  return (
    <section aria-labelledby={`${uid}-h`} className="flex flex-col gap-5">
      <NumHeading n={n} id={`${uid}-h`} aside={L.people(orgMembers.length)}>
        {title}
      </NumHeading>
      <ul className="flex flex-col gap-3">
        {tree.map((node) => (
          <Branch key={node.id} node={node} />
        ))}
      </ul>
    </section>
  );
}

function Branch({ node }: { node: Node }) {
  return (
    <li className="flex flex-col">
      <Box node={node} lead />
      <Reports node={node} depth={1} />
    </li>
  );
}

function Reports({ node, depth }: { node: Node; depth: number }) {
  if (!node.children.length || depth > 6) return null;
  return (
    <ul className="ml-[22px] flex flex-col">
      {node.children.map((c, i) => (
        <SubBranch key={c.id} node={c} last={i === node.children.length - 1} depth={depth} />
      ))}
    </ul>
  );
}

/** A report: elbow connector (the trunk runs to the last report, then turns into each box), then its own reports. */
function SubBranch({ node, last, depth }: { node: Node; last: boolean; depth: number }) {
  return (
    <li className="relative flex flex-col pt-[18px] pl-[26px]">
      <span aria-hidden className="absolute top-0 left-0 w-px bg-[var(--bp-line)]" style={{ height: last ? STUB : "100%" }} />
      <span aria-hidden className="absolute left-0 h-px w-[26px] bg-[var(--bp-line)]" style={{ top: STUB }} />
      <span aria-hidden className="absolute left-[23px] size-[7px] -translate-y-[3px] rounded-full bg-c-accent" style={{ top: STUB }} />
      <Box node={node} lead={false} />
      <Reports node={node} depth={depth + 1} />
    </li>
  );
}

function Box({ node, lead }: { node: Node; lead: boolean }) {
  return (
    <div
      className={cn(
        "flex min-h-[60px] flex-col justify-center gap-1 border-c-on-bg px-3.5 py-2.5",
        lead ? "border-[1.5px] bg-[color:color-mix(in_oklab,var(--c-on-bg)_7%,var(--c-bg))]" : "border bg-c-bg",
      )}
    >
      <span className={cn("leading-tight font-semibold [overflow-wrap:anywhere]", lead ? "text-[17px]" : "text-[15px]")}>{node.name}</span>
      {node.role && <span className="font-[family-name:var(--c-font-mono)] text-[12px] leading-snug tracking-[0.02em] text-[var(--bp-label)] [overflow-wrap:anywhere]">{node.role}</span>}
    </div>
  );
}
