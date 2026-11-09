"use client";

import { ArrowUpRight, ChevronRight, Globe, Mail, Phone, UserPlus } from "lucide-react";
import { useId, useMemo, useState, type ReactNode } from "react";
import { siGithub } from "simple-icons";
import { displayHandle, getPlatform } from "@/lib/social";
import type { SocialLink } from "@/lib/types";
import { phoneDigits } from "@/lib/validate";
import { cn } from "@/lib/utils";
import { useContactActions } from "@/components/card/actions";
import { BrandIcon } from "@/components/card/brand-icons";
import { useCard } from "@/components/card/context";
import { useServiceAreas } from "@/components/card/extras";
import { useLabels } from "@/components/card/labels";
import { CardImage } from "@/components/card/primitives";
import { Lightbox, MapBlock, SectionHeading, type HeadingProps } from "@/components/card/sections";
import { MONO } from "./chat";

/** Section headings are code comments: `// shipped`. The slashes are decoration. */
export function CommentHeading({ children, aside, id }: HeadingProps) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <h2 id={id} className={cn(MONO, "text-[17px] leading-tight font-medium text-c-on-bg @4xl:text-[19px]")}>
        <span aria-hidden className="mr-2 text-[var(--pr-accent-ink)]">
          {"//"}
        </span>
        {children}
      </h2>
      {aside && <span className={cn(MONO, "shrink-0 text-[13px] text-c-on-bg-muted tabular-nums")}>{aside}</span>}
    </div>
  );
}

/** Expertise chips, falling back to Services from another template. */
export function useTools(): string[] {
  const { bundle } = useCard();
  const pick = (xs?: string[]) => (xs ?? []).map((s) => s.trim()).filter(Boolean);
  const own = pick(bundle.card.expertiseChips);
  return own.length ? own : pick(bundle.card.services);
}

function Tools({ tools }: { tools: string[] }) {
  return (
    // Plain text in a list: chips are not buttons.
    <ul aria-label="Tools" className="flex flex-wrap gap-2">
      {tools.map((s) => (
        <li key={s} className={cn(MONO, "inline-flex min-h-9 items-center rounded-[10px] border border-[var(--pr-border)] bg-c-surface px-3 text-[13.5px] text-c-text")}>
          {s}
        </li>
      ))}
    </ul>
  );
}

