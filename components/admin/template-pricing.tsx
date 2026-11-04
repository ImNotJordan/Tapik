"use client";

import { Lock, Star } from "lucide-react";
import { useMemo, useState } from "react";
import { allTemplatePricing, OPEN_REQUEST, templatePricing, type PricingSettings } from "@/lib/entitlements";
import type { MockDB } from "@/lib/mock";
import { basePrice, formatPeso } from "@/lib/pricing";
import { useDB } from "@/lib/services/data";
import { cardsOnDefault, pricingOf, savePricing, setDefaultTemplate } from "@/lib/services/templates";
import type { PricingOverrides, TemplateTier } from "@/lib/types";
import { cn } from "@/lib/utils";
import { getTemplate, TEMPLATES } from "@/templates/registry";
import { getPreview } from "@/templates/previews";
import type { TemplateManifest } from "@/templates/types";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/controls";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { AccessBadge, type TileState } from "@/components/templates/access-badge";
import { TemplateThumbnail } from "@/components/templates/template-thumbnail";
import { PageHeader } from "./studio-shell";

/** Editable state: raw strings so a half-typed price never jumps. */
type Draft = { tiers: Record<string, TemplateTier>; prices: Record<string, string> };

function draftFrom(settings: PricingSettings): Draft {
  const tiers: Record<string, TemplateTier> = {};
  const prices: Record<string, string> = {};
  for (const p of allTemplatePricing(settings)) {
    if (p.isDefault) continue;
    tiers[p.templateId] = p.tier;
    prices[p.templateId] = String(p.price ?? settings.overrides[p.templateId]?.price ?? basePrice(p.templateId));
  }
  return { tiers, prices };
}

const validPrice = (s: string) => /^\d+$/.test(s.trim()) && Number(s) >= 1;

/** Only what differs from lib/pricing.ts is stored as an override. */
function overridesFrom(d: Draft): PricingOverrides {
  const out: PricingOverrides = {};
  for (const [id, tier] of Object.entries(d.tiers)) {
    if (tier === "free") out[id] = { tier: "free" };
    else if (validPrice(d.prices[id]) && Number(d.prices[id]) !== basePrice(id)) out[id] = { tier: "paid", price: Number(d.prices[id]) };
  }
  return out;
}

export function TemplatePricingSettings() {
  const { db, hydrated } = useDB();
  return (
    <div className="mx-auto flex max-w-[1240px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
      <PageHeader
        title="Templates & pricing"
        description="One template is the Default and free for every client. Choose which other templates clients pay for, and how much. Prices are one time per card, in pesos. Color themes are always free."
      />
      {hydrated ? (
        // Remount after a save or a new Default so the draft starts from what was stored.
        <PricingEditor key={`${db.library.defaultTemplateId}:${JSON.stringify(db.pricing)}`} db={db} />
      ) : (
        <div aria-busy="true" aria-label="Loading prices" className="flex flex-col gap-3">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="skeleton h-24 rounded-xl" />
          ))}
        </div>
      )}
    </div>
  );
}

