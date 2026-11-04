"use client";

import { useId, useMemo, type ReactNode } from "react";
import { displayHandle, getPlatform } from "@/lib/social";
import { phoneDigits } from "@/lib/validate";
import { cn } from "@/lib/utils";
import { useCard } from "@/components/card/context";
import { useLabels } from "@/components/card/labels";
import { AgentPhoto } from "@/components/card/primitives";
import { buildTree, OrgChartBlock, type HeadingProps, type Node } from "@/components/card/sections";

const STOP = new Set(["and", "&", "of", "the", "associates", "law", "offices", "office", "firm", "inc", "inc.", "co", "co.", "corp", "corp.", "company", "llp", "group"]);
const HONORIFIC = /^(atty|dr|engr|arch|hon|mr|mrs|ms|fr|rev)\.?$/i;

/** "Aquino Reyes & Associates Law Offices" → "AR"; "Atty. Gabriel Aquino-Reyes" → "GA". */
export function sealLetters(text: string): string {
  const words = text
    .split(/\s+/)
    .filter((w) => w && !STOP.has(w.toLowerCase()) && !HONORIFIC.test(w))
    .flatMap((w) => w.split("-"));
  return (words[0]?.[0] ?? "?").toUpperCase() + (words[1]?.[0] ?? "").toUpperCase();
}

/** A pressed seal: filled accent disc, an inner ring, italic initials. */
export function Seal({ text, className }: { text: string; className?: string }) {
  return (
    <span aria-hidden className={cn("relative grid size-14 shrink-0 place-items-center rounded-full bg-c-accent text-c-bg", className)}>
      <span className="absolute inset-[3px] rounded-full border border-current opacity-70" />
      <span className="absolute inset-[6px] rounded-full border border-dashed border-current opacity-40" />
      <span className="card-display relative text-[1.3rem] leading-none italic">{sealLetters(text)}</span>
    </span>
  );
}

/**
 * Section label set like a letter's margin note: small capitals over a rule.
 * On desktop it hangs in the left margin beside the section.
 */
export function LetterHeading({ children, aside, id }: HeadingProps) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-t border-c-on-bg pt-3 @4xl:absolute @4xl:top-0 @4xl:-left-[200px] @4xl:w-[160px] @4xl:flex-col @4xl:gap-1 @4xl:border-t-2">
      <h2 id={id} className="text-[12px] font-semibold tracking-[0.18em] text-c-on-bg uppercase">
        {children}
      </h2>
      {aside && <span className="shrink-0 text-[13px] text-c-on-bg-muted">{aside}</span>}
    </div>
  );
}

function Row({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[84px_minmax(0,1fr)] items-baseline gap-4 border-b border-c-bg-line py-2.5">
      <dt className="text-[12px] tracking-[0.16em] text-c-on-bg-muted uppercase">{term}</dt>
      <dd className="min-w-0 text-[16px] text-c-on-bg">{children}</dd>
    </div>
  );
}

const linkCls = "inline-flex min-h-11 items-center underline decoration-c-bg-line underline-offset-4 hover:decoration-current [overflow-wrap:anywhere]";

