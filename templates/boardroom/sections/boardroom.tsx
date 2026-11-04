"use client";

import { Mail, Phone, UserPlus } from "lucide-react";
import { useId, useMemo, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { MessageIcon, useContactActions } from "@/components/card/actions";
import { useCard } from "@/components/card/context";
import { useLabels } from "@/components/card/labels";
import { buildTree, MemberAvatar, OrgChartBlock, type HeadingProps, type Node } from "@/components/card/sections";

export const MONO = "[font-family:var(--c-font-mono)]";

/** Panel heading: a short bar in the brand color, then the title. */
export function PanelHeading({ children, aside, id }: HeadingProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 id={id} className="flex items-center gap-2.5 text-[17px] font-semibold tracking-[-0.01em] text-c-text">
        <span aria-hidden className="h-4 w-1 shrink-0 rounded-full bg-c-primary" />
        {children}
      </h2>
      {aside && <span className={cn(MONO, "shrink-0 text-[12px] text-c-text-muted")}>{aside}</span>}
    </div>
  );
}

/** Bordered panel on the page ground. One per section. */
export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-xl border border-c-line bg-c-surface p-5 text-c-text @4xl:p-6", className)}>{children}</div>;
}

/** Call / SMS / Email / Save as four equal tiles. Missing ones drop out and the rest share the row. */
export function ActionTiles() {
  const { bundle } = useCard();
  const { card } = bundle;
  const L = useLabels();
  const { call, message, messageLabel, saveContact, channel } = useContactActions();
  const tile = "flex h-[76px] min-w-0 flex-col items-center justify-center gap-1.5 border px-1 text-[13px] font-semibold transition-colors";
  const radius = { borderRadius: "min(var(--c-btn-radius), 14px)" };
  const quiet = "border-c-line bg-c-surface text-c-text hover:bg-c-surface-tint";
  return (
    <div className="grid auto-cols-fr grid-flow-col gap-2">
      {call && (
        <a href={call} className={cn(tile, "border-c-primary bg-c-primary text-c-on-primary")} style={radius}>
          <Phone aria-hidden className="size-5" strokeWidth={2} />
          {L.call}
        </a>
      )}
      {message && (
        <a href={message} target={message.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className={cn(tile, quiet)} style={radius}>
          <MessageIcon className="size-5" />
          <span className="max-w-full truncate">{channel === "sms" ? "SMS" : messageLabel}</span>
        </a>
      )}
      {card.email && (
        <a href={`mailto:${card.email}`} className={cn(tile, quiet)} style={radius}>
          <Mail aria-hidden className="size-5" strokeWidth={2} />
          {L.email}
        </a>
      )}
      <button type="button" onClick={saveContact} className={cn(tile, quiet, "cursor-pointer")} style={radius}>
        <UserPlus aria-hidden className="size-5" strokeWidth={2} />
        {L.save}
      </button>
    </div>
  );
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");

/** Org chart as a tree with connector lines; the card's owner is outlined and tagged. */
export function OrgTree() {
  const { bundle } = useCard();
  const L = useLabels();
  const id = useId();
  const tree = useMemo(() => buildTree(bundle.orgMembers), [bundle.orgMembers]);
  if (bundle.orgChart?.mode === "upload") return <OrgChartBlock tone="surface" />;
  if (!bundle.orgMembers.length) return null;
  const owner = norm(bundle.card.name);

  const node = (n: Node, depth: number): ReactNode => {
    const me = norm(n.name) === owner;
    return (
      <li
        key={n.id}
        className={cn(
          "relative",
          depth > 0 &&
            "pl-6 before:absolute before:-top-2 before:-bottom-2 before:left-0 before:border-l-2 before:border-c-line before:content-[''] after:absolute after:top-[30px] after:left-0 after:w-5 after:border-t-2 after:border-c-line after:content-[''] last:before:bottom-auto last:before:h-[39px]",
        )}
      >
        <div
          aria-current={me ? "true" : undefined}
          className={cn(
            "flex min-h-[60px] items-center gap-3 rounded-lg border px-3 py-2",
            me ? "border-c-primary bg-c-surface-tint shadow-[inset_0_0_0_1px_var(--c-primary)]" : "border-transparent",
          )}
        >
          <MemberAvatar m={n} tone="surface" size="size-10" />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-[15px] leading-snug font-semibold [overflow-wrap:anywhere]">{n.name}</span>
            <span className="text-[13px] leading-snug text-c-text-muted">{n.role}</span>
          </span>
          {me && <span className={cn(MONO, "shrink-0 rounded bg-c-primary px-2 py-1 text-[11px] font-semibold tracking-[0.06em] text-c-on-primary uppercase")}>{L.lang === "fil" ? "Ako" : "You"}</span>}
        </div>
        {n.children.length > 0 && <ul className="mt-2 ml-5 flex flex-col gap-2">{n.children.map((c) => node(c, depth + 1))}</ul>}
      </li>
    );
  };

  return (
    <section aria-labelledby={`${id}-h`} className="flex flex-col gap-4">
      <PanelHeading id={`${id}-h`} tone="surface" aside={L.people(bundle.orgMembers.length)}>
        {L.team}
      </PanelHeading>
      <ul className="flex flex-col gap-2">{tree.map((n) => node(n, 0))}</ul>
    </section>
  );
}