/** About + tools: `// how I build`. Without a bio, the tools stand alone as `// tools`. */
export function HowIBuild({ withBio }: { withBio: boolean }) {
  const { bundle } = useCard();
  const L = useLabels();
  const uid = useId();
  const tools = useTools();
  const [open, setOpen] = useState(false);
  const text = withBio ? (bundle.card.description?.trim() ?? "") : "";
  if (!text && !tools.length) return null;
  const paragraphs = text ? text.split(/\n{2,}/) : [];
  const long = text.length > 360;

  return (
    <section aria-labelledby={`${uid}-h`} className="flex flex-col gap-5">
      <SectionHeading tone="background" id={`${uid}-h`}>
        {text ? "how I build" : "tools"}
      </SectionHeading>
      <div className={cn("flex flex-col gap-6", !!text && tools.length > 0 && "@4xl:grid @4xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] @4xl:gap-16")}>
        {text && (
          <div className="flex flex-col gap-2">
            <div id={`${uid}-bio`} className={cn("max-w-[62ch] text-base leading-[1.65] text-c-on-bg [text-wrap:pretty] [&>p+p]:mt-3.5", long && !open && "line-clamp-6 @4xl:line-clamp-none")}>
              {paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
            {long && (
              <button
                type="button"
                aria-expanded={open}
                aria-controls={`${uid}-bio`}
                onClick={() => setOpen((v) => !v)}
                className="-my-1 inline-flex h-11 cursor-pointer items-center self-start text-[15px] font-semibold text-c-on-bg underline decoration-[var(--pr-accent-ink)] decoration-2 underline-offset-[5px] hover:decoration-current @4xl:hidden"
              >
                {open ? L.showLess : L.readMore}
              </button>
            )}
          </div>
        )}
        {tools.length > 0 && (
          <div className="flex flex-col gap-3">
            {text && (
              <h3 className={cn(MONO, "text-[13.5px] text-c-on-bg-muted")}>
                <span aria-hidden className="mr-1.5 text-[var(--pr-accent-ink)]">
                  {"//"}
                </span>
                tools I build with
              </h3>
            )}
            <Tools tools={tools} />
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * `// shipped`: album photos as screenshot plates with the project name
 * (caption) and its tag. Phone: the first plate full width, then two across.
 * Wide: three across, six shown. Every plate opens the lightbox.
 */
export function Shipped() {
  const { bundle } = useCard();
  const L = useLabels();
  const uid = useId();
  const photos = useMemo(() => {
    const p = bundle.photos.slice();
    const cover = p.findIndex((x) => x.isCover);
    if (cover > 0) p.unshift(...p.splice(cover, 1));
    return p;
  }, [bundle.photos]);
  const [index, setIndex] = useState<number | null>(null);
  if (!photos.length) return null;

  const shown = photos.slice(0, 7);
  // On phones the plates after the first run two across; an odd one out goes full width.
  const lastWide = (shown.length - 1) % 2 === 1;
  const count = `${photos.length} ${photos.length === 1 ? "project" : "projects"}`;

  return (
    <section aria-labelledby={`${uid}-h`} className="flex flex-col gap-5">
      <SectionHeading tone="background" id={`${uid}-h`} aside={count}>
        shipped
      </SectionHeading>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-5 @4xl:grid-cols-3 @4xl:gap-x-5 @4xl:gap-y-7">
        {shown.map((p, i) => {
          const wide = i === 0 || (lastWide && i === shown.length - 1);
          const name = p.caption?.trim();
          return (
            <li key={p.id} className={cn(wide ? "col-span-2 @4xl:col-span-1" : "col-span-1", i === 6 && "@4xl:hidden")}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`${L.openPhoto}: ${name || p.alt || i + 1}`}
                className="group flex w-full cursor-zoom-in flex-col gap-2.5 rounded-[14px] text-left"
              >
                <span className="relative block aspect-[16/10] w-full overflow-hidden rounded-[12px] border border-[var(--pr-border)] bg-c-surface">
                  <CardImage
                    src={p.thumbUrl || p.url}
                    alt={p.alt || ""}
                    sizes={wide ? "(min-width: 896px) 340px, 100vw" : "(min-width: 896px) 340px, 50vw"}
                    className="size-full transition-transform duration-500 [transition-timing-function:var(--ease-out-quart)] group-hover:scale-[1.03] motion-reduce:transition-none"
                    failTone="surface"
                  />
                </span>
                {(name || p.tag) && (
                  <span className="flex min-w-0 flex-col gap-0.5 px-0.5">
                    {name && <span className={cn("leading-snug font-semibold text-c-on-bg [overflow-wrap:anywhere]", wide ? "text-base" : "text-[15px]")}>{name}</span>}
                    {p.tag && <span className={cn(MONO, "text-[12.5px] leading-snug text-c-on-bg-muted [overflow-wrap:anywhere]")}>{p.tag}</span>}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      {photos.length > 6 && (
        <button
          type="button"
          onClick={() => setIndex(0)}
          className={cn(
            MONO,
            "inline-flex h-11 cursor-pointer items-center gap-1.5 self-start rounded-[10px] text-[14px] font-medium text-c-on-bg underline decoration-[var(--pr-accent-ink)] decoration-2 underline-offset-[5px] hover:decoration-current",
            photos.length === 7 && "hidden @4xl:inline-flex",
          )}
        >
          {L.seeAll} {photos.length}
          <ChevronRight aria-hidden className="size-4" />
        </button>
      )}
      <Lightbox photos={photos} index={index} onIndexChange={setIndex} />
    </section>
  );
}

/** `// based in`: the live map, then where the work happens. */
export function BasedIn() {
  const { bundle } = useCard();
  const uid = useId();
  const areas = useServiceAreas();
  const hasMap = !!bundle.card.address?.trim();
  const list = areas.length > 0 && (
    <ul aria-label="Where I work" className="flex flex-wrap gap-x-5 gap-y-1.5">
      {areas.map((a) => (
        <li key={a} className={cn(MONO, "flex items-center gap-2 text-[13.5px] text-c-on-bg")}>
          <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-[var(--pr-primary-ink)]" />
          {a}
        </li>
      ))}
    </ul>
  );
  if (!hasMap && !list) return null;
  if (!hasMap) {
    return (
      <section aria-labelledby={`${uid}-h`} className="flex flex-col gap-4">
        <SectionHeading tone="background" id={`${uid}-h`}>
          based in
        </SectionHeading>
        {list}
      </section>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <MapBlock tone="background" title="based in" mapClassName="!h-48 !rounded-[16px] border border-[var(--pr-border)] @4xl:!h-56" className="[&_address]:text-c-on-bg-muted" />
      {list}
    </div>
  );
}

const isGithub = (s: SocialLink) => /(^|\.)github\.com/i.test(hostOf(s.url)) || /github/i.test(s.label ?? "");
function hostOf(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

function SocialIcon({ s }: { s: SocialLink }) {
  if (isGithub(s)) {
    return (
      <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="currentColor">
        <path d={siGithub.path} />
      </svg>
    );
  }
  return <BrandIcon platform={s.platform} />;
}

/** `// online`: socials as labelled tiles. The website lives in contact. */
export function Online() {
  const { bundle } = useCard();
  const uid = useId();
  const links = bundle.socials.filter((s) => s.visible && s.platform !== "website");
  if (!links.length) return null;
  return (
    <section aria-labelledby={`${uid}-h`} className="flex flex-col gap-4">
      <SectionHeading tone="background" id={`${uid}-h`}>
        online
      </SectionHeading>
      <nav aria-labelledby={`${uid}-h`}>
        <ul className="flex flex-wrap gap-2.5">
          {links.map((s) => {
            const name = s.label || (isGithub(s) ? "GitHub" : getPlatform(s.platform).label);
            return (
              <li key={s.id}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group inline-flex h-12 items-center gap-2.5 rounded-[12px] border border-[var(--pr-border)] bg-c-surface pr-3.5 pl-3.5 text-[15px] font-medium text-c-text transition-colors hover:bg-[color-mix(in_oklab,var(--c-on-bg)_9%,var(--c-surface))]"
                >
                  <SocialIcon s={s} />
                  {name}
                  <ArrowUpRight aria-hidden className="size-4 text-c-text-muted transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none" />
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </section>
  );
}

/** `// reach me`: email, phone, website and Save to contacts as one panel. */
export function ReachMe() {
  const { bundle } = useCard();
  const { saveContact } = useContactActions();
  const L = useLabels();
  const uid = useId();
  const c = bundle.card;
  const site = bundle.socials.find((s) => s.visible && s.platform === "website");

  const rows = [
    c.email && { key: "email", icon: <Mail aria-hidden className="size-[18px]" strokeWidth={2} />, label: L.email, value: c.email, href: `mailto:${c.email}` },
    c.phone && { key: "phone", icon: <Phone aria-hidden className="size-[18px]" strokeWidth={2} />, label: L.phone, value: c.phone, href: `tel:${phoneDigits(c.phone)}` },
    site && { key: "web", icon: <Globe aria-hidden className="size-[18px]" strokeWidth={2} />, label: L.web, value: site.label || displayHandle(site.url), href: site.url },
  ].filter(Boolean) as { key: string; icon: ReactNode; label: string; value: string; href: string }[];

  const row = "flex min-h-[64px] w-full items-center gap-3.5 px-4 py-2.5 text-left transition-colors hover:bg-c-surface-tint";
  const tile = "flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-c-surface-tint text-[var(--pr-primary-ink)]";
  const cell = "@3xl/reach:overflow-hidden @3xl/reach:rounded-[14px] @3xl/reach:border @3xl/reach:border-[var(--pr-border)] @3xl/reach:bg-c-surface";

  return (
    // When the section gets the full width of a wide screen, the rows tile two across.
    <section aria-labelledby={`${uid}-h`} className="@container/reach flex flex-col gap-4">
      <SectionHeading tone="background" id={`${uid}-h`}>
        reach me
      </SectionHeading>
      <ul className="flex flex-col divide-y divide-[var(--pr-border)] overflow-hidden rounded-[16px] border border-[var(--pr-border)] bg-c-surface @3xl/reach:grid @3xl/reach:grid-cols-2 @3xl/reach:gap-3 @3xl/reach:divide-y-0 @3xl/reach:rounded-none @3xl/reach:border-0 @3xl/reach:bg-transparent">
        {rows.map((r) => (
          <li key={r.key} className={cell}>
            <a href={r.href} target={r.key === "web" ? "_blank" : undefined} rel={r.key === "web" ? "noreferrer" : undefined} className={row}>
              <span className={tile}>{r.icon}</span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className={cn(MONO, "text-[12px] text-c-text-muted")}>{r.label.toLowerCase()}</span>
                <span className={cn("text-[15px] font-medium text-c-text [overflow-wrap:anywhere]", r.key === "phone" && "tabular-nums")}>{r.value}</span>
              </span>
              <ChevronRight aria-hidden className="size-4 shrink-0 text-c-text-muted" />
            </a>
          </li>
        ))}
        <li className={cell}>
          <button type="button" onClick={saveContact} className={cn(row, "cursor-pointer")}>
            <span className={tile}>
              <UserPlus aria-hidden className="size-[18px]" strokeWidth={2} />
            </span>
            <span className="flex-1 text-[15px] font-semibold text-c-text">{L.saveToContacts}</span>
            <ChevronRight aria-hidden className="size-4 shrink-0 text-c-text-muted" />
          </button>
        </li>
      </ul>
    </section>
  );
}
