"use client";

import { BRAND } from "@/lib/brand";
import { Monitor, Smartphone, Tablet } from "lucide-react";
import { useMemo, useState } from "react";
import type { CardBundle } from "@/lib/types";
import { getTheme } from "@/templates/registry";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/controls";
import { DevicePreview, DEVICES, type Device } from "@/components/ui/device-preview";
import { Dialog } from "@/components/ui/dialog";
import { CardRenderer } from "@/components/card/card-renderer";
import { itemBundle, itemLook, type TemplateItem } from "./template-items";

const DEVICE_OPTIONS = [
  { value: "phone" as const, label: "Phone", icon: <Smartphone aria-hidden /> },
  { value: "tablet" as const, label: "Tablet", icon: <Tablet aria-hidden /> },
  { value: "desktop" as const, label: "Desktop", icon: <Monitor aria-hidden /> },
];

/** Full-size, interactive preview of a template with a phone/tablet/desktop toggle. */
export function TemplatePreviewDialog({
  item,
  themeId,
  card,
  open,
  onOpenChange,
  onApply,
}: {
  item: TemplateItem | null;
  themeId?: string;
  /** The card that "Apply" targets; offered as preview content next to the sample. */
  card?: CardBundle | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onApply?: () => void;
}) {
  const [device, setDevice] = useState<Device>("phone");
  const [content, setContent] = useState<"sample" | "card">("sample");
  const bundle = useMemo(
    () => (item ? itemBundle(item, themeId, content === "card" && card ? card : undefined) : null),
    [item, themeId, content, card],
  );
  if (!item || !bundle) return <Dialog open={false} onOpenChange={onOpenChange} title="" />;
  const theme = getTheme(item.manifest.id, itemLook(item, themeId).themeId);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="full"
      title={`${item.name} preview`}
      description={`${theme.name} theme. Scroll, tap photos and open the share sheet: it’s the real card.`}
    >
      <div className="flex flex-wrap items-center gap-3 pb-4">
        <Segmented<Device> label="Preview size" value={device} onChange={setDevice} options={DEVICE_OPTIONS} />
        {card && (
          <Segmented<"sample" | "card">
            label="Preview content"
            value={content}
            onChange={setContent}
            options={[
              { value: "sample", label: "Sample card" },
              { value: "card", label: card.card.name },
            ]}
            className="max-w-full [&_button]:max-w-[220px] [&_button]:truncate"
          />
        )}
        {onApply && card && (
          <Button variant="primary" className="ml-auto" onClick={onApply}>
            Apply to {card.card.name}
          </Button>
        )}
      </div>
      <div className="flex min-h-[420px] flex-1 rounded-xl bg-studio-sunken p-4">
        <DevicePreview device={device} urlLabel={`${BRAND.domain}/c/${bundle.card.slug}`}>
          <CardRenderer key={`${item.key}-${device}-${content}`} bundle={bundle} mode="preview" viewportHeight={`${DEVICES[device].h}px`} />
        </DevicePreview>
      </div>
    </Dialog>
  );
}

/** Up to three templates side by side at phone size, all showing the same real card. */
export function CompareDialog({
  items,
  card,
  open,
  onOpenChange,
  onApply,
  onRemove,
}: {
  items: TemplateItem[];
  card: CardBundle | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onApply: (item: TemplateItem) => void;
  onRemove: (key: string) => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="full"
      title={`Compare ${items.length} template${items.length === 1 ? "" : "s"}`}
      description={card ? `Each phone shows ${card.card.name}’s real content.` : "Each phone shows the template’s sample card."}
    >
      <ul className="-mx-6 flex min-h-0 flex-1 snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-2 lg:grid lg:grid-cols-3 lg:overflow-visible">
        {items.map((it) => (
          <CompareColumn key={it.key} item={it} card={card} onApply={() => onApply(it)} onRemove={() => onRemove(it.key)} canRemove={items.length > 1} />
        ))}
      </ul>
    </Dialog>
  );
}

function CompareColumn({ item, card, onApply, onRemove, canRemove }: { item: TemplateItem; card: CardBundle | null; onApply: () => void; onRemove: () => void; canRemove: boolean }) {
  const bundle = useMemo(() => itemBundle(item, undefined, card ?? undefined), [item, card]);
  const current = card?.card.templateId === item.manifest.id && !item.saved;
  return (
    <li className="flex min-h-[560px] w-[min(340px,82vw)] shrink-0 snap-start flex-col gap-3 lg:w-auto">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-col">
          <h3 className="truncate text-base font-semibold">{item.name}</h3>
          <p className="text-2xs text-studio-ink-3">
            {item.manifest.category}
            {current && " · Current template"}
          </p>
        </div>
        <div className="flex shrink-0 gap-1.5">
          {canRemove && (
            <Button size="sm" variant="ghost" onClick={onRemove}>
              Remove
            </Button>
          )}
          {card && (
            <Button size="sm" variant="primary" onClick={onApply} disabled={current}>
              Apply
            </Button>
          )}
        </div>
      </div>
      <div className="flex min-h-0 flex-1 rounded-xl bg-studio-sunken p-3">
        <DevicePreview device="phone">
          <CardRenderer bundle={bundle} mode="preview" viewportHeight="844px" />
        </DevicePreview>
      </div>
    </li>
  );
}
