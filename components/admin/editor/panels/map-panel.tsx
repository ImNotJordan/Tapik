"use client";

import { MapPin } from "lucide-react";
import { useState } from "react";
import { directionsUrl, geocodeAddress } from "@/lib/services/card-utils";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/controls";
import { useToast } from "@/components/ui/toast";
import { useEditor } from "../editor-context";
import { BoundField, PanelHeader } from "../fields";

export function MapPanel() {
  const { card, patch } = useEditor();
  const toast = useToast();
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasPin = card.mapLat != null && card.mapLng != null;

  const locate = async () => {
    setLocating(true);
    setError(null);
    const res = await geocodeAddress(card.address ?? "");
    setLocating(false);
    if (!res.ok) return setError(res.error);
    patch({ mapLat: res.data.lat, mapLng: res.data.lng });
    toast.success("Pin placed", { description: "Check that it matches the entrance." });
  };

  return (
    <div className="flex flex-col gap-6">
      <PanelHeader title="Map" description="The map section shows when there’s an address. Visitors can open directions in their maps app." />

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

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold">Pin</p>
          <Button size="sm" loading={locating} onClick={locate} disabled={!card.address?.trim()} icon={<MapPin aria-hidden className="size-4" />}>
            {hasPin ? "Place pin again" : "Place pin from address"}
          </Button>
        </div>
        <div
          role="img"
          aria-label={hasPin ? `Pin at ${card.mapLat?.toFixed(4)}, ${card.mapLng?.toFixed(4)}` : "No pin yet"}
          className="relative h-48 overflow-hidden rounded-xl border border-studio-line bg-studio-raised"
        >
          {/* Survey-style grid: this is a map stand-in until a provider is connected (getMapEmbed). */}
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
        {error ? (
          <p className="text-2xs font-medium text-studio-danger-ink">{error}</p>
        ) : hasPin ? (
          <p className="text-2xs text-studio-ink-3 tabular-nums">
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
