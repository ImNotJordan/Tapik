"use client";

import { useEffect, useRef, useState } from "react";
import { MAP_ID, isDarkColor, mapsLibrary, onMapsAuthFailure, pinElement } from "@/lib/maps/google";
import { cn } from "@/lib/utils";

type Props = {
  lat: number;
  lng: number;
  /** Accessible name, e.g. "Map of 12 Ayala Ave". */
  label: string;
  /** CSS variable of the colour behind the map: picks Google's light or dark style. */
  backgroundVar: string;
  /** Pin colours (any CSS colour; theme variables work, the marker lives inside the card). */
  pinFill?: string;
  pinRing?: string;
  /** Starting zoom. */
  zoom?: number;
  /** When the pin is moved from outside (an address was picked), zoom in to at least this. */
  focusZoom?: number;
  /**
   * Editor: no marker; the caller draws a pin fixed at the middle and moving the
   * map moves the pin. onMove gets the new middle each time the map settles.
   */
  centerPin?: boolean;
  onMove?: (pos: { lat: number; lng: number }) => void;
  onReady?: () => void;
  /** Google refused the key (site not allowed, API off): the stand-in should show again. */
  onFailed?: () => void;
  className?: string;
};

const round6 = (n: number) => Math.round(n * 1e6) / 1e6;
const same = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => Math.abs(a.lat - b.lat) < 2e-6 && Math.abs(a.lng - b.lng) < 2e-6;

/**
 * A live Google map over the drawn stand-in. Loads only when it scrolls near the
 * viewport (each load is billed), fades in once the tiles are drawn, and stays
 * invisible if Google refuses the key, so the stand-in keeps showing.
 */
export function GoogleMapLayer({ lat, lng, label, backgroundVar, pinFill = "red", pinRing = "white", zoom = 16, focusZoom, centerPin, onMove, onReady, onFailed, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const marker = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const latest = useRef({ lat, lng, label, zoom, centerPin, onMove, onReady, onFailed });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    latest.current = { lat, lng, label, zoom, centerPin, onMove, onReady, onFailed };
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let cancelled = false;
    // A refusal is final: Google draws its own error box in the map, which must never show.
    let refused = false;
    const offAuth = onMapsAuthFailure(() => {
      refused = true;
      setReady(false);
      latest.current.onFailed?.();
    });

    const start = async () => {
      try {
        const [{ Map }, { AdvancedMarkerElement }, { ColorScheme, event }] = await Promise.all([
          mapsLibrary("maps"),
          mapsLibrary("marker"),
          mapsLibrary("core"),
        ]);
        if (cancelled || refused) return;
        const { lat: la, lng: ln, zoom: z } = latest.current;
        const dark = isDarkColor(getComputedStyle(el).getPropertyValue(backgroundVar));
        const m = new Map(el, {
          center: { lat: la, lng: ln },
          zoom: z,
          mapId: MAP_ID,
          colorScheme: dark ? ColorScheme.DARK : ColorScheme.LIGHT,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: "cooperative", // one finger scrolls the card, two move the map
          clickableIcons: false,
          keyboardShortcuts: Boolean(latest.current.centerPin), // editor: arrow keys move the map (and the pin)
        });
        if (latest.current.centerPin) {
          // The middle is the pin. Report it when the map settles somewhere new
          // (a pan from a picked address lands exactly on the pin, so it isn't echoed back).
          m.addListener("idle", () => {
            const c = m.getCenter();
            if (!c) return;
            const next = { lat: round6(c.lat()), lng: round6(c.lng()) };
            if (same(next, latest.current)) return;
            latest.current.onMove?.(next);
          });
        } else {
          marker.current = new AdvancedMarkerElement({
            map: m,
            position: { lat: la, lng: ln },
            content: pinElement(pinFill, pinRing, latest.current.label),
            title: latest.current.label,
          });
        }
        event.addListenerOnce(m, "tilesloaded", () => {
          if (cancelled || refused) return;
          setReady(true);
          latest.current.onReady?.();
        });
        map.current = m;
      } catch {
        // No key, blocked script or offline: the stand-in stays.
      }
    };

    const io = new IntersectionObserver(
      ([e]) => {
        if (!e?.isIntersecting || refused) return;
        io.disconnect();
        void start();
      },
      { rootMargin: "300px" },
    );
    io.observe(el);
    return () => {
      cancelled = true;
      io.disconnect();
      offAuth();
      if (marker.current) marker.current.map = null;
      marker.current = null;
      map.current = null;
      el.replaceChildren();
      setReady(false);
    };
  }, [backgroundVar, pinFill, pinRing]);

  // The pin moved from outside (an address was picked): follow it. A move made on
  // this map already has the pin in the middle, so nothing pans.
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    if (marker.current) marker.current.position = { lat, lng };
    const c = m.getCenter();
    if (c && same({ lat: c.lat(), lng: c.lng() }, { lat, lng })) return;
    m.panTo({ lat, lng });
    if (focusZoom && (m.getZoom() ?? 0) < focusZoom) m.setZoom(focusZoom);
  }, [lat, lng, focusZoom]);

  return (
    <div
      ref={ref}
      role="region"
      aria-label={label}
      aria-hidden={!ready || undefined}
      className={cn("absolute inset-0 transition-opacity duration-500 motion-reduce:transition-none", ready ? "opacity-100" : "pointer-events-none opacity-0", className)}
    />
  );
}
