"use client";

import { Navigation } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { useCard } from "@/components/card/context";
import { GoogleMapLayer } from "@/components/card/google-map";
import { useLabels } from "@/components/card/labels";
import { mapsEnabled } from "@/lib/maps/google";
import { directionsUrl } from "@/lib/services/card-utils";
import { NumHeading } from "./heading";

/** Same seed as the shared map, so a card's streets stay put between renders. */
function seeded(lat = 10.3, lng = 123.9) {
  let h = Math.floor(Math.abs(lat * 1000 + lng * 7919));
  return () => {
    h = (h * 1103515245 + 12345) & 0x7fffffff;
    return h / 0x7fffffff;
  };
}

const W = 320;
const H = 190;

/**
 * The studio as a site plan: streets as paired lines, a few lots outlined,
 * a ring-and-dot pin in the mark color, a north arrow and a scale bar. A live
 * Google map fades in over it when there's a key and a pin.
 */
export function SitePlan({ n, title }: { n: number; title: string }) {
  const { bundle } = useCard();
  const L = useLabels();
  const uid = useId();
  const { card } = bundle;
  const [live, setLive] = useState(false);
  const plan = useMemo(() => {
    const r = seeded(card.mapLat, card.mapLng);
    const across = Array.from({ length: 2 }, (_, i) => ({ y: 30 + i * 105 + r() * 30, tilt: -8 + r() * 16, w: i === 0 ? 12 : 8 }));
    const down = Array.from({ length: 3 }, (_, i) => ({ x: 34 + i * 110 + r() * 40, tilt: -10 + r() * 20, w: i === 1 ? 12 : 8 }));
    const lots = Array.from({ length: 5 }, () => ({ x: 10 + r() * 270, y: 8 + r() * 140, w: 26 + r() * 30, h: 18 + r() * 22 }));
    return { across, down, lots };
  }, [card.mapLat, card.mapLng]);

  if (!card.address?.trim()) return null;
  // Streets: every edge first, then every carriageway, so crossings read as open junctions.
  const roads = [
    ...plan.across.map((a) => ({ d: `M-20 ${a.y} L${W + 20} ${a.y + a.tilt}`, w: a.w })),
    ...plan.down.map((d) => ({ d: `M${d.x} -20 L${d.x + d.tilt} ${H + 20}`, w: d.w })),
  ];

  return (
    <section aria-labelledby={`${uid}-h`} className="flex flex-col gap-5">
      <NumHeading n={n} id={`${uid}-h`}>
        {title}
      </NumHeading>
      <div className="border-[1.5px] border-c-on-bg p-[5px]">
        <div className="relative aspect-[32/19] overflow-hidden">
          <div role="img" aria-label={`Map showing ${card.address}`} aria-hidden={live || undefined} className="absolute inset-0">
            <svg aria-hidden viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className="size-full" fill="none">
              {plan.lots.map((l, i) => (
                <rect key={i} x={l.x} y={l.y} width={l.w} height={l.h} stroke="var(--bp-line)" strokeWidth="1" strokeDasharray={i % 2 ? "3 3" : undefined} />
              ))}
              {roads.map((r, i) => (
                <path key={`e${i}`} d={r.d} stroke="var(--bp-line)" strokeWidth={r.w + 2} />
              ))}
              {roads.map((r, i) => (
                <path key={`c${i}`} d={r.d} stroke="var(--c-bg)" strokeWidth={r.w} />
              ))}
              {/* North arrow */}
              <g transform={`translate(${W - 26} 24)`} stroke="var(--c-on-bg)" strokeWidth="1.25">
                <circle r="11" />
                <path d="M0 -7 L4 6 L0 3 L-4 6 Z" fill="var(--c-on-bg)" strokeLinejoin="round" />
              </g>
              <text x={W - 26} y="49" textAnchor="middle" fill="var(--c-on-bg)" fontSize="9" fontFamily="var(--c-font-mono)">
                N
              </text>
              {/* Scale bar */}
              <g transform={`translate(14 ${H - 16})`} stroke="var(--c-on-bg)" strokeWidth="1.25">
                <path d="M0 -4 V0 H60 V-4 M30 -3 V0" />
              </g>
              <text x="14" y={H - 24} fill="var(--c-on-bg)" fontSize="8.5" fontFamily="var(--c-font-mono)">
                0
              </text>
              <text x="74" y={H - 24} textAnchor="end" fill="var(--c-on-bg)" fontSize="8.5" fontFamily="var(--c-font-mono)">
                50 m
              </text>
              {/* Ring-and-dot pin with crosshair ticks */}
              <g transform={`translate(${W / 2} ${H / 2})`} stroke="var(--c-accent)" strokeWidth="2">
                <circle r="13" fill="color-mix(in oklab, var(--c-bg) 70%, transparent)" />
                <circle r="4" fill="var(--c-accent)" stroke="none" />
                <path d="M0 -22 V-16 M0 16 V22 M-22 0 H-16 M16 0 H22" strokeLinecap="square" />
              </g>
            </svg>
          </div>
          {mapsEnabled && card.mapLat != null && card.mapLng != null && (
            <GoogleMapLayer
              key={card.themeId}
              lat={card.mapLat}
              lng={card.mapLng}
              label={`Map of ${card.address}`}
              backgroundVar="--c-bg"
              pinFill="var(--c-accent)"
              pinRing="var(--c-bg)"
              onReady={() => setLive(true)}
              onFailed={() => setLive(false)}
            />
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <address className="max-w-[34ch] text-[15px] leading-normal text-[var(--bp-label)] not-italic">{card.address}</address>
        {card.showDirections && (
          <a href={directionsUrl(card)} target="_blank" rel="noreferrer" className="cbtn bp-outline h-11 px-4 text-[15px]">
            <Navigation aria-hidden className="size-4" strokeWidth={2} />
            {L.directions}
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        )}
      </div>
    </section>
  );
}