function PricingEditor({ db }: { db: MockDB }) {
  const toast = useToast();
  const settings = pricingOf(db);
  const initial = useMemo(() => draftFrom(settings), [settings]);
  const [draft, setDraft] = useState<Draft>(initial);
  const [focus, setFocus] = useState(() => TEMPLATES.find((t) => t.id !== settings.defaultTemplateId)!.id);
  const [busy, setBusy] = useState(false);
  const [announce, setAnnounce] = useState("");
  const [makeDefault, setMakeDefault] = useState<TemplateManifest | null>(null);

  const next = useMemo(() => overridesFrom(draft), [draft]);
  const dirty = JSON.stringify(next) !== JSON.stringify(overridesFrom(initial));
  const invalid = Object.entries(draft.tiers).filter(([id, t]) => t === "paid" && !validPrice(draft.prices[id])).length;
  const preview: PricingSettings = { defaultTemplateId: settings.defaultTemplateId, overrides: next };

  const stats = useMemo(() => {
    const m = new Map<string, { requests: number; open: number; cards: number }>();
    const get = (id: string) => m.get(id) ?? (m.set(id, { requests: 0, open: 0, cards: 0 }), m.get(id)!);
    db.templateRequests.forEach((r) => {
      const s = get(r.templateId);
      s.requests++;
      if (OPEN_REQUEST.includes(r.status)) s.open++;
    });
    db.cards.forEach((c) => c.clientId && get(c.templateId).cards++);
    return m;
  }, [db.templateRequests, db.cards]);

  const save = async () => {
    if (invalid) {
      toast.error("Some prices need fixing", { description: "Prices are whole pesos, 1 or more." });
      return;
    }
    setBusy(true);
    const res = await savePricing(next);
    setBusy(false);
    if (!res.ok) return toast.error("Prices weren’t saved", { description: res.error });
    const g = res.data.grandfathered;
    toast.success("Prices saved", { description: g ? `${g} client card${g === 1 ? "" : "s"} already on a template that’s now paid keep${g === 1 ? "s" : ""} it, unlocked.` : "Clients see the new prices right away." });
    setAnnounce("Prices saved");
  };

  const sorted = [getTemplate(settings.defaultTemplateId), ...TEMPLATES.filter((t) => t.id !== settings.defaultTemplateId)];

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
      <p aria-live="polite" className="sr-only">
        {announce}
      </p>
      <ul aria-label="Templates" className="flex min-w-0 flex-col divide-y divide-studio-line overflow-hidden rounded-2xl border border-studio-line bg-studio-surface">
        {sorted.map((t) => (
          <TemplateRow
            key={t.id}
            tpl={t}
            isDefault={t.id === settings.defaultTemplateId}
            tier={draft.tiers[t.id] ?? "free"}
            price={draft.prices[t.id] ?? ""}
            stat={stats.get(t.id) ?? { requests: 0, open: 0, cards: 0 }}
            onTier={(v) => setDraft((d) => ({ ...d, tiers: { ...d.tiers, [t.id]: v } }))}
            onPrice={(v) => setDraft((d) => ({ ...d, prices: { ...d.prices, [t.id]: v } }))}
            onMakeDefault={() => setMakeDefault(t)}
            onFocus={() => t.id !== settings.defaultTemplateId && setFocus(t.id)}
          />
        ))}
      </ul>

      <aside aria-labelledby="pv-h" className="flex flex-col gap-4 rounded-2xl border border-studio-line bg-studio-surface p-4 sm:p-5 lg:sticky lg:top-6">
        <ClientPreview tpl={getTemplate(focus)} settings={preview} />
      </aside>

      <div
        className={cn(
          "sticky bottom-0 z-20 -mx-4 flex flex-wrap items-center justify-end gap-2 border-t border-studio-line bg-studio-bg/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:col-span-2 lg:-mx-10 lg:px-10",
          !dirty && "hidden",
        )}
      >
        <p className="mr-auto text-sm text-studio-ink-2">{invalid ? `${invalid} price${invalid === 1 ? " needs" : "s need"} fixing` : "Unsaved changes"}</p>
        <Button onClick={() => setDraft(initial)} disabled={busy}>
          Discard
        </Button>
        <Button variant="primary" onClick={save} loading={busy}>
          {busy ? "Saving" : "Save prices"}
        </Button>
      </div>

      <MakeDefaultDialog tpl={makeDefault} db={db} dirty={dirty} onClose={() => setMakeDefault(null)} onDone={(msg) => setAnnounce(msg)} />
    </div>
  );
}

