"use client";

import { useEffect, useId, useMemo, useState, type CSSProperties } from "react";
import { ACTIVITY_WEEKS, getGithubActivity, sampleActivity, type Activity } from "@/lib/services/github-activity";
import { cn } from "@/lib/utils";
import { useCard } from "@/components/card/context";
import { visibleSections } from "@/lib/design/sections";
import type { HeadingProps } from "@/components/card/sections";

/* ------------------------------------------------------------ Helpers */

/** "Unit 5B, Ecoland Drive, Matina, Davao City, 8000 Davao del Sur" → "Davao City". */
export function cityOf(address?: string): string | null {
  const parts = (address ?? "")
    .split(",")
    .map((p) => p.replace(/\b\d{4}\b/g, "").trim())
    .filter(Boolean);
  if (!parts.length) return null;
  const named = parts.find((p) => /\bcity\b/i.test(p));
  if (named) return named;
  if (parts.length >= 2) return parts[parts.length - 2];
  return parts[0].length <= 28 ? parts[0] : null;
}

/** Stack row values split into items: "Next.js · React, Tailwind" → ["Next.js", "React", "Tailwind"]. */
export function stackItems(value: string): string[] {
  return value
    .split(/\s*(?:·|,|\/|\||•)\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function useStackRows() {
  const { bundle } = useCard();
  return (bundle.card.stackRows ?? []).map((r) => ({ label: r.label.trim(), value: r.value.trim() })).filter((r) => r.label || r.value);
}

/* ------------------------------------------------------------ Heading */

/** README-style section heading: bold, with the rule GitHub draws under an h2. */
export function Heading({ children, aside, id }: HeadingProps) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-[var(--cm-line)] pb-2.5">
      <h2 id={id} className="card-display text-[1.25rem] leading-tight text-c-on-bg">
        {children}
      </h2>
      {aside && <span className="shrink-0 text-[13px] text-[var(--cm-muted)] tabular-nums">{aside}</span>}
    </div>
  );
}

/* --------------------------------------------------------- Intro code */

type Tok = { k: "kw" | "key" | "str" | "p" | "name"; t: string };
type Line = { indent: number; toks: Tok[] };

const q1 = (s: string) => `'${s.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
const q2 = (s: string) => `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

function arrayToks(items: string[]): Tok[] {
  const out: Tok[] = [{ k: "p", t: "[" }];
  items.forEach((s, i) => {
    out.push({ k: "str", t: q1(s) });
    if (i < items.length - 1) out.push({ k: "p", t: ", " });
  });
  out.push({ k: "p", t: "]" });
  return out;
}

/**
 * The intro as a code block built from the card: the first item of each stack
 * row, what the developer ships (Services) and the quote. With none of those,
 * the role and city stand in. Null when there's nothing to say.
 */
export function useIntro() {
  const { bundle } = useCard();
  const c = bundle.card;
  const rows = useStackRows();
  const showQuote = visibleSections(bundle).includes("quote");
  return useMemo(() => {
    const stack = rows.map((r) => stackItems(r.value)[0]).filter(Boolean).slice(0, 6);
    const ships = (c.services ?? []).map((s) => s.trim()).filter(Boolean).slice(0, 5);
    const quote = showQuote ? c.quote?.trim().replace(/^[“"]|[”"]$/g, "") : undefined;
    const fields: { key: string; value: Tok[]; plain: string }[] = [];
    if (stack.length) fields.push({ key: "stack", value: arrayToks(stack), plain: `Stack: ${stack.join(", ")}.` });
    if (ships.length) fields.push({ key: "ships", value: arrayToks(ships), plain: `Ships: ${ships.join(", ")}.` });
    if (quote) fields.push({ key: "quote", value: [{ k: "str", t: q2(quote) }], plain: `“${quote}”` });
    if (!fields.length) {
      const city = cityOf(c.address);
      if (c.title?.trim()) fields.push({ key: "role", value: [{ k: "str", t: q1(c.title.trim()) }], plain: `${c.title.trim()}.` });
      if (city) fields.push({ key: "based", value: [{ k: "str", t: q1(city) }], plain: `Based in ${city}.` });
    }
    if (!fields.length) return null;
    const lines: Line[] = [
      { indent: 0, toks: [{ k: "kw", t: "const" }, { k: "p", t: " " }, { k: "name", t: "dev" }, { k: "p", t: " = {" }] },
      ...fields.map((f) => ({ indent: 1, toks: [{ k: "key" as const, t: f.key }, { k: "p" as const, t: ": " }, ...f.value, { k: "p" as const, t: "," }] })),
      { indent: 0, toks: [{ k: "p", t: "};" }] },
    ];
    return { lines, plain: fields.map((f) => f.plain), hasQuote: !!quote };
  }, [rows, c.services, c.quote, c.title, c.address, showQuote]);
}

const TOK: Record<Tok["k"], string> = {
  kw: "text-[var(--cm-code-kw)]",
  key: "text-[var(--cm-code-fg)]",
  name: "text-[var(--cm-code-fg)] font-medium",
  str: "text-[var(--cm-code-str)]",
  p: "text-[var(--cm-code-dim)]",
};

