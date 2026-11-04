"use client";

import { BRAND } from "@/lib/brand";
import { Check, ChevronLeft, ChevronRight, Copy, FileText, Mail, Maximize2, Minus, Navigation, Phone, Plus, X } from "lucide-react";
import { Dialog as D } from "radix-ui";
import { createContext, useContext, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { directionsUrl } from "@/lib/services/card-utils";
import { mapsEnabled } from "@/lib/maps/google";
import { GoogleMapLayer } from "./google-map";
import { getPlatform, displayHandle } from "@/lib/social";
import type { AlbumPhoto, OrgMember } from "@/lib/types";
import { phoneDigits } from "@/lib/validate";
import { clamp, cn } from "@/lib/utils";
import { BrandIcon } from "./brand-icons";
import { CardSheet, useCopy } from "./actions";
import { useCard } from "./context";
import { useLabels } from "./labels";
import { CardImage, Monogram } from "./primitives";

export type Tone = "surface" | "background";

export const T = {
  surface: { text: "text-c-text", muted: "text-c-text-muted", line: "border-c-line", tint: "bg-c-surface-tint", bg: "bg-c-surface" },
  background: { text: "text-c-on-bg", muted: "text-c-on-bg-muted", line: "border-c-bg-line", tint: "bg-c-bg-tint", bg: "bg-c-bg" },
} as const;

/* -------------------------------------------------------------- Heading */

export type HeadingProps = { children: ReactNode; tone: Tone; aside?: ReactNode; id?: string };

/**
 * How a template styles the shared section blocks. Templates wrap their
 * sections in <SectionStyle.Provider>; `renderHeading` replaces the heading
 * entirely (e.g. Noir Ledger's numbered "01 — About").
 */
export type SectionStyleValue = {
  heading?: string;
  quote?: string;
  renderHeading?: (p: HeadingProps) => ReactNode;
};
export const SectionStyle = createContext<SectionStyleValue>({});

export function SectionHeading({ children, tone, aside, id }: HeadingProps) {
  const style = useContext(SectionStyle);
  if (style.renderHeading) return <>{style.renderHeading({ children, tone, aside, id })}</>;
  const size = style.heading ?? "text-[1.6rem] leading-tight";
  return (
    <div className="flex items-baseline justify-between gap-4">
      <h2 id={id} className={cn("card-display", size, T[tone].text)}>
        {children}
      </h2>
      {aside && <span className={cn("shrink-0 text-sm tabular-nums", T[tone].muted)}>{aside}</span>}
    </div>
  );
}

/* ---------------------------------------------------------------- Quote */

export function QuoteBlock({ tone, className }: { tone: Tone; className?: string }) {
  const { bundle } = useCard();
  const style = useContext(SectionStyle);
  const q = bundle.card.quote?.trim();
  if (!q) return null;
  const cls = style.quote ?? "text-[clamp(1.5rem,6.4cqi,2.1rem)] leading-[1.28]";
  return (
    <figure className={cn("m-0", className)}>
      <blockquote className={cn("card-display m-0 [text-wrap:balance]", cls, T[tone].text)}>
        <p>“{q.replace(/^[“"]|[”"]$/g, "")}”</p>
      </blockquote>
    </figure>
  );
}

/* ---------------------------------------------------------------- About */

export function AboutBlock({ tone, className, heading }: { tone: Tone; className?: string; heading?: boolean }) {
  const { bundle } = useCard();
  const L = useLabels();
  const uid = useId();
  const text = bundle.card.description?.trim();
  const [open, setOpen] = useState(false);
  if (!text) return null;
  const long = text.length > 280;
  const paragraphs = text.split(/\n{2,}/);
  return (
    <section aria-labelledby={heading ? `${uid}-h` : undefined} aria-label={heading ? undefined : L.about} className={cn("flex flex-col gap-3", className)}>
      {heading && (
        <SectionHeading tone={tone} id={`${uid}-h`}>
          {L.about}
        </SectionHeading>
      )}
      <div id={`${uid}-text`} className={cn("flex max-w-[56ch] flex-col gap-3 text-base leading-[1.65]", T[tone].muted, long && !open && "line-clamp-5")}>
        {paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
      {long && (
        <button
          type="button"
          aria-expanded={open}
          aria-controls={`${uid}-text`}
          onClick={() => setOpen((v) => !v)}
          className={cn("-my-2 inline-flex h-11 cursor-pointer items-center self-start text-[15px] font-semibold underline underline-offset-4", T[tone].text)}
        >
          {open ? L.showLess : L.readMore}
        </button>
      )}
    </section>
  );
}

/* -------------------------------------------------------------- Contact */

export function ContactList({ tone, variant = "rows", className }: { tone: Tone; variant?: "rows" | "tiles" | "large"; className?: string }) {
  const { bundle } = useCard();
  const { card } = bundle;
  const { copied, copy } = useCopy();
  const L = useLabels();
  const rows = [
    card.phone && { key: "phone", icon: <Phone aria-hidden className="size-5" strokeWidth={1.75} />, label: L.phone, value: card.phone, href: `tel:${phoneDigits(card.phone)}` },
    card.email && { key: "email", icon: <Mail aria-hidden className="size-5" strokeWidth={1.75} />, label: L.email, value: card.email, href: `mailto:${card.email}` },
  ].filter(Boolean) as { key: string; icon: ReactNode; label: string; value: string; href: string }[];
  if (!rows.length) return null;

  return (
    <section aria-label={L.contactDetails} className={cn("flex flex-col", variant === "tiles" && "gap-2", className)}>
      {rows.map((r, i) => (
        <div
          key={r.key}
          className={cn(
            "flex min-h-[60px] items-center gap-3",
            variant === "rows" && cn("border-t", T[tone].line, i === rows.length - 1 && "border-b"),
            variant === "tiles" && cn("rounded-[14px] pr-1.5 pl-4", T[tone].tint),
            variant === "large" && cn("border-b-2 py-2", tone === "background" ? "border-c-on-bg" : "border-c-text"),
          )}
        >
          {variant !== "large" && <span className={T[tone].text}>{r.icon}</span>}
          <a
            href={r.href}
            className={cn(
              "min-w-0 flex-1 py-3 underline-offset-4 hover:underline",
              variant === "large" ? "[overflow-wrap:anywhere]" : "truncate",
              T[tone].text,
              variant === "large" ? "card-display text-[clamp(1.1rem,5.4cqi,1.5rem)] [font-stretch:90%]" : "text-base",
              r.key === "phone" && "tabular-nums",
            )}
          >
            <span className="sr-only">{r.label}: </span>
            {r.key === "email" ? <BreakableEmail value={r.value} /> : r.value}
          </a>
          <button
            type="button"
            onClick={() => copy(r.value, r.key)}
            aria-label={`${L.copy}: ${r.label.toLowerCase()}`}
            className={cn("inline-flex h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 text-sm font-semibold", T[tone].text, "hover:opacity-80")}
          >
            {copied === r.key ? <Check aria-hidden className="size-4" /> : <Copy aria-hidden className="size-4" />}
            <span className={cn(variant === "rows" && "sr-only")}>{copied === r.key ? L.copied : L.copy}</span>
          </button>
        </div>
      ))}
      <span aria-live="polite" className="sr-only">
        {copied ? L.copiedThing(copied === "phone" ? L.phone : L.email) : ""}
      </span>
    </section>
  );
}

/** Lets a long email wrap at the @ and dots instead of mid-word. */
export function BreakableEmail({ value }: { value: string }) {
  const [user, domain] = value.split("@");
  if (!domain) return <>{value}</>;
  return (
    <>
      {user}
      <wbr />@{domain.split(".").map((d, i) => (
        <span key={i}>
          {i > 0 && (
            <>
              <wbr />.
            </>
          )}
          {d}
        </span>
      ))}
    </>
  );
}

/* -------------------------------------------------------------- Socials */

export function SocialLinks({ tone, variant, className }: { tone: Tone; variant: "icons" | "chips" | "rows"; className?: string }) {
  const { bundle } = useCard();
  const L = useLabels();
  const links = bundle.socials.filter((s) => s.visible);
  if (!links.length) return null;

  if (variant === "rows") {
    return (
      <nav aria-label={L.socialProfiles} className={cn("flex flex-col", className)}>
        {links.map((s) => (
          <a
            key={s.id}
            href={s.url}
            target="_blank"
            rel="noreferrer"
            className={cn("flex min-h-[56px] items-center gap-3.5 border-b py-2", T[tone].line, T[tone].text)}
          >
            <BrandIcon platform={s.platform} />
            <span className="flex min-w-0 flex-col">
              <span className="text-[15px] font-semibold">{s.label || getPlatform(s.platform).label}</span>
              <span className={cn("truncate text-sm", T[tone].muted)}>{displayHandle(s.url)}</span>
            </span>
          </a>
        ))}
      </nav>
    );
  }

  return (
    <nav aria-label={L.socialProfiles} className={cn("flex flex-wrap gap-2.5", className)}>
      {links.map((s) => {
        const name = s.label || getPlatform(s.platform).label;
        return variant === "icons" ? (
          <a
            key={s.id}
            href={s.url}
            target="_blank"
            rel="noreferrer"
            aria-label={name}
            title={name}
            className={cn(
              "inline-flex size-12 items-center justify-center rounded-[var(--c-btn-radius)] border transition-colors hover:opacity-80",
              T[tone].line,
              T[tone].text,
            )}
            style={{ borderRadius: "min(var(--c-btn-radius), 14px)" }}
          >
            <BrandIcon platform={s.platform} />
          </a>
        ) : (
          <a
            key={s.id}
            href={s.url}
            target="_blank"
            rel="noreferrer"
            className={cn(
              "inline-flex h-11 items-center gap-2 border-2 px-4 text-[15px] font-bold",
              tone === "background" ? "border-c-on-bg text-c-on-bg" : "border-c-text text-c-text",
            )}
            style={{ borderRadius: "var(--c-btn-radius)" }}
          >
            <BrandIcon platform={s.platform} className="size-4" />
            {name}
          </a>
        );
      })}
    </nav>
  );
}

/* ------------------------------------------------------------------ Map */

function mapSeed(lat = 14.6, lng = 121) {
  let h = Math.floor(Math.abs(lat * 1000 + lng * 7919));
  return () => {
    h = (h * 1103515245 + 12345) & 0x7fffffff;
    return h / 0x7fffffff;
  };
}

/** The card's map: a live Google map when there's a key and a pin, over a drawn stand-in that shows until it loads (or without one). */
export function StyledMap({ tone, className }: { tone: Tone; className?: string }) {
  const { bundle } = useCard();
  const { mapLat, mapLng, address, themeId } = bundle.card;
  const [live, setLive] = useState(false);
  const roads = useMemo(() => {
    const r = mapSeed(mapLat, mapLng);
    return Array.from({ length: 7 }, (_, i) => ({
      x: r() * 100,
      y: r() * 100,
      a: i < 3 ? -10 + r() * 20 : 70 + r() * 40,
      w: i === 0 ? 10 : i < 3 ? 6 : 4,
    }));
  }, [mapLat, mapLng]);
  const ground = tone === "surface" ? "var(--c-surface)" : "var(--c-bg)";

  return (
    <div className={cn("relative overflow-hidden", T[tone].tint, className)}>
      <div role="img" aria-label={`Map showing ${address ?? "the office"}`} aria-hidden={live || undefined} className="absolute inset-0">
        <div aria-hidden className={cn("absolute top-[8%] right-[6%] h-[38%] w-[30%] rounded-lg opacity-60", tone === "surface" ? "bg-c-line" : "bg-c-bg-line")} />
        <div aria-hidden className={cn("absolute bottom-[6%] left-[4%] h-[22%] w-[26%] rounded-lg opacity-40", tone === "surface" ? "bg-c-line" : "bg-c-bg-line")} />
        {roads.map((rd, i) => (
          <span
            key={i}
            aria-hidden
            className={cn("absolute left-[-20%] block w-[140%] origin-center", tone === "surface" ? "bg-c-surface" : "bg-c-bg")}
            style={{ top: `${rd.y}%`, height: rd.w, transform: `rotate(${rd.a}deg) translateX(${rd.x - 50}%)` }}
          />
        ))}
        <span aria-hidden className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full">
          <svg viewBox="0 0 24 24" className="size-10 drop-shadow-[0_3px_4px_rgb(0_0_0/0.35)]">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" fill="var(--c-accent)" stroke={ground} strokeWidth="1.5" />
            <circle cx="12" cy="10" r="3" fill={ground} />
          </svg>
        </span>
      </div>
      {mapsEnabled && mapLat != null && mapLng != null && (
        <GoogleMapLayer
          // A new theme can flip light/dark: start the map again in the right style.
          key={`${themeId}-${tone}`}
          lat={mapLat}
          lng={mapLng}
          label={`Map of ${address ?? "the office"}`}
          backgroundVar={tone === "surface" ? "--c-surface" : "--c-bg"}
          pinFill="var(--c-accent)"
          pinRing={ground}
          onReady={() => setLive(true)}
          onFailed={() => setLive(false)}
        />
      )}
    </div>
  );
}

export function MapBlock({ tone, title, className, mapClassName }: { tone: Tone; title?: string; className?: string; mapClassName?: string }) {
  const { bundle } = useCard();
  const L = useLabels();
  const uid = useId();
  const { card } = bundle;
  if (!card.address?.trim()) return null;
  return (
    <section aria-labelledby={`${uid}-h`} className={cn("flex flex-col gap-4", className)}>
      <SectionHeading tone={tone} id={`${uid}-h`}>
        {title ?? L.office}
      </SectionHeading>
      <StyledMap tone={tone} className={cn("h-44 rounded-2xl @3xl:h-60", mapClassName)} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <address className={cn("max-w-[34ch] text-[15px] leading-normal not-italic", T[tone].muted)}>{card.address}</address>
        {card.showDirections && (
          <a href={directionsUrl(card)} target="_blank" rel="noreferrer" className={cn("cbtn px-4 text-sm", tone === "surface" ? "cbtn-surface" : "cbtn-primary")}>
            <Navigation aria-hidden className="size-4" strokeWidth={2} />
            {L.directions}
          </a>
        )}
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- Photos */

export function PhotoAlbum({ tone, layout, className, title }: { tone: Tone; layout: "grid" | "carousel" | "masonry"; className?: string; title?: string }) {
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
  const scroller = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(0);
  if (!photos.length) return null;

  const count = L.photoCount(photos.length);

  return (
    <section aria-labelledby={`${uid}-h`} className={cn("flex flex-col gap-4", className)}>
      <SectionHeading tone={tone} id={`${uid}-h`} aside={layout === "carousel" ? undefined : count}>
        {title ?? L.photos}
      </SectionHeading>

      {layout === "grid" && (
        <div className="grid auto-rows-[clamp(96px,28cqi,180px)] grid-cols-3 gap-1">
          {photos.slice(0, 6).map((p, i) => {
            const more = i === 5 && photos.length > 6;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={more ? `${L.seeAll}: ${count}` : `${L.openPhoto}: ${p.caption || p.alt || `${i + 1}`}`}
                className={cn("group relative cursor-zoom-in overflow-hidden rounded-lg", i === 0 && photos.length > 2 && "col-span-2 row-span-2")}
              >
                <CardImage src={p.url} alt={p.alt || ""} sizes="(min-width: 768px) 360px, 66vw" className="size-full transition-transform duration-500 group-hover:scale-[1.03]" failTone={tone} />
                {more && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-lg font-semibold text-white">
                    +{photos.length - 5}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {layout === "carousel" && (
        <>
          <div
            ref={scroller}
            onScroll={(e) => {
              const el = e.currentTarget;
              const w = (el.firstElementChild as HTMLElement | null)?.offsetWidth ?? 1;
              setPos(Math.round(el.scrollLeft / (w + 10)));
            }}
            className="-mx-4 flex snap-x snap-mandatory gap-2.5 overflow-x-auto scroll-px-4 px-4 pb-1 [scrollbar-width:none]"
          >
            {photos.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`${L.openPhoto} ${L.nOfM(i + 1, photos.length)}: ${p.caption || p.alt || ""}`}
                className="relative w-[72%] max-w-[340px] shrink-0 cursor-zoom-in snap-start overflow-hidden rounded-[18px]"
                style={{ aspectRatio: "4 / 5" }}
              >
                <CardImage src={p.url} alt={p.alt || ""} sizes="(min-width: 768px) 340px, 72vw" className="size-full" failTone={tone} />
              </button>
            ))}
          </div>
          <div className={cn("flex items-center justify-between text-[15px]", T[tone].muted)}>
            <span className="tabular-nums">
              {L.nOfM(Math.min(pos + 1, photos.length), photos.length)}
            </span>
            <button type="button" onClick={() => setIndex(0)} className={cn("inline-flex h-11 cursor-pointer items-center font-bold underline underline-offset-4", T[tone].text)}>
              {L.seeAll}
            </button>
          </div>
        </>
      )}

      {layout === "masonry" && (
        <div className="columns-2 gap-2 @3xl:columns-3">
          {photos.slice(0, 10).map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`${L.openPhoto}: ${p.caption || p.alt || `${i + 1}`}`}
              className="relative mb-2 block w-full cursor-zoom-in break-inside-avoid overflow-hidden rounded-xl"
              style={{ aspectRatio: i % 3 === 0 ? "3 / 4" : "4 / 3" }}
            >
              <CardImage src={p.url} alt={p.alt || ""} sizes="(min-width: 768px) 30vw, 48vw" className="size-full" failTone={tone} />
            </button>
          ))}
        </div>
      )}

      <Lightbox photos={photos} index={index} onIndexChange={setIndex} />
    </section>
  );
}

/** Full-screen viewer: swipe, arrow keys, captions, focus kept inside. */
export function Lightbox({ photos, index, onIndexChange }: { photos: AlbumPhoto[]; index: number | null; onIndexChange: (i: number | null) => void }) {
  const { portal } = useCard();
  const start = useRef<number | null>(null);
  const [dx, setDx] = useState(0);
  const open = index !== null;
  const i = index ?? 0;
  const go = (d: number) => onIndexChange(clamp(i + d, 0, photos.length - 1));
  const photo = photos[i];

  return (
    <D.Root open={open} onOpenChange={(v) => !v && onIndexChange(null)}>
      <D.Portal container={portal.current}>
        <D.Overlay className="fixed inset-0 z-[80] bg-black/95 [animation:fade-in_180ms_ease-out]" />
        <D.Content
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") go(1);
            if (e.key === "ArrowLeft") go(-1);
          }}
          className="fixed inset-0 z-[81] flex flex-col text-white focus:outline-none"
        >
          <D.Title className="sr-only">Photos</D.Title>
          <D.Description className="sr-only">Swipe or use the arrow keys to move between photos.</D.Description>
          <div className="flex h-16 shrink-0 items-center justify-between px-3">
            <span className="pl-2 text-sm tabular-nums text-white/80" aria-live="polite">
              {i + 1} / {photos.length}
            </span>
            <D.Close aria-label="Close photos" className="inline-flex size-11 cursor-pointer items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
              <X aria-hidden className="size-5" />
            </D.Close>
          </div>
          <div
            className="relative min-h-0 flex-1 touch-pan-y select-none"
            onPointerDown={(e) => {
              start.current = e.clientX;
            }}
            onPointerMove={(e) => start.current !== null && setDx(e.clientX - start.current)}
            onPointerUp={() => {
              if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
              start.current = null;
              setDx(0);
            }}
            onPointerCancel={() => {
              start.current = null;
              setDx(0);
            }}
          >
            {photo && (
              <div className="absolute inset-0 transition-transform duration-200 ease-out" style={{ transform: `translateX(${dx}px)` }}>
                <CardImage key={photo.id} src={photo.url} alt={photo.alt || photo.caption || ""} sizes="100vw" className="size-full" imgClassName="!object-contain" failTone="background" />
              </div>
            )}
            {i > 0 && (
              <button type="button" onClick={() => go(-1)} aria-label="Previous photo" className="absolute top-1/2 left-3 hidden size-12 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/50 hover:bg-black/70 sm:inline-flex">
                <ChevronLeft aria-hidden className="size-6" />
              </button>
            )}
            {i < photos.length - 1 && (
              <button type="button" onClick={() => go(1)} aria-label="Next photo" className="absolute top-1/2 right-3 hidden size-12 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/50 hover:bg-black/70 sm:inline-flex">
                <ChevronRight aria-hidden className="size-6" />
              </button>
            )}
          </div>
          <div className="min-h-20 shrink-0 px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            {photo?.caption && <p className="mx-auto max-w-xl text-center text-[15px] leading-normal text-white/90">{photo.caption}</p>}
          </div>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}

/* ------------------------------------------------------------ Org chart */

export type Node = OrgMember & { children: Node[] };

export function buildTree(members: OrgMember[]): Node[] {
  const map = new Map<string, Node>(members.map((m) => [m.id, { ...m, children: [] }]));
  const roots: Node[] = [];
  map.forEach((n) => {
    const parent = n.parentId ? map.get(n.parentId) : undefined;
    if (parent) parent.children.push(n);
    else roots.push(n);
  });
  const sort = (ns: Node[]) => {
    ns.sort((a, b) => a.position - b.position);
    ns.forEach((n) => sort(n.children));
  };
  sort(roots);
  return roots;
}

export function MemberAvatar({ m, tone, size }: { m: OrgMember; tone: Tone; size: string }) {
  return m.photoUrl ? (
    <CardImage src={m.photoUrl} alt="" sizes="96px" className={cn("shrink-0 rounded-full", size)} failTone={tone} />
  ) : (
    <Monogram name={m.name} tone={tone} className={cn("shrink-0 rounded-full", size)} />
  );
}

export function OrgChartBlock({ tone, className, title }: { tone: Tone; className?: string; title?: string }) {
  const { bundle } = useCard();
  const L = useLabels();
  const uid = useId();
  const { orgChart, orgMembers } = bundle;
  const [person, setPerson] = useState<OrgMember | null>(null);
  const [zoom, setZoom] = useState(false);
  const tree = useMemo(() => buildTree(orgMembers), [orgMembers]);

  if (!orgChart) return null;
  if (orgChart.mode === "upload" && !orgChart.fileUrl) return null;
  if (orgChart.mode === "tree" && !orgMembers.length) return null;

  const managerOf = (m: OrgMember) => orgMembers.find((x) => x.id === m.parentId);
  const reportsOf = (m: OrgMember) => orgMembers.filter((x) => x.parentId === m.id);

  const renderNode = (n: Node, depth: number): ReactNode => (
    <li key={n.id} className="flex flex-col">
      <button
        type="button"
        onClick={() => setPerson(n)}
        className={cn(
          "flex min-h-[60px] w-full cursor-pointer items-center gap-3 rounded-xl py-2 pr-2 text-left transition-colors",
          depth === 0 ? "pl-0" : "pl-2",
          tone === "surface" ? "hover:bg-c-surface-tint" : "hover:bg-c-bg-tint",
        )}
      >
        <MemberAvatar m={n} tone={tone} size={depth === 0 ? "size-14" : "size-11"} />
        <span className="flex min-w-0 flex-col">
          <span className={cn("truncate font-semibold", depth === 0 ? "text-[17px]" : "text-[15px]", T[tone].text)}>{n.name}</span>
          <span className={cn("truncate text-sm", T[tone].muted)}>{n.role}</span>
        </span>
      </button>
      {n.children.length > 0 && (
        <ul className={cn("ml-[27px] flex flex-col border-l pl-3", T[tone].line, depth > 0 && "ml-[21px]")}>
          {n.children.map((c) => renderNode(c, depth + 1))}
        </ul>
      )}
    </li>
  );

  return (
    <section aria-labelledby={`${uid}-h`} className={cn("flex flex-col gap-4", className)}>
      <SectionHeading tone={tone} id={`${uid}-h`} aside={orgChart.mode === "tree" ? L.people(orgMembers.length) : undefined}>
        {title ?? L.team}
      </SectionHeading>

      {orgChart.mode === "tree" ? (
        <ul className="flex flex-col">{tree.map((n) => renderNode(n, 0))}</ul>
      ) : orgChart.fileType === "pdf" ? (
        <a href={orgChart.fileUrl} target="_blank" rel="noreferrer" className={cn("flex items-center gap-4 rounded-2xl border p-4", T[tone].line, T[tone].text)}>
          <span className={cn("flex size-12 items-center justify-center rounded-xl", T[tone].tint)}>
            <FileText aria-hidden className="size-6" strokeWidth={1.75} />
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="font-semibold">Open the organization chart</span>
            <span className={cn("truncate text-sm", T[tone].muted)}>{orgChart.fileName ?? "PDF"}</span>
          </span>
        </a>
      ) : (
        <button type="button" onClick={() => setZoom(true)} className="group relative cursor-zoom-in overflow-hidden rounded-2xl" aria-label="Open the organization chart full screen">
          {/* eslint-disable-next-line @next/next/no-img-element -- uploaded chart of unknown size */}
          <img src={orgChart.fileUrl} alt={orgChart.fileAlt || "Organization chart"} className="w-full bg-white" />
          <span className="absolute right-3 bottom-3 inline-flex h-9 items-center gap-1.5 rounded-full bg-black/65 px-3 text-sm font-semibold text-white">
            <Maximize2 aria-hidden className="size-4" />
            Zoom
          </span>
        </button>
      )}

      <CardSheet open={!!person} onOpenChange={(v) => !v && setPerson(null)} title={person?.name ?? ""} description={person?.role}>
        {person && (
          <div className="flex flex-col gap-5">
            <MemberAvatar m={person} tone="surface" size="size-24" />
            <dl className="flex flex-col gap-3 text-[15px]">
              {managerOf(person) && (
                <div className="flex flex-col gap-0.5">
                  <dt className="text-sm text-c-text-muted">{L.reportsTo}</dt>
                  <dd>
                    <button type="button" className="cursor-pointer font-semibold underline underline-offset-4" onClick={() => setPerson(managerOf(person)!)}>
                      {managerOf(person)!.name}
                    </button>
                  </dd>
                </div>
              )}
              {reportsOf(person).length > 0 && (
                <div className="flex flex-col gap-1">
                  <dt className="text-sm text-c-text-muted">{L.team}</dt>
                  <dd className="flex flex-wrap gap-2">
                    {reportsOf(person).map((r) => (
                      <button key={r.id} type="button" onClick={() => setPerson(r)} className="inline-flex h-10 cursor-pointer items-center rounded-full bg-c-surface-tint px-3.5 text-sm font-semibold">
                        {r.name}
                      </button>
                    ))}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        )}
      </CardSheet>

      {orgChart.mode === "upload" && orgChart.fileType !== "pdf" && orgChart.fileUrl && (
        <ZoomViewer open={zoom} onOpenChange={setZoom} src={orgChart.fileUrl} alt={orgChart.fileAlt || "Organization chart"} />
      )}
    </section>
  );
}

/** Zoomable viewer for an uploaded chart: buttons, wheel and drag to pan. */
export function ZoomViewer({ open, onOpenChange, src, alt }: { open: boolean; onOpenChange: (v: boolean) => void; src: string; alt: string }) {
  const { portal } = useCard();
  const [z, setZ] = useState(1);
  const [p, setP] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const zoomTo = (v: number) => {
    const nz = clamp(v, 1, 4);
    setZ(nz);
    if (nz === 1) setP({ x: 0, y: 0 });
  };
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal container={portal.current}>
        <D.Overlay className="fixed inset-0 z-[80] bg-black/95" />
        <D.Content className="fixed inset-0 z-[81] flex flex-col text-white focus:outline-none">
          <D.Title className="sr-only">Organization chart</D.Title>
          <D.Description className="sr-only">Use the zoom buttons or drag to move around the chart.</D.Description>
          <div className="flex h-16 shrink-0 items-center justify-between gap-2 px-3">
            <div className="flex items-center gap-1 rounded-full bg-white/10 p-1">
              <button type="button" onClick={() => zoomTo(z - 0.5)} aria-label="Zoom out" disabled={z <= 1} className="inline-flex size-10 cursor-pointer items-center justify-center rounded-full hover:bg-white/15 disabled:opacity-40">
                <Minus aria-hidden className="size-5" />
              </button>
              <span className="w-12 text-center text-sm tabular-nums">{Math.round(z * 100)}%</span>
              <button type="button" onClick={() => zoomTo(z + 0.5)} aria-label="Zoom in" disabled={z >= 4} className="inline-flex size-10 cursor-pointer items-center justify-center rounded-full hover:bg-white/15 disabled:opacity-40">
                <Plus aria-hidden className="size-5" />
              </button>
            </div>
            <D.Close aria-label="Close chart" className="inline-flex size-11 cursor-pointer items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
              <X aria-hidden className="size-5" />
            </D.Close>
          </div>
          <div
            className={cn("relative min-h-0 flex-1 touch-none overflow-hidden", z > 1 ? "cursor-grab active:cursor-grabbing" : "")}
            onWheel={(e) => zoomTo(z - e.deltaY * 0.002)}
            onPointerDown={(e) => {
              drag.current = { x: p.x, y: p.y, px: e.clientX, py: e.clientY };
            }}
            onPointerMove={(e) => {
              if (!drag.current || z === 1) return;
              setP({ x: drag.current.x + (e.clientX - drag.current.px), y: drag.current.y + (e.clientY - drag.current.py) });
            }}
            onPointerUp={() => (drag.current = null)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- uploaded chart of unknown size */}
            <img
              src={src}
              alt={alt}
              draggable={false}
              className="absolute inset-0 m-auto max-h-full max-w-full bg-white transition-transform duration-150"
              style={{ transform: `translate(${p.x}px, ${p.y}px) scale(${z})` }}
            />
          </div>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}

/* --------------------------------------------------------------- Footer */

export function CardFooter({ tone, className }: { tone: Tone; className?: string }) {
  const { isHidden } = useCard();
  const L = useLabels();
  if (isHidden("poweredBy")) return <div className={cn("h-6", className)} />;
  return (
    <footer className={cn("text-[13px]", T[tone].muted, className)}>
      {L.poweredBy} <span className="font-semibold">{BRAND.name}</span>
    </footer>
  );
}
