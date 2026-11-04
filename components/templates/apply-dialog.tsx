"use client";

import { ArrowRight, Check, Info } from "lucide-react";
import { useMemo } from "react";
import { getFontPairing } from "@/lib/design/fonts";
import { applyTemplateAs, undoApply } from "@/lib/services/templates";
import type { Role } from "@/lib/types";
import type { CardBundle } from "@/lib/types";
import { getTemplate, getTheme, type TemplateLook } from "@/templates/registry";
import type { TemplateManifest } from "@/templates/types";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { itemLook, type TemplateItem } from "./template-items";
import { TemplateThumbnail } from "./template-thumbnail";

/** Template-only details: which ones the card has that the new template hides, and which it could show. */
function detailNotes(b: CardBundle, from: TemplateManifest, to: TemplateManifest): { kept: string[]; offered: string[] } {
  const c = b.card;
  const fields: { has: boolean; shows: (m: TemplateManifest) => boolean | undefined; label: string }[] = [
    { has: !!c.hours?.length, shows: (m) => m.supports.hours, label: "opening hours" },
    { has: !!c.services?.length, shows: (m) => m.supports.serviceChips, label: "services" },
    { has: !!c.serviceAreas?.length, shows: (m) => m.supports.serviceAreas, label: "service areas" },
    { has: !!c.bookingUrl, shows: (m) => m.supports.booking, label: "booking link" },
    { has: !!(c.bookingLabel || c.bookingNote), shows: (m) => m.supports.bookingCta, label: "booking button label" },
    { has: !!c.expertiseChips?.length, shows: (m) => m.supports.expertiseChips, label: "expertise chips" },
    { has: !!(c.tagline || c.eyebrow), shows: (m) => m.supports.taglines, label: "tagline and name tag" },
    { has: !!(c.department || c.employeeId), shows: (m) => m.supports.idCard, label: "ID card details" },
    { has: !!c.event, shows: (m) => m.supports.event, label: "event" },
    { has: !!c.backgroundPhotoUrl, shows: (m) => m.supports.coverPhoto, label: "background photo" },
  ];
  return {
    kept: fields.filter((f) => f.has && !f.shows(to)).map((f) => f.label),
    offered: fields.filter((f) => !f.has && f.shows(to) && !f.shows(from) && f.label !== "background photo").map((f) => f.label),
  };
}

const list = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

/**
 * Confirm before applying a template to a card: before/after previews, what
 * changes (look) and what stays (all content). Undo is offered in the toast.
 */