/** Dark code block. The code is drawn for the eye; screen readers get the same facts as sentences. */
export function IntroCode({ className }: { className?: string }) {
  const intro = useIntro();
  const { bundle } = useCard();
  if (!intro) return null;
  return (
    <figure className={cn("m-0", className)}>
      <div aria-hidden className="cm-code overflow-hidden rounded-[12px] bg-[var(--cm-code-bg)] py-4 font-[family-name:var(--c-font-mono)] text-[13px] leading-[1.65] @4xl:text-[14px]">
        {intro.lines.map((l, i) => (
          <div key={i} className="grid grid-cols-[2.75rem_minmax(0,1fr)] pr-4">
            <span className="pr-3 text-right text-[var(--cm-code-dim)] tabular-nums select-none">{i + 1}</span>
            <span className="break-words whitespace-pre-wrap" style={{ paddingLeft: `${(l.indent + 1) * 2}ch`, textIndent: "-2ch" }}>
              {l.toks.map((t, j) => (
                <span key={j} className={TOK[t.k]}>
                  {t.t}
                </span>
              ))}
            </span>
          </div>
        ))}
      </div>
      <figcaption className="sr-only">
        {bundle.card.name}.{" "}
        {intro.plain.map((p, i) => (
          <span key={i}>{p} </span>
        ))}
      </figcaption>
    </figure>
  );
}

/* ----------------------------------------------------------- Activity */

/**
 * Real cards show a graph only with a username and a cached snapshot
 * (getGithubActivity, a stub for now, so it stays hidden). Template previews
 * use the fixed sample pattern.
 */
export function useActivity(): Activity | null {
  const { bundle } = useCard();
  const user = bundle.card.githubUsername?.trim().replace(/^@/, "");
  const isPreview = bundle.card.id.startsWith("preview_");
  const sample = useMemo(() => (isPreview && user ? sampleActivity() : null), [isPreview, user]);
  const [live, setLive] = useState<{ user: string; activity: Activity | null } | null>(null);
  useEffect(() => {
    if (isPreview || !user) return;
    let active = true;
    getGithubActivity(user).then((activity) => {
      if (active) setLive({ user, activity });
    });
    return () => {
      active = false;
    };
  }, [isPreview, user]);
  if (sample) return sample;
  return live && live.user === user ? live.activity : null;
}

const LEVEL = [
  "bg-[var(--cm-cell-0)]",
  "bg-[color:color-mix(in_srgb,var(--c-accent)_28%,var(--c-bg))]",
  "bg-[color:color-mix(in_srgb,var(--c-accent)_52%,var(--c-bg))]",
  "bg-[color:color-mix(in_srgb,var(--c-accent)_76%,var(--c-bg))]",
  "bg-c-accent",
];

export function ActivityGraph({ activity }: { activity: Activity }) {
  const uid = useId();
  const { bundle } = useCard();
  const user = bundle.card.githubUsername?.trim().replace(/^@/, "");
  const weeks = activity.weeks.slice(-ACTIVITY_WEEKS);
  const max = Math.max(1, ...weeks.flat());
  const level = (v: number) => (v <= 0 ? 0 : Math.min(4, Math.ceil((v / max) * 4)));
  const summary = `${activity.total.toLocaleString("en-PH")} contribution${activity.total === 1 ? "" : "s"} in the last ${weeks.length} weeks`;

  return (
    <section aria-labelledby={`${uid}-h`} className="flex flex-col gap-4">
      <Heading tone="background" id={`${uid}-h`} aside={user ? <span className="font-[family-name:var(--c-font-mono)]">@{user}</span> : undefined}>
        Activity
      </Heading>
      <p className="text-[15px] text-c-on-bg">{summary}</p>
      <div className="flex max-w-[560px] flex-col gap-2.5">
        <div
          role="img"
          aria-label={`Commit activity: ${summary}.`}
          className="grid grid-flow-col grid-rows-7 gap-[3px] @4xl:gap-1"
          style={{ gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))` }}
        >
          {weeks.map((days, w) =>
            days.map((v, d) => <span key={`${w}-${d}`} className={cn("cm-cell aspect-square rounded-[3px]", LEVEL[level(v)])} style={{ "--w": w } as CSSProperties} />),
          )}
        </div>
        <div aria-hidden className="flex items-center justify-between gap-3 text-[12px] text-[var(--cm-muted)]">
          <span>{weeks.length} weeks ago</span>
          <span className="flex items-center gap-1.5">
            Less
            {LEVEL.map((cls, i) => (
              <span key={i} className={cn("size-[11px] rounded-[2px]", cls)} />
            ))}
            More
          </span>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- Stack */

export function StackTable() {
  const uid = useId();
  const rows = useStackRows();
  if (!rows.length) return null;
  return (
    <section aria-labelledby={`${uid}-h`} className="flex flex-col gap-2">
      <Heading tone="background" id={`${uid}-h`}>
        Stack
      </Heading>
      <table className="w-full border-collapse text-[14px]">
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.label}-${i}`} className="border-b border-[var(--cm-line)] last:border-b-0">
              <th scope="row" className="w-[32%] py-3 pr-4 text-left align-top text-[14px] font-medium text-[var(--cm-muted)] @4xl:w-[24%]">
                {r.label}
              </th>
              <td className="py-3 align-top font-[family-name:var(--c-font-mono)] text-[13.5px] leading-[1.55] text-c-on-bg [overflow-wrap:anywhere]">{r.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
