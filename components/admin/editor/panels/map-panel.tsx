"use client";

import { MapPin } from "lucide-react";
import { useState } from "react";
import { directionsUrl, geocodeAddress } from "@/lib/services/card-utils";
import { mapsEnabled } from "@/lib/maps/google";
import { GoogleMapLayer } from "@/components/card/google-map";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/controls";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { AddressSearch } from "../address-search";
import { useEditor } from "../editor-context";
import { BoundField, PanelHeader } from "../fields";

/** Where the map opens before there's a pin: Metro Manila. */
const START = { lat: 14.5995, lng: 120.9842 };

export function MapPanel() {
  const { card, patch } = useEditor();
  const toast = useToast();
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasPin = card.mapLat != null && card.mapLng != null;

  const locate = async (address = card.address ?? "", quiet = false) => {
    setLocating(true);
    setError(null);
    const res = await geocodeAddress(address);
    setLocating(false);
    if (!res.ok) return quiet ? undefined : setError(res.error);
    patch({ mapLat: res.data.lat, mapLng: res.data.lng });
    if (!quiet) toast.success("Pin placed", { description: mapsEnabled ? "If it’s off, move the map so the pin sits on the entrance." : "Check that it matches the entrance." });
  };

  return (
    <div className="flex flex-col gap-6">
      <PanelHeader title="Map" description="The map section shows when there’s an address. Visitors can open directions in their maps app." />

      {mapsEnabled ? (
        <AddressSearch
          search
          value={card.address ?? ""}
          near={hasPin ? { lat: card.mapLat!, lng: card.mapLng! } : undefined}
          onText={(v) => patch({ address: v || undefined })}
          onPick={(p) => {
            setError(null);
            patch({ address: p.address, mapLat: p.lat, mapLng: p.lng });
          }}
          // Typed an address and left without picking: find it, but never move a pin that's already set.
          onSettle={(text) => {
            if (!hasPin && text.trim().length >= 8) void locate(text, true);
          }}
        />
      ) : (
        <BoundField
          fieldKey="address"
          label="Address"
          multiline
          rows={3}
          optional
          value={card.address ?? ""}
          onCommit={(v) => patch({ address: v || undefined })}
          hint="Include the building, street and city so the pin lands at the door."
        />
      )}

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold">Pin</p>
          <Button size="sm" loading={locating} onClick={() => void locate()} disabled={!card.address?.trim()} icon={<MapPin aria-hidden className="size-4" />}>
            {hasPin ? "Find address again" : "Find address on map"}
          </Button>
        </div>

        {mapsEnabled ? (
          <div className="relative h-64 overflow-hidden rounded-xl border border-studio-line bg-studio-raised">
            <GoogleMapLayer
              lat={hasPin ? card.mapLat! : START.lat}
              lng={hasPin ? card.mapLng! : START.lng}
              label="Map. Move it so the pin in the middle sits on the entrance."
              backgroundVar="--studio-raised"
              zoom={hasPin ? 17 : 11}
              focusZoom={hasPin ? 17 : undefined}
              centerPin
              onMove={(pos) => {
                setError(null);
                patch({ mapLat: pos.lat, mapLng: pos.lng });
              }}
            />
            {/* The pin is fixed in the middle; the map moves under it. Its tip is the exact spot. */}
            <span aria-hidden className="pointer-events-none absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-full">
              <MapPin className={cn("size-10 fill-studio-action text-studio-surface drop-shadow-[0_3px_4px_rgb(0_0_0/0.35)] transition-opacity", !hasPin && "opacity-60")} strokeWidth={1.5} />
            </span>
            <span aria-hidden className="pointer-events-none absolute top-1/2 left-1/2 z-10 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-studio-ink/60" />
            {!hasPin && (
              <span className="pointer-events-none absolute inset-x-0 bottom-3 z-10 mx-auto w-fit rounded-full bg-studio-surface/95 px-3 py-1 text-2xs font-semibold text-studio-ink shadow-sm">
                Search the address, or move the map to place the pin
              </span>
            )}
          </div>
        ) : (
          <div
            role="img"
            aria-label={hasPin ? `Pin at ${card.mapLat?.toFixed(4)}, ${card.mapLng?.toFixed(4)}` : "No pin yet"}
            className="relative h-48 overflow-hidden rounded-xl border border-studio-line bg-studio-raised"
          >
            {/* Survey-style grid: a map stand-in without a Maps key. */}
            <div
              aria-hidden
              className="absolute inset-0 opacity-60"
              style={{
                backgroundImage:
                  "linear-gradient(var(--studio-line) 1px, transparent 1px), linear-gradient(90deg, var(--studio-line) 1px, transparent 1px)",
                backgroundSize: "32px 32px",
              }}
            />
            <span aria-hidden className="absolute top-[38%] left-[-10%] h-2 w-[120%] -rotate-6 bg-studio-surface" />
            <span aria-hidden className="absolute top-[-10%] left-[56%] h-[120%] w-1.5 rotate-12 bg-studio-surface" />
            {hasPin ? (
              <MapPin aria-hidden className="absolute top-1/2 left-1/2 size-9 -translate-x-1/2 -translate-y-full fill-studio-action text-studio-surface" strokeWidth={1.5} />
            ) : (
              <span className="absolute inset-0 flex items-center justify-center text-sm text-studio-ink-3">No pin yet</span>
            )}
          </div>
        )}

        {error ? (
          <p className="text-2xs font-medium text-studio-danger-ink">{error}</p>
        ) : hasPin ? (
          <p className="text-2xs text-studio-ink-3 tabular-nums">
            {mapsEnabled ? "Move the map so the pin sits on the entrance. " : ""}
            {card.mapLat?.toFixed(5)}, {card.mapLng?.toFixed(5)} ·{" "}
            <a href={directionsUrl(card)} target="_blank" rel="noreferrer" className="font-semibold text-studio-action-ink underline underline-offset-2">
              Check in Google Maps
            </a>
          </p>
        ) : (
          <p className="text-2xs text-studio-ink-3">Without a pin, directions use the address text.</p>
        )}
      </div>

      <Toggle
        label="Show “Get directions” button"
        description="Opens Google Maps or Apple Maps with the route to this address."
        checked={card.showDirections}
        onCheckedChange={(v) => patch({ showDirections: v })}
      />
    </div>
  );
}