function TemplateRow({
  tpl,
  isDefault,
  tier,
  price,
  stat,
  onTier,
  onPrice,
  onMakeDefault,
  onFocus,
}: {
  tpl: TemplateManifest;
  isDefault: boolean;
  tier: TemplateTier;
  price: string;
  stat: { requests: number; open: number; cards: number };
  onTier: (v: TemplateTier) => void;
  onPrice: (v: string) => void;
  onMakeDefault: () => void;
  onFocus: () => void;
}) {
  const thumb = getPreview(tpl.id);
  const meta = [
    stat.requests ? `${stat.requests} request${stat.requests === 1 ? "" : "s"}${stat.open ? `, ${stat.open} open` : ""}` : "No requests yet",
    stat.cards ? `${stat.cards} client card${stat.cards === 1 ? "" : "s"}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <li className={cn("flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 sm:px-5", isDefault && "bg-studio-action-soft/40")} onFocus={onFocus} onPointerEnter={onFocus}>
      <span className="shrink-0 overflow-hidden rounded-md border border-studio-line">
        <TemplateThumbnail bundle={thumb} width={390} height={700} scale={0.12} />
      </span>
      <span className="flex min-w-0 flex-1 basis-40 flex-col gap-0.5">
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm font-semibold">{tpl.name}</span>
          {isDefault && (
            <span className="inline-flex h-6 items-center gap-1 rounded-md bg-studio-action px-2 text-2xs font-semibold text-studio-on-action">
              <Star aria-hidden className="size-3" fill="currentColor" />
              Default
            </span>
          )}
        </span>
        <span className="text-2xs text-studio-ink-3">{tpl.category}</span>
        <span className="text-2xs text-studio-ink-3 tabular-nums">{meta}</span>
      </span>
      {isDefault ? (
        <span className="inline-flex min-h-11 items-center text-2xs font-semibold text-studio-success">Default · always free</span>
      ) : (
        <span className="flex flex-wrap items-center gap-2">
          <Segmented<TemplateTier>
            label={`${tpl.name}: free or paid`}
            value={tier}
            onChange={onTier}
            className="[&_button]:h-10"
            options={[
              { value: "free", label: "Free" },
              { value: "paid", label: "Paid", icon: <Lock aria-hidden /> },
            ]}
          />
          {tier === "paid" ? (
            <PriceInput label={`${tpl.name} price in pesos`} value={price} onChange={onPrice} invalid={!validPrice(price)} />
          ) : (
            <span className="w-28 text-2xs text-studio-ink-3">Every client can apply it</span>
          )}
          <Button size="sm" variant="ghost" className="h-11" onClick={onMakeDefault} aria-label={`Set ${tpl.name} as Default`}>
            Set as Default
          </Button>
        </span>
      )}
    </li>
  );
}

function PriceInput({ label, value, onChange, invalid }: { label: string; value: string; onChange: (v: string) => void; invalid: boolean }) {
  return (
    <span className="relative inline-flex w-28 flex-col">
      <span aria-hidden className="pointer-events-none absolute top-[11px] left-3 text-[15px] text-studio-ink-3">
        ₱
      </span>
      <Input aria-label={label} inputMode="numeric" invalid={invalid} value={value} onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, "").slice(0, 6))} className="pl-7 tabular-nums" />
      {invalid && <span className="pt-1 text-2xs font-medium text-studio-danger-ink">1 or more</span>}
    </span>
  );
}

function MakeDefaultDialog({ tpl, db, dirty, onClose, onDone }: { tpl: TemplateManifest | null; db: MockDB; dirty: boolean; onClose: () => void; onDone: (msg: string) => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const old = getTemplate(db.library.defaultTemplateId);
  const onOld = cardsOnDefault(db).length;
  const oldAfter = tpl ? templatePricing(old.id, { defaultTemplateId: tpl.id, overrides: db.pricing }) : null;
  return (
    <Dialog
      open={!!tpl}
      onOpenChange={(v) => !v && onClose()}
      size="sm"
      title={tpl ? `Make ${tpl.name} the Default?` : ""}
      description={tpl ? `${tpl.name} becomes free for every client, and new cards start on it.` : undefined}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            loading={busy}
            onClick={async () => {
              if (!tpl) return;
              setBusy(true);
              const res = await setDefaultTemplate(tpl.id);
              setBusy(false);
              if (!res.ok) return toast.error("The Default wasn’t changed", { description: res.error });
              const k = res.data.kept;
              const msg = `${tpl.name} is now the Default`;
              toast.success(msg, { description: k ? `${k} client card${k === 1 ? "" : "s"} on ${old.name} keep${k === 1 ? "s" : ""} it, unlocked.` : undefined });
              onDone(msg);
              onClose();
            }}
          >
            Make Default
          </Button>
        </>
      }
    >
      {tpl && (
        <ul className="flex flex-col gap-2 text-sm text-studio-ink-2">
          <li>
            {onOld
              ? `${onOld} client card${onOld === 1 ? " is" : "s are"} on ${old.name} now. ${onOld === 1 ? "It keeps" : "They keep"} it: ${old.name} is unlocked for ${onOld === 1 ? "that card" : "those cards"}, free.`
              : `No client cards are on ${old.name} now.`}
          </li>
          {oldAfter && <li>{oldAfter.tier === "paid" ? `${old.name} becomes a paid template at ${formatPeso(oldAfter.price ?? 0)} for everyone else.` : `${old.name} stays free.`}</li>}
          {dirty && <li className="font-medium text-studio-warn-ink">Your unsaved price changes are discarded.</li>}
        </ul>
      )}
    </Dialog>
  );
}

/** How a client sees a template's lock and price, with the prices being edited. */
function ClientPreview({ tpl, settings }: { tpl: TemplateManifest; settings: PricingSettings }) {
  const p = templatePricing(tpl.id, settings);
  const def = templatePricing(settings.defaultTemplateId, settings);
  const states: { state: TileState; caption: string; pricing: typeof p }[] = [
    { state: "free", caption: `${getTemplate(settings.defaultTemplateId).name}, the Default`, pricing: def },
    p.tier === "paid" ? { state: "locked", caption: "Locked, with its price", pricing: p } : { state: "free", caption: "Made free by you", pricing: p },
    { state: "previewing", caption: "Being previewed, not applied", pricing: p },
    { state: "requested", caption: "Requested, waiting on you", pricing: p },
    { state: "unlocked", caption: "Paid or approved", pricing: p },
  ];
  const thumb = getPreview(tpl.id);
  return (
    <>
      <div className="flex flex-col gap-0.5">
        <h2 id="pv-h" className="text-base font-semibold">
          What clients see
        </h2>
        <p className="text-2xs text-studio-ink-3">{tpl.name} in the client’s template picker. Point at a row to preview it; updates as you edit.</p>
      </div>
      <div aria-hidden className="flex gap-3 rounded-xl bg-studio-sunken p-3">
        <span className="shrink-0 overflow-hidden rounded-lg border border-studio-line">
          <TemplateThumbnail bundle={thumb} width={390} height={700} scale={0.2} />
        </span>
        <span className="flex min-w-0 flex-col justify-end gap-1.5">
          <span className="text-sm font-semibold">{tpl.name}</span>
          <span className="text-2xs text-studio-ink-3">{tpl.category}</span>
          <AccessBadge state={p.tier === "paid" ? "locked" : "free"} pricing={p} className="self-start" />
        </span>
      </div>
      <ul className="flex flex-col gap-2">
        {states.map((s) => (
          <li key={s.caption} className="flex items-center justify-between gap-3 text-2xs text-studio-ink-3">
            <span>{s.caption}</span>
            <AccessBadge state={s.state} pricing={s.pricing} />
          </li>
        ))}
      </ul>
      {p.tier === "paid" && (
        <div aria-hidden className="flex flex-col gap-1 rounded-xl border border-studio-line p-4">
          <p className="text-2xs font-semibold text-studio-ink-3">In the unlock sheet</p>
          <p className="text-sm font-semibold">Unlock {tpl.name}</p>
          <p className="text-[1.75rem] leading-none font-semibold tracking-[-0.02em] tabular-nums">{formatPeso(p.price ?? 0)}</p>
          <p className="text-2xs text-studio-ink-3">One time, for this card. All its color themes included.</p>
        </div>
      )}
    </>
  );
}