export function ApplyTemplateDialog({
  bundle,
  item,
  themeId,
  open,
  onOpenChange,
  onApplied,
  role = "admin",
  clientName,
}: {
  bundle: CardBundle;
  item: TemplateItem | null;
  themeId?: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onApplied?: () => void;
  /** Applies through canApplyTemplate: clients can't save a locked template; an admin's apply to a client card comps it. */
  role?: Role;
  /** For the comp note in the toast. */
  clientName?: string;
}) {
  const toast = useToast();
  const { card } = bundle;
  const look = useMemo<TemplateLook | null>(() => (item ? itemLook(item, themeId) : null), [item, themeId]);
  const after = useMemo(() => (look ? { ...bundle, card: { ...bundle.card, ...look } } : bundle), [bundle, look]);
  if (!item || !look) return <Dialog open={false} onOpenChange={onOpenChange} title="" />;

  const from = getTemplate(card.templateId);
  const to = item.manifest;
  const theme = getTheme(to.id, look.themeId);
  const fonts = getFontPairing(look.fontPairingId);
  const notes = detailNotes(bundle, from, to);
  const same = card.templateId === look.templateId && card.themeId === look.themeId && card.fontPairingId === look.fontPairingId;

  const apply = () => {
    const res = applyTemplateAs(card.id, look, role);
    if (!res.ok) return toast.error(`Couldn’t apply ${item.name}`, { description: res.error });
    const { prev, comped } = res.data;
    onOpenChange(false);
    onApplied?.();
    toast.success(role === "client" ? `${item.name} applied` : `${item.name} applied to ${card.name}`, {
      description: comped ? `All content was kept. ${item.manifest.name} is now unlocked for ${clientName ?? "the client"} at no charge.` : "All content was kept.",
      action: { label: "Undo", onClick: () => undoApply(card.id, prev, comped ? look.templateId : undefined) },
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={`Apply ${item.name} to ${card.name}?`}
      description="Only the design changes. Nothing you wrote or uploaded is removed."
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Keep {from.name}</Button>
          <Button variant="primary" onClick={apply} disabled={same}>
            {same ? "Already applied" : `Apply ${item.name}`}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-center gap-3 rounded-xl bg-studio-sunken p-4 sm:gap-6">
          <figure className="m-0 flex flex-col items-center gap-2">
            <div className="overflow-hidden rounded-[16px] border-[4px] border-[#141614]">
              <TemplateThumbnail bundle={bundle} scale={0.32} height={640} eager />
            </div>
            <figcaption className="text-2xs text-studio-ink-3">Now: {from.name}</figcaption>
          </figure>
          <ArrowRight aria-hidden className="size-5 shrink-0 text-studio-ink-3" />
          <figure className="m-0 flex flex-col items-center gap-2">
            <div className="overflow-hidden rounded-[16px] border-[4px] border-studio-action">
              <TemplateThumbnail bundle={after} scale={0.32} height={640} eager />
            </div>
            <figcaption className="text-2xs font-semibold text-studio-ink">After: {item.name}</figcaption>
          </figure>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <section aria-labelledby="apply-changes" className="flex flex-col gap-2">
            <h3 id="apply-changes" className="text-sm font-semibold">What changes</h3>
            <ul className="flex flex-col gap-1.5 text-sm text-studio-ink-2">
              <li>
                Colors: {theme.name} theme{card.themeId === "custom" ? " (your custom colors are replaced)" : ""}
              </li>
              <li>Fonts: {fonts.name} ({to.fonts.heading}{to.fonts.body !== to.fonts.heading ? ` + ${to.fonts.body}` : ""})</li>
              <li>Buttons: {look.buttonShape}, {look.buttonFill}</li>
              {to.traits.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </section>
          <section aria-labelledby="apply-kept" className="flex flex-col gap-2">
            <h3 id="apply-kept" className="text-sm font-semibold">What stays</h3>
            <ul className="flex flex-col gap-1.5 text-sm text-studio-ink-2">
              {[
                "Name, title, quote, about and contact details",
                `${bundle.photos.length} photo${bundle.photos.length === 1 ? "" : "s"} and their captions`,
                `${bundle.socials.length} social link${bundle.socials.length === 1 ? "" : "s"}`,
                bundle.orgChart && (bundle.orgChart.mode === "upload" || bundle.orgMembers.length) ? "Organization chart" : "Organization chart settings",
                "Section order and hidden sections",
                "Link, QR code and NFC cards already printed",
              ].map((t) => (
                <li key={t} className="flex gap-2">
                  <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-studio-success" strokeWidth={2.5} />
                  {t}
                </li>
              ))}
            </ul>
          </section>
        </div>

        {(notes.kept.length > 0 || notes.offered.length > 0) && (
          <div className="flex gap-2.5 rounded-lg bg-studio-raised px-3.5 py-3 text-sm text-studio-ink-2">
            <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-studio-ink-3" />
            <p>
              {notes.kept.length > 0 && <>{item.name} doesn’t show the card’s {list(notes.kept)}. They stay saved and come back if you switch again. </>}
              {notes.offered.length > 0 && <>{item.name} can also show {list(notes.offered)}: add them in the editor’s Details tab.</>}
            </p>
          </div>
        )}
      </div>
    </Dialog>
  );
}
