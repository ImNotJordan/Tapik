"use client";

import { BRAND } from "@/lib/brand";
import Link from "next/link";
import { ChevronLeft, ExternalLink, Monitor, Smartphone, Tablet } from "lucide-react";
import { useState } from "react";
import type { CardBundle } from "@/lib/types";
import { publicCardPath } from "@/lib/utils";
import { LinkButton } from "@/components/ui/button";
import { Segmented, StatusBadge } from "@/components/ui/controls";
import { DEVICES, DevicePreview, type Device } from "@/components/ui/device-preview";
import { CardRenderer } from "@/components/card/card-renderer";

/** Draft preview at real device sizes, with the studio chrome kept out of the way. */
export function FullPreview({ bundle }: { bundle: CardBundle }) {
  const { card } = bundle;
  const [device, setDevice] = useState<Device>("phone");
  return (
    <div className="flex h-dvh flex-col bg-studio-sunken">
      <header className="flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-3 border-b border-studio-line bg-studio-surface px-3 py-2 sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href={`/admin/cards/${card.id}`}
            className="inline-flex h-9 shrink-0 items-center gap-1 rounded-lg pr-2.5 pl-1.5 text-sm font-medium text-studio-ink-2 hover:bg-studio-raised hover:text-studio-ink"
          >
            <ChevronLeft aria-hidden className="size-[18px]" />
            Back to editor
          </Link>
          <span aria-hidden className="h-5 w-px bg-studio-line" />
          <h1 className="truncate px-1 text-[15px] font-semibold">Preview: {card.name}</h1>
          <StatusBadge status={card.status} />
        </div>
        <Segmented<Device>
          label="Preview device"
          size="sm"
          value={device}
          onChange={setDevice}
          options={[
            { value: "phone", label: "Phone", icon: <Smartphone aria-hidden /> },
            { value: "tablet", label: "Tablet", icon: <Tablet aria-hidden /> },
            { value: "desktop", label: "Desktop", icon: <Monitor aria-hidden /> },
          ]}
        />
        {card.status === "published" ? (
          <LinkButton href={publicCardPath(card.slug)} target="_blank" size="sm" icon={<ExternalLink aria-hidden className="size-4" />}>
            Open public page
          </LinkButton>
        ) : (
          <span className="text-2xs text-studio-ink-3">Draft: not visible to the public yet</span>
        )}
      </header>
      <div className="flex min-h-0 flex-1 p-4 sm:p-8">
        <DevicePreview device={device} urlLabel={`${BRAND.domain}${publicCardPath(card.slug)}`}>
          <CardRenderer bundle={bundle} mode="preview" viewportHeight={`${DEVICES[device].h}px`} />
        </DevicePreview>
      </div>
    </div>
  );
}
