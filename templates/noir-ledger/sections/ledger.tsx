"use client";

import { ArrowRight, ArrowUpRight } from "lucide-react";
import { useId, useMemo, type ReactNode } from "react";
import { getPlatform } from "@/lib/social";
import { cn } from "@/lib/utils";
import { useContactActions } from "@/components/card/actions";
import { useCard } from "@/components/card/context";
import { useLabels } from "@/components/card/labels";
import { buildTree, OrgChartBlock, type HeadingProps, type Node } from "@/components/card/sections";

const MONO = "[font-family:var(--c-font-mono)]";

/** "01 — ABOUT": a ledger entry number in the accent, the title in mono capitals, a full-width rule above. */
export function LedgerHeading({ n, children, aside, id }: HeadingProps & { n: number }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-t border-c-on-bg pt-3">
      <h2 id={id} className={cn(MONO, "text-[12px] tracking-[0.16em] text-c-on-bg uppercase")}>
        <span className="text-c-accent tabular-nums">{String(n).padStart(2, "0")}</span>
        <span aria-hidden> — </span>
        <span className="sr-only"> </span>
        {children}
      </h2>
      {aside && <span className={cn(MONO, "shrink-0 text-[12px] text-c-on-bg-muted uppercase")}>{aside}</span>}
    </div>
  );
}

function LedgerRow({ label, value, href, onClick, external }: { label: string; value?: string; href?: string; onClick?: () => void; external?: boolean }) {
  const cls = "group flex min-h-[64px] w-full cursor-pointer items-center gap-3 border-b border-c-bg-line py-3 text-left text-c-on-bg";
  const body = (
    <>
      <span className="card-display shrink-0 text-[1.5rem] leading-none">{label}</span>
      <span aria-hidden className="mb-1 min-w-5 flex-1 self-end border-b-2 border-dotted border-c-bg-line" />
      {value && <span className={cn(MONO, "max-w-[52%] truncate text-[13px] text-c-on-bg-muted")}>{value}</span>}
      <ArrowRight aria-hidden className="size-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={1.75} />
    </>
  );
  return href ? (
    <a href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined} className={cls}>
      {body}
    </a>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {body}
    </button>
  );
}

/** Call ……… number →, one full-width ruled row per action. */
export function LedgerActions() {
  const { bundle } = useCard();
  const { card } = bundle;
  const L = useLabels();
  const { call, message, messageLabel, saveContact, channel } = useContactActions();
  const msgName = channel === "sms" ? "SMS" : messageLabel;
  return (
    <nav aria-label={L.contactDetails} className="flex flex-col border-t border-c-bg-line">
      {call && card.phone && <LedgerRow label={L.call} value={card.phone} href={call} />}
      {message && <LedgerRow label={msgName} value={channel === "messenger" ? card.messageTarget : card.messageTarget || card.phone} href={message} external={message.startsWith("http")} />}
      {card.email && <LedgerRow label={L.email} value={card.email} href={`mailto:${card.email}`} />}
      <LedgerRow label={L.save} value=".vcf" onClick={saveContact} />
    </nav>
  );
}

/** Team as an indented ruled list: name in the serif, role in mono. Upload-mode charts use the shared viewer. */
export function LedgerTeam({ n }: { n: number }) {
  const { bundle } = useCard();
  const L = useLabels();
  const id = useId();
  const tree = useMemo(() => buildTree(bundle.orgMembers), [bundle.orgMembers]);
  if (bundle.orgChart?.mode === "upload") return <OrgChartBlock tone="background" />;
  if (!bundle.orgMembers.length) return null;

  const row = (m: Node, depth: number): ReactNode => (
    <li key={m.id}>
      <div className="flex min-h-[56px] items-baseline justify-between gap-4 border-b border-c-bg-line py-3" style={{ paddingLeft: depth * 22 }}>
        <span className="flex min-w-0 items-baseline gap-2.5">
          {depth > 0 && (
            <span aria-hidden className="text-c-on-bg-muted">
              —
            </span>
          )}
          <span className={cn("card-display leading-tight", depth === 0 ? "text-[1.45rem]" : "text-[1.25rem]")}>{m.name}</span>
        </span>
        <span className={cn(MONO, "max-w-[46%] shrink-0 text-right text-[11.5px] leading-snug tracking-[0.06em] text-c-on-bg-muted uppercase")}>{m.role}</span>
      </div>
      {m.children.length > 0 && <ul>{m.children.map((c) => row(c, depth + 1))}</ul>}
    </li>
  );

  return (
    <section aria-labelledby={`${id}-h`} className="flex flex-col gap-2">
      <LedgerHeading n={n} id={`${id}-h`} tone="background" aside={L.people(bundle.orgMembers.length)}>
        {L.team}
      </LedgerHeading>
      <ul>{tree.map((m) => row(m, 0))}</ul>
    </section>
  );
}

/** Socials as big serif text links with ↗, one ruled row each. */
export function LedgerSocials({ n }: { n: number }) {
  const { bundle } = useCard();
  const L = useLabels();
  const id = useId();
  const links = bundle.socials.filter((s) => s.visible);
  if (!links.length) return null;
  return (
    <section aria-labelledby={`${id}-h`} className="flex flex-col gap-2">
      <LedgerHeading n={n} id={`${id}-h`} tone="background">
        {L.socialProfiles}
      </LedgerHeading>
      <ul>
        {links.map((s) => (
          <li key={s.id}>
            <a href={s.url} target="_blank" rel="noreferrer" className="group flex min-h-[56px] items-center justify-between gap-4 border-b border-c-bg-line py-2 text-c-on-bg">
              <span className="card-display text-[1.6rem] leading-none underline decoration-c-bg-line decoration-1 underline-offset-[6px] group-hover:decoration-current">
                {s.label || getPlatform(s.platform).label}
              </span>
              <ArrowUpRight aria-hidden className="size-5 shrink-0" strokeWidth={1.5} />
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
