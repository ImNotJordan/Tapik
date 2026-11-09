"use client";

import { ArrowRight, ArrowUpRight, Mail, Navigation, Phone, UserPlus } from "lucide-react";
import { useId, useMemo, useState, type ReactNode } from "react";
import { mapsEnabled } from "@/lib/maps/google";
import { directionsUrl } from "@/lib/services/card-utils";
import { displayHandle, getPlatform } from "@/lib/social";
import type { SocialLink } from "@/lib/types";
import { phoneDigits } from "@/lib/validate";
import { cn } from "@/lib/utils";
import { useContactActions } from "@/components/card/actions";
import { BrandIcon } from "@/components/card/brand-icons";
import { useCard } from "@/components/card/context";
import { GoogleMapLayer } from "@/components/card/google-map";
import { useLabels } from "@/components/card/labels";
import { CardImage } from "@/components/card/primitives";
import { BreakableEmail, buildTree, Lightbox, MemberAvatar, OrgChartBlock, SectionHeading, type Node } from "@/components/card/sections";
import { useAlbum } from "./hero";

/** Outline button: ink at half strength, so its edge clears 3:1 on the ground. */
export const OUTLINE = "cbtn border-[1.5px] border-[color:color-mix(in_oklab,var(--c-on-bg)_50%,var(--c-bg))] text-c-on-bg hover:bg-c-bg-tint";

/* -------------------------------------------------------------- Album */

/** Fallback shapes when a photo has no stored size: they alternate so the two columns stagger. */
const ASPECTS = ["4 / 5", "1 / 1", "3 / 4", "4 / 3", "1 / 1", "4 / 5"];
const SHOWN = 6;

