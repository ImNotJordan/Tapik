"use client";

import { useMemo, type ReactNode } from "react";
import { useCard } from "@/components/card/context";
import { useLabels } from "@/components/card/labels";
import { buildTree, OrgChartBlock, SectionHeading, type Node } from "@/components/card/sections";

/** The team as a quiet indented list: name and role, no avatars. Uploaded charts use the shared block. */
export function TeamList() {
  const { bundle } = useCard();
  const L = useLabels();
  const tree = useMemo(() => buildTree(bundle.orgMembers), [bundle.orgMembers]);
  const { orgChart, orgMembers } = bundle;
  if (!orgChart) return null;
  if (orgChart.mode === "upload") return <OrgChartBlock tone="background" />;
  if (!orgMembers.length) return null;

  const row = (n: Node, depth: number): ReactNode => (
    <li key={n.id}>
      <div className="flex min-h-14 flex-col justify-center border-b border-c-bg-line py-2.5">
        <span className={depth === 0 ? "text-[17px] font-semibold text-c-on-bg" : "text-base font-medium text-c-on-bg"}>{n.name}</span>
        <span className="text-sm text-c-on-bg-muted">{n.role}</span>
      </div>
      {n.children.length > 0 && <ul className="ml-1 border-l-2 border-c-accent pl-5">{n.children.map((c) => row(c, depth + 1))}</ul>}
    </li>
  );

  return (
    <section aria-label={L.team} className="flex flex-col gap-3">
      <SectionHeading tone="background" aside={L.people(orgMembers.length)}>
        {L.team}
      </SectionHeading>
      <ul className="border-t border-c-bg-line">{tree.map((n) => row(n, 0))}</ul>
    </section>
  );
}