/** Contacts as a ruled definition list: Mobile / Office / Email / Web / Social. */
export function FolioContacts({ withPhone = true, withLinks = true, title }: { withPhone?: boolean; withLinks?: boolean; title: string }) {
  const { bundle } = useCard();
  const { card } = bundle;
  const L = useLabels();
  const id = useId();
  const links = bundle.socials.filter((s) => s.visible);
  const web = links.filter((s) => s.platform === "website" || s.platform === "custom");
  const social = links.filter((s) => s.platform !== "website" && s.platform !== "custom");
  const rows = [withPhone && card.phone, withPhone && card.address, withPhone && card.email, withLinks && web.length, withLinks && social.length].filter(Boolean);
  if (!rows.length) return null;

  return (
    <section aria-labelledby={`${id}-h`} className="relative flex flex-col gap-3">
      <LetterHeading id={`${id}-h`} tone="background">
        {title}
      </LetterHeading>
      <dl className="flex flex-col">
        {withPhone && card.phone && (
          <Row term={L.mobile}>
            <a href={`tel:${phoneDigits(card.phone)}`} className={cn(linkCls, "tabular-nums")}>
              {card.phone}
            </a>
          </Row>
        )}
        {withPhone && card.address && (
          <Row term={L.office}>
            <span className="block py-2.5 leading-snug">{card.address}</span>
          </Row>
        )}
        {withPhone && card.email && (
          <Row term={L.email}>
            <a href={`mailto:${card.email}`} className={linkCls}>
              {card.email}
            </a>
          </Row>
        )}
        {withLinks && web.length > 0 && (
          <Row term={L.web}>
            <span className="flex flex-col">
              {web.map((s) => (
                <a key={s.id} href={s.url} target="_blank" rel="noreferrer" className={linkCls}>
                  {s.label || displayHandle(s.url)}
                </a>
              ))}
            </span>
          </Row>
        )}
        {withLinks && social.length > 0 && (
          <Row term={L.social}>
            <span className="flex flex-wrap gap-x-4">
              {social.map((s) => (
                <a key={s.id} href={s.url} target="_blank" rel="noreferrer" className={linkCls}>
                  {s.label || getPlatform(s.platform).label}
                </a>
              ))}
            </span>
          </Row>
        )}
      </dl>
    </section>
  );
}

/** Small grayscale photo; without one, the person's initials set like the seal (honorifics skipped). */
export function FolioPortrait({ className }: { className?: string }) {
  const { bundle } = useCard();
  const { card } = bundle;
  if (card.hiddenSections.includes("agentPhoto")) return null;
  if (card.agentPhotoUrl) return <AgentPhoto shape="square" sizes="120px" tone="background" className={cn("shrink-0 grayscale", className)} />;
  return (
    <div role="img" aria-label={card.name} className={cn("grid aspect-square shrink-0 place-items-center bg-c-bg-tint text-c-on-bg", className)}>
      <span aria-hidden className="card-display text-[1.6rem] italic">
        {sealLetters(card.name)}
      </span>
    </div>
  );
}

/** The quote with a small grayscale photo beside it, like a portrait pasted into a letter. */
export function FolioQuote({ title }: { title: string }) {
  const { bundle } = useCard();
  const id = useId();
  const q = bundle.card.quote?.trim();
  if (!q) return null;
  return (
    <section aria-labelledby={`${id}-h`} className="relative flex flex-col gap-4">
      <LetterHeading id={`${id}-h`} tone="background">
        {title}
      </LetterHeading>
      <div className="flex items-start gap-5">
        <FolioPortrait className="w-[84px] @4xl:w-[112px]" />
        <blockquote className="card-display m-0 text-[clamp(1.35rem,6cqi,1.9rem)] leading-[1.25] text-c-on-bg italic [text-wrap:pretty]">
          <p>“{q.replace(/^[“"]|[”"]$/g, "")}”</p>
        </blockquote>
      </div>
    </section>
  );
}

/** Firm members as ruled name–role rows, in reporting order. */
export function FirmMembers() {
  const { bundle } = useCard();
  const L = useLabels();
  const id = useId();
  const rows = useMemo(() => {
    const out: { m: Node; depth: number }[] = [];
    const walk = (ns: Node[], depth: number) => ns.forEach((n) => (out.push({ m: n, depth }), walk(n.children, depth + 1)));
    walk(buildTree(bundle.orgMembers), 0);
    return out;
  }, [bundle.orgMembers]);
  if (bundle.orgChart?.mode === "upload") {
    return (
      <div className="relative [&_h2]:text-[12px]">
        <OrgChartBlock tone="background" />
      </div>
    );
  }
  if (!rows.length) return null;
  return (
    <section aria-labelledby={`${id}-h`} className="relative flex flex-col gap-3">
      <LetterHeading id={`${id}-h`} tone="background" aside={L.people(rows.length)}>
        {L.team}
      </LetterHeading>
      <ul className="flex flex-col">
        {rows.map(({ m, depth }) => (
          <li key={m.id} className="flex min-h-[52px] items-baseline justify-between gap-4 border-b border-c-bg-line py-3">
            <span className={cn("card-display text-[1.2rem] leading-tight", depth === 0 && "italic")}>{m.name}</span>
            <span className="max-w-[48%] shrink-0 text-right text-[14px] leading-snug text-c-on-bg-muted">{m.role}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
