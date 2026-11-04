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
  pinFill: string;
  pinRing: string;
  zoom?: number;
  /** Editor only: the pin can be dragged to the exact entrance. */
  onMove?: (pos: { lat: number; lng: number }) => void;
  onReady?: () => void;
  /** Google refused the key (site not allowed, API off): the stand-in should show again. */
  onFailed?: () => void;
  className?: string;
};

/**
 * A live Google map over the drawn stand-in. Loads only when it scrolls near the
 * viewport (each load is billed), fades in once the tiles are drawn, and stays
 * invisible if Google refuses the key, so the stand-in keeps showing.
 */
export function GoogleMapLayer({ lat, lng, label, backgroundVar, pinFill, pinRing, zoom = 16, onMove, onReady, onFailed, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const marker = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const latest = useRef({ lat, lng, label, onMove, onReady, onFailed });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    latest.current = { lat, lng, label, onMove, onReady, onFailed };
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
        const { lat: la, lng: ln } = latest.current;
        const dark = isDarkColor(getComputedStyle(el).getPropertyValue(backgroundVar));
        const m = new Map(el, {
          center: { lat: la, lng: ln },
          zoom,
          mapId: MAP_ID,
          colorScheme: dark ? ColorScheme.DARK : ColorScheme.LIGHT,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: "cooperative", // one finger scrolls the card, two move the map
          clickableIcons: false,
          keyboardShortcuts: false,
        });
        const draggable = Boolean(latest.current.onMove);
        const mk = new AdvancedMarkerElement({
          map: m,
          position: { lat: la, lng: ln },
          content: pinElement(pinFill, pinRing, latest.current.label),
          title: draggable ? "Drag the pin to the entrance" : latest.current.label,
          gmpDraggable: draggable,
        });
        if (draggable) {
          mk.addListener("dragend", () => {
            const p = mk.position;
            if (!p) return;
            const pos = typeof p.lat === "function" ? { lat: (p as google.maps.LatLng).lat(), lng: (p as google.maps.LatLng).lng() } : (p as google.maps.LatLngLiteral);
            latest.current.onMove?.({ lat: pos.lat, lng: pos.lng });
          });
        }
        event.addListenerOnce(m, "tilesloaded", () => {
          if (cancelled || refused) return;
          setReady(true);
          latest.current.onReady?.();
        });
        map.current = m;
        marker.current = mk;
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
  }, [backgroundVar, pinFill, pinRing, zoom]);

  // The pin moved (placed from the address, or dragged in the editor): follow it.
  useEffect(() => {
    if (!map.current || !marker.current) return;
    marker.current.position = { lat, lng };
    map.current.panTo({ lat, lng });
  }, [lat, lng]);

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
