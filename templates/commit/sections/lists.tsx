"use client";

import { ArrowUpRight, ChevronRight, Mail, Phone, UserPlus } from "lucide-react";
import { useId, useMemo, useState, type ReactNode } from "react";
import { siGithub } from "simple-icons";
import { getPlatform } from "@/lib/social";
import type { SocialLink } from "@/lib/types";
import { phoneDigits } from "@/lib/validate";
import { cn, slugify } from "@/lib/utils";
import { useContactActions } from "@/components/card/actions";
import { BrandIcon } from "@/components/card/brand-icons";
import { useCard } from "@/components/card/context";
import { useLabels } from "@/components/card/labels";
import { CardImage } from "@/components/card/primitives";
import { BreakableEmail, buildTree, Lightbox, OrgChartBlock, type Node } from "@/components/card/sections";
import { Heading } from "./blocks";

/* ----------------------------------------------------------- Projects */

/** The album as project plates: the still, its caption and its tech label. */
export function Projects() {
  const { bundle } = useCard();
  const uid = useId();
  const photos = useMemo(() => {
    const p = bundle.photos.slice();
    const cover = p.findIndex((x) => x.isCover);
    if (cover > 0) p.unshift(...p.splice(cover, 1));
    return p;
  }, [bundle.photos]);
  const [index, setIndex] = useState<number | null>(null);
  if (!photos.length) return null;

  const shown = photos.length <= 6 ? photos : photos.slice(0, 5);
  // An odd count leads with one wide plate so the grid closes evenly.
  const featured = shown.length % 2 === 1;
  const count = `${photos.length} project${photos.length === 1 ? "" : "s"}`;

  return (
    <section aria-labelledby={`${uid}-h`} className="flex flex-col gap-4">
      <Heading tone="background" id={`${uid}-h`} aside={count}>
        Projects
      </Heading>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-5 @4xl:gap-x-5 @4xl:gap-y-7">
        {shown.map((p, i) => {
          const wide = featured && i === 0;
          return (
            <li key={p.id} className={cn(wide && "col-span-2")}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Open project: ${[p.caption || p.alt || `${i + 1}`, p.tag].filter(Boolean).join(", ")}`}
                className="group flex w-full cursor-zoom-in flex-col gap-2.5 rounded-[12px] text-left"
              >
                <span className="block w-full overflow-hidden rounded-[10px] border border-[var(--cm-line)] bg-[var(--cm-cell-0)]" style={{ aspectRatio: "16 / 10" }}>
                  <CardImage
                    src={p.thumbUrl || p.url}
                    alt={p.alt || ""}
                    sizes={wide ? "(min-width: 896px) 680px, 92vw" : "(min-width: 896px) 340px, 46vw"}
                    className="size-full transition-transform duration-500 [transition-timing-function:var(--ease-out-quart)] group-hover:scale-[1.025] motion-reduce:transition-none"
                    failTone="background"
                  />
                </span>
                <span className="flex flex-col gap-1">
                  {p.caption && <span className={cn("font-semibold text-c-on-bg [text-wrap:pretty]", wide ? "text-[16px] leading-snug" : "line-clamp-3 text-[14px] leading-snug")}>{p.caption}</span>}
                  {p.tag && <span className="font-[family-name:var(--c-font-mono)] text-[12px] leading-snug text-[var(--cm-muted)]">{p.tag}</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {shown.length < photos.length && (
        <button type="button" onClick={() => setIndex(0)} className="inline-flex h-11 cursor-pointer items-center gap-1 self-start text-[15px] font-semibold text-c-on-bg underline underline-offset-4">
          See all {count}
        </button>
      )}
      <Lightbox photos={photos} index={index} onIndexChange={setIndex} />
    </section>
  );
}

/* --------------------------------------------------------- Team (tree) */

type Seg = "pipe" | "blank" | "tee" | "elbow";
type Row = { node: Node; segs: Seg[] };

/** Flattens the tree into rows with the box-drawing segments before each name: │ ├─ └─. */
function treeRows(nodes: Node[], lead: Seg[] = []): Row[] {
  return nodes.flatMap((n, i) => {
    const last = i === nodes.length - 1;
    return [{ node: n, segs: [...lead, last ? "elbow" : "tee"] as Seg[] }, ...treeRows(n.children, [...lead, last ? "blank" : "pipe"])];
  });
}

/** One column of the tree, drawn as rules so the lines join across rows of any height: │, ├─ or └─. */
function TreeSeg({ kind }: { kind: Seg }) {
  const rule = "absolute bg-[var(--cm-rule)]";
  return (
    <span aria-hidden className="relative w-[22px] shrink-0 self-stretch">
      {kind !== "blank" && <span className={cn(rule, "left-[6px] w-[1.5px]", kind === "elbow" ? "top-0 h-[18px]" : "inset-y-0")} />}
      {(kind === "tee" || kind === "elbow") && <span className={cn(rule, "top-[17.25px] left-[6px] h-[1.5px] w-[12px]")} />}
    </span>
  );
}

/** The team as a file tree: a folder line, then `├─ Name — Role`, `└─` for the last. */
export function TeamTree() {
  const { bundle } = useCard();
  const L = useLabels();
  const uid = useId();
  const { orgChart, orgMembers } = bundle;
  const rows = useMemo(() => treeRows(buildTree(orgMembers)), [orgMembers]);
  if (!orgChart) return null;
  // An uploaded chart (image or PDF) keeps the shared viewer.
  if (orgChart.mode === "upload") return <OrgChartBlock tone="background" />;
  if (!rows.length) return null;
  const folder = `${slugify(bundle.card.company || "team") || "team"}/`;

  return (
    <section aria-labelledby={`${uid}-h`} className="flex flex-col gap-4">
      <Heading tone="background" id={`${uid}-h`} aside={L.people(orgMembers.length)}>
        {L.team}
      </Heading>
      <div className="flex flex-col text-[15px] leading-[22px]">
        <p aria-hidden className="pb-0.5 font-[family-name:var(--c-font-mono)] text-[14px] font-medium text-c-on-bg">
          {folder}
        </p>
        <ul className="flex flex-col">
          {rows.map(({ node, segs }) => (
            <li key={node.id} className="flex items-stretch">
              {segs.map((k, i) => (
                <TreeSeg key={i} kind={k} />
              ))}
              <span className="min-w-0 py-[7px] pl-0.5 [overflow-wrap:anywhere]">
                <span className="font-semibold text-c-on-bg">{node.name}</span>
                {node.role && (
                  <span className="text-[var(--cm-muted)]">
                    <span aria-hidden> — </span>
                    <span className="sr-only">, </span>
                    {node.role}
                  </span>
                )}
                {node.parentId && <span className="sr-only">, reports to {orgMembers.find((m) => m.id === node.parentId)?.name}</span>}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- Contact */

export function ContactRows() {
  const { bundle } = useCard();
  const { saveContact } = useContactActions();
  const L = useLabels();
  const uid = useId();
  const c = bundle.card;
  const rows = [
    c.email && { key: "email", icon: <Mail aria-hidden className="size-[18px]" strokeWidth={1.75} />, label: L.email, value: <BreakableEmail value={c.email} />, href: `mailto:${c.email}` },
    c.phone && { key: "phone", icon: <Phone aria-hidden className="size-[18px]" strokeWidth={1.75} />, label: L.phone, value: c.phone, href: `tel:${phoneDigits(c.phone)}` },
  ].filter(Boolean) as { key: string; icon: ReactNode; label: string; value: ReactNode; href: string }[];
  const row = "flex min-h-[60px] w-full items-center gap-3.5 py-2 text-left transition-colors hover:bg-[var(--cm-tint)] @4xl:-mx-3 @4xl:w-[calc(100%+1.5rem)] @4xl:rounded-[10px] @4xl:px-3";
  const icon = "flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--cm-tint)] text-c-on-bg";

  return (
    <section aria-labelledby={`${uid}-h`} className="flex flex-col gap-1">
      <Heading tone="background" id={`${uid}-h`}>
        {L.contactDetails}
      </Heading>
      <ul className="flex flex-col divide-y divide-[var(--cm-line)]">
        {rows.map((r) => (
          <li key={r.key}>
            <a href={r.href} className={row}>
              <span className={icon}>{r.icon}</span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-[12.5px] text-[var(--cm-muted)]">{r.label}</span>
                <span className={cn("text-[15px] font-medium text-c-on-bg [overflow-wrap:anywhere]", r.key === "phone" && "tabular-nums")}>{r.value}</span>
              </span>
              <ChevronRight aria-hidden className="size-4 shrink-0 text-[var(--cm-muted)]" />
            </a>
          </li>
        ))}
        <li>
          <button type="button" onClick={saveContact} className={cn(row, "cursor-pointer")}>
            <span className={icon}>
              <UserPlus aria-hidden className="size-[18px]" strokeWidth={1.75} />
            </span>
            <span className="flex-1 text-[15px] font-semibold text-c-on-bg">{L.saveToContacts}</span>
            <ChevronRight aria-hidden className="size-4 shrink-0 text-[var(--cm-muted)]" />
          </button>
        </li>
      </ul>
    </section>
  );
}

/* --------------------------------------------------------------- Links */

/** The socials model has no GitHub platform: a custom or website link labelled GitHub, or on github.com, counts. */
export function isGithub(s: SocialLink): boolean {
  if (/github/i.test(s.label ?? "")) return true;
  try {
    return /(^|\.)github\.com$/i.test(new URL(s.url).hostname);
  } catch {
    return false;
  }
}

function githubHandle(url: string): string | null {
  try {
    const seg = new URL(url).pathname.split("/").filter(Boolean)[0];
    return seg ? `@${seg}` : null;
  } catch {
    return null;
  }
}

function GithubMark({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d={siGithub.path} />
    </svg>
  );
}

/** GitHub first and filled; LinkedIn, the portfolio and the rest as outline buttons. */
export function Links() {
  const { bundle } = useCard();
  const L = useLabels();
  const uid = useId();
  const links = bundle.socials.filter((s) => s.visible);
  if (!links.length) return null;
  const gh = links.find(isGithub);
  const rest = links.filter((s) => s !== gh);
  const nameOf = (s: SocialLink) => s.label?.trim() || (s.platform === "website" ? "Website" : getPlatform(s.platform).label);

  return (
    <section aria-labelledby={`${uid}-h`} className="flex flex-col gap-4">
      <Heading tone="background" id={`${uid}-h`}>
        {L.socialProfiles}
      </Heading>
      <nav aria-labelledby={`${uid}-h`} className="flex flex-col gap-2.5">
        {gh && (
          <a href={gh.url} target="_blank" rel="noreferrer" className="cm-ink cbtn cbtn-primary min-h-[56px] justify-start gap-3 px-4 text-[15px]">
            <GithubMark className="size-[22px] shrink-0" />
            <span className="font-semibold">{nameOf(gh) === "Website" ? "GitHub" : nameOf(gh)}</span>
            {githubHandle(gh.url) && <span className="min-w-0 truncate font-[family-name:var(--c-font-mono)] text-[13px] font-normal">{githubHandle(gh.url)}</span>}
            <ArrowUpRight aria-hidden className="ml-auto size-[18px] shrink-0" strokeWidth={2} />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        )}
        {rest.length > 0 && (
          <div className="grid grid-cols-2 gap-2.5">
            {rest.map((s, i) => (
              <a
                key={s.id}
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className={cn("cbtn cbtn-secondary min-h-[52px] min-w-0 justify-start gap-2.5 px-4 text-[15px]", rest.length % 2 === 1 && i === rest.length - 1 && "col-span-2")}
              >
                <BrandIcon platform={s.platform} className="size-[18px] shrink-0" />
                <span className="truncate">{nameOf(s)}</span>
                <ArrowUpRight aria-hidden className="ml-auto size-4 shrink-0 text-[var(--cm-muted)]" strokeWidth={2} />
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            ))}
          </div>
        )}
      </nav>
    </section>
  );
}