/** Two-column masonry with a caption (and the plate's tag) under each picture. */
export function Album() {
  const L = useLabels();
  const uid = useId();
  const photos = useAlbum();
  const [index, setIndex] = useState<number | null>(null);
  if (!photos.length) return null;
  const viewAll = L.lang === "en" ? `View all ${photos.length}` : `${L.seeAll} (${photos.length})`;

  return (
    <section aria-labelledby={`${uid}-h`} className="flex flex-col gap-5">
      <SectionHeading tone="background" id={`${uid}-h`} aside={L.photoCount(photos.length)}>
        {L.photos}
      </SectionHeading>
      <ul className="columns-2 gap-3">
        {photos.slice(0, SHOWN).map((p, i) => {
          const aspect = p.width && p.height ? `${p.width} / ${p.height}` : ASPECTS[i % ASPECTS.length];
          return (
            <li key={p.id} className="mb-5 break-inside-avoid">
              <figure className="m-0 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`${L.openPhoto}: ${p.caption || p.alt || L.nOfM(i + 1, photos.length)}`}
                  className="group relative block w-full cursor-zoom-in overflow-hidden rounded-[6px] bg-c-surface"
                  style={{ aspectRatio: aspect }}
                >
                  <CardImage
                    src={p.thumbUrl || p.url}
                    alt={p.alt || ""}
                    sizes="(min-width: 1024px) 260px, 48vw"
                    className="size-full transition-transform duration-700 [transition-timing-function:var(--ease-out-expo)] group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                    failTone="background"
                  />
                </button>
                {(p.caption || p.tag) && (
                  <figcaption className="flex flex-col gap-0.5 text-[14px] leading-snug">
                    {p.caption && <span className="text-c-on-bg [overflow-wrap:anywhere]">{p.caption}</span>}
                    {p.tag && <span className="font-medium text-c-accent">{p.tag}</span>}
                  </figcaption>
                )}
              </figure>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={() => setIndex(0)}
        className="group -mt-2 inline-flex h-11 cursor-pointer items-center gap-2 self-start text-[15px] font-semibold text-c-on-bg underline decoration-c-bg-line underline-offset-[5px] hover:decoration-current"
      >
        {viewAll}
        <ArrowRight aria-hidden className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none" strokeWidth={2} />
      </button>
      <Lightbox photos={photos} index={index} onIndexChange={setIndex} />
    </section>
  );
}

/* --------------------------------------------------------------- Team */

function flatten(nodes: Node[]): Node[] {
  return nodes.flatMap((n) => [n, ...flatten(n.children)]);
}

/** Round avatars, three to a row. An uploaded chart falls back to the shared viewer. */
export function Team() {
  const { bundle } = useCard();
  const L = useLabels();
  const uid = useId();
  const { orgChart, orgMembers } = bundle;
  const people = useMemo(() => flatten(buildTree(orgMembers)), [orgMembers]);
  if (!orgChart) return null;
  if (orgChart.mode === "upload") return <OrgChartBlock tone="background" />;
  if (!people.length) return null;

  return (
    <section aria-labelledby={`${uid}-h`} className="flex flex-col gap-5">
      <SectionHeading tone="background" id={`${uid}-h`} aside={L.people(people.length)}>
        {L.team}
      </SectionHeading>
      <ul className="grid grid-cols-3 gap-x-3 gap-y-6">
        {people.map((m) => (
          <li key={m.id} className="flex min-w-0 flex-col items-center gap-2.5 text-center">
            <MemberAvatar m={m} tone="background" size="size-[clamp(64px,19cqi,84px)]" />
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="line-clamp-2 text-[14px] leading-snug font-semibold text-c-on-bg [overflow-wrap:anywhere]">{m.name}</span>
              {m.role && <span className="line-clamp-2 text-[13px] leading-snug text-c-on-bg-muted">{m.role}</span>}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------------------------------------------------------------- Map */

function seeded(lat = 14.6, lng = 121) {
  let h = Math.floor(Math.abs(lat * 1000 + lng * 7919));
  return () => {
    h = (h * 1103515245 + 12345) & 0x7fffffff;
    return h / 0x7fffffff;
  };
}

/** A quiet line drawing of a street grid: hairline streets, two main roads, a river. The live map covers it when it loads. */
function LineMap() {
  const { bundle } = useCard();
  const { mapLat, mapLng, address } = bundle.card;
  const [live, setLive] = useState(false);
  const plan = useMemo(() => {
    const r = seeded(mapLat, mapLng);
    const tilt = -14 + r() * 28;
    const cols = Array.from({ length: 14 }, (_, i) => -140 + i * 52 + r() * 14);
    const rows = Array.from({ length: 9 }, (_, i) => -40 + i * 40 + r() * 10);
    const mainCol = cols[6 + Math.floor(r() * 3)];
    const mainRow = rows[3 + Math.floor(r() * 2)];
    const bend = 30 + r() * 40;
    return { tilt, cols, rows, mainCol, mainRow, bend };
  }, [mapLat, mapLng]);

  return (
    <div className="relative h-48 overflow-hidden rounded-[10px] border border-c-bg-line bg-c-bg @3xl:h-56">
      <div role="img" aria-label={`Map showing ${address ?? "the studio"}`} aria-hidden={live || undefined} className="absolute inset-0">
        <svg aria-hidden className="absolute inset-0 size-full" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" fill="none">
          <path
            d={`M-20 ${150 + plan.bend / 3} C 90 ${120 + plan.bend}, 200 ${200 - plan.bend}, 420 ${130 + plan.bend / 2}`}
            stroke="var(--c-bg-tint)"
            strokeWidth="16"
            strokeLinecap="round"
          />
          <g transform={`rotate(${plan.tilt} 200 100)`} stroke="var(--c-bg-line)">
            {plan.cols.map((x, i) => (
              <line key={`c${i}`} x1={x} y1={-120} x2={x} y2={320} strokeWidth="1" />
            ))}
            {plan.rows.map((y, i) => (
              <line key={`r${i}`} x1={-160} y1={y} x2={560} y2={y} strokeWidth="1" />
            ))}
            <line x1={plan.mainCol} y1={-120} x2={plan.mainCol} y2={320} strokeWidth="3" />
            <line x1={-160} y1={plan.mainRow} x2={560} y2={plan.mainRow} strokeWidth="3" />
          </g>
        </svg>
        <span aria-hidden className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full">
          <svg viewBox="0 0 24 24" className="size-9">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" fill="var(--c-accent)" stroke="var(--c-bg)" strokeWidth="1.5" />
            <circle cx="12" cy="10" r="3" fill="var(--c-bg)" />
          </svg>
        </span>
      </div>
      {mapsEnabled && mapLat != null && mapLng != null && (
        <GoogleMapLayer
          key={bundle.card.themeId}
          lat={mapLat}
          lng={mapLng}
          label={`Map of ${address ?? "the studio"}`}
          backgroundVar="--c-bg"
          pinFill="var(--c-accent)"
          pinRing="var(--c-bg)"
          onReady={() => setLive(true)}
          onFailed={() => setLive(false)}
        />
      )}
    </div>
  );
}

export function QuietMap() {
  const { bundle } = useCard();
  const L = useLabels();
  const uid = useId();
  const c = bundle.card;
  if (!c.address?.trim()) return null;
  return (
    <section aria-labelledby={`${uid}-h`} className="flex flex-col gap-5">
      <SectionHeading tone="background" id={`${uid}-h`}>
        {L.findUs}
      </SectionHeading>
      <LineMap />
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <address className="max-w-[34ch] text-[15px] leading-normal text-c-on-bg-muted not-italic">{c.address}</address>
        {c.showDirections && (
          <a href={directionsUrl(c)} target="_blank" rel="noreferrer" className={cn(OUTLINE, "h-11 px-4 text-[15px]")}>
            <Navigation aria-hidden className="size-4" strokeWidth={2} />
            {L.directions}
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------- Ruled lists */

type Row = { key: string; icon: ReactNode; label: string; value: ReactNode; href: string; external?: boolean };

const HANDLE_PLATFORMS = new Set(["instagram", "tiktok", "x", "telegram"]);

function socialRow(s: SocialLink): Row {
  const platform = getPlatform(s.platform).label;
  const handle = (() => {
    if (!HANDLE_PLATFORMS.has(s.platform)) return displayHandle(s.url);
    const last = displayHandle(s.url).split("/").filter(Boolean).pop() ?? "";
    return last.startsWith("@") ? last : `@${last}`;
  })();
  return {
    key: s.id,
    icon: <BrandIcon platform={s.platform} className="size-5" />,
    label: s.platform === "website" ? platform : s.label || platform,
    value: s.platform === "website" ? s.label || handle : handle,
    href: s.url,
    external: true,
  };
}

function RuleRow({ r }: { r: Row }) {
  return (
    <li className="border-b border-c-bg-line">
      <a
        href={r.href}
        target={r.external ? "_blank" : undefined}
        rel={r.external ? "noreferrer" : undefined}
        className="group flex min-h-[64px] items-center gap-4 py-3"
      >
        <span className="flex size-5 shrink-0 items-center justify-center text-c-on-bg-muted">{r.icon}</span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[13px] leading-tight text-c-on-bg-muted">{r.label}</span>
          <span className="text-base leading-snug text-c-on-bg [overflow-wrap:anywhere]">{r.value}</span>
        </span>
        {r.external ? (
          <ArrowUpRight aria-hidden className="size-4 shrink-0 text-c-on-bg-muted transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none" />
        ) : (
          <ArrowRight aria-hidden className="size-4 shrink-0 text-c-on-bg-muted transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none" />
        )}
        {r.external && <span className="sr-only"> (opens in a new tab)</span>}
      </a>
    </li>
  );
}

/**
 * Contact as a ruled list: email, phone and, when Social links sit right
 * after Contact, the socials too; Save to contacts closes it.
 */
export function ContactRules({ withSocials }: { withSocials: boolean }) {
  const { bundle } = useCard();
  const { saveContact } = useContactActions();
  const L = useLabels();
  const uid = useId();
  const c = bundle.card;
  const rows: Row[] = [];
  if (c.email) rows.push({ key: "email", icon: <Mail aria-hidden className="size-5" strokeWidth={1.75} />, label: L.email, value: <BreakableEmail value={c.email} />, href: `mailto:${c.email}` });
  if (c.phone) rows.push({ key: "phone", icon: <Phone aria-hidden className="size-5" strokeWidth={1.75} />, label: L.phone, value: <span className="tabular-nums">{c.phone}</span>, href: `tel:${phoneDigits(c.phone)}` });
  if (withSocials) bundle.socials.filter((s) => s.visible).forEach((s) => rows.push(socialRow(s)));

  return (
    <section aria-labelledby={`${uid}-h`} className="flex flex-col gap-4">
      <SectionHeading tone="background" id={`${uid}-h`}>
        {L.contactDetails}
      </SectionHeading>
      <ul className="flex flex-col border-t border-c-bg-line">
        {rows.map((r) => (
          <RuleRow key={r.key} r={r} />
        ))}
        <li className="border-b border-c-bg-line">
          <button type="button" onClick={saveContact} className="group flex min-h-[64px] w-full cursor-pointer items-center gap-4 py-3 text-left text-c-accent">
            <UserPlus aria-hidden className="size-5 shrink-0" strokeWidth={1.75} />
            <span className="flex-1 text-base font-semibold">{L.saveToContacts}</span>
            <ArrowRight aria-hidden className="size-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none" />
          </button>
        </li>
      </ul>
    </section>
  );
}

/** Social links on their own (when Contact isn't right before them). */
export function SocialRules() {
  const { bundle } = useCard();
  const L = useLabels();
  const uid = useId();
  const links = bundle.socials.filter((s) => s.visible);
  if (!links.length) return null;
  return (
    <section aria-labelledby={`${uid}-h`} className="flex flex-col gap-4">
      <SectionHeading tone="background" id={`${uid}-h`}>
        {L.socialProfiles}
      </SectionHeading>
      <ul className="flex flex-col border-t border-c-bg-line">
        {links.map((s) => (
          <RuleRow key={s.id} r={socialRow(s)} />
        ))}
      </ul>
    </section>
  );
}
