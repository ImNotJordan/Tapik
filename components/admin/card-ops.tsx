"use client";

import { Check, Copy, Download } from "lucide-react";
import { useRef, useState } from "react";
import { downloadQrCode, duplicateCard, markPublished, markUnpublished, publishCard, unpublishCard } from "@/lib/services/cards";
import { getTemplate } from "@/templates/registry";
import type { Card } from "@/lib/types";
import { publicCardUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { QrPreview } from "@/components/ui/qr-preview";
import { useToast } from "@/components/ui/toast";
import { useCopy } from "@/components/card/actions";

/** Publish, unpublish, duplicate and copy-link with consistent toasts. */
export function useCardOps() {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  /**
   * Publish, for the studio and for clients who may publish directly. Template locks are
   * enforced where publishing happens (the publishCard Function, or the mock store).
   * `asClient` hides studio-only details from the client.
   */
  const publish = async (card: Card, opts: { asClient?: boolean } = {}) => {
    setBusy(`publish:${card.id}`);
    const res = await publishCard(card.id);
    setBusy(null);
    if (!res.ok) return toast.error("Couldn’t publish", { description: res.error });
    markPublished(card.id, res.data.publishedAt);
    toast.success(card.status === "published" ? "Changes published" : "Published", {
      description: `Live at ${publicCardUrl(card.slug).replace(/^https?:\/\//, "")}${res.data.comped && !opts.asClient ? `. ${getTemplate(res.data.comped).name} is now unlocked for this card, free.` : ""}`,
    });
  };

  const unpublish = async (card: Card) => {
    setBusy(`unpublish:${card.id}`);
    const res = await unpublishCard(card.id);
    setBusy(null);
    if (!res.ok) return toast.error("Couldn’t unpublish", { description: res.error });
    markUnpublished(card.id);
    toast.success("Unpublished", {
      description: "The link now shows “This card isn’t available”.",
      action: { label: "Undo", onClick: () => publish({ ...card, status: "draft" }) },
    });
  };

  const duplicate = (card: Card) => {
    const copy = duplicateCard(card.id);
    if (copy) toast.success("Card duplicated", { description: `“${copy.name}” is a draft.` });
    return copy;
  };

  const copyLink = async (card: Card) => {
    const url = publicCardUrl(card.slug);
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied", { description: card.status === "draft" ? "It works once the card is published." : url.replace(/^https?:\/\//, "") });
    } catch {
      toast.error("Couldn’t copy the link", { description: url });
    }
  };

  return { publish, unpublish, duplicate, copyLink, busy };
}

/** Confirm before taking a live card offline. */
export function UnpublishDialog({
  card,
  open,
  onOpenChange,
  onConfirm,
}: {
  card: Card | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      title="Unpublish this card?"
      description={
        card
          ? `People who tap ${card.name.split(" ")[0]}’s NFC card or scan the QR code will see “This card isn’t available” until you publish again.`
          : undefined
      }
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Keep it live</Button>
          <Button variant="danger" onClick={onConfirm}>
            Unpublish
          </Button>
        </>
      }
    />
  );
}

export function QrDialog({ card, open, onOpenChange }: { card: Card | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  const svg = useRef<SVGSVGElement>(null);
  const { copied, copy } = useCopy();
  const toast = useToast();
  if (!card) return null;
  const url = publicCardUrl(card.slug);
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      title={`QR code for ${card.name}`}
      description={card.status === "draft" ? "This card is a draft. The code works once you publish." : "Scanning opens the public card."}
      footer={
        <>
          <Button icon={copied ? <Check aria-hidden className="size-4" /> : <Copy aria-hidden className="size-4" />} onClick={() => copy(url)}>
            {copied ? "Copied" : "Copy link"}
          </Button>
          <Button
            variant="primary"
            icon={<Download aria-hidden className="size-4" />}
            onClick={() => {
              if (svg.current) {
                downloadQrCode(svg.current, `${card.slug}-qr`);
                toast.success("QR code downloaded", { description: `${card.slug}-qr.svg` });
              }
            }}
          >
            Download SVG
          </Button>
        </>
      }
    >
      <div className="flex flex-col items-center gap-3 rounded-xl bg-studio-raised p-6">
        <div className="rounded-xl bg-white p-2">
          <QrPreview ref={svg} value={url} size={200} />
        </div>
        <p className="max-w-full truncate text-sm text-studio-ink-2">{url.replace(/^https?:\/\//, "")}</p>
      </div>
    </Dialog>
  );
}
