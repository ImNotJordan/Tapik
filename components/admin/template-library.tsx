"use client";

import { BRAND } from "@/lib/brand";
import { ArrowLeft, Columns3, Copy, Eye, FilePlus2, Trash2, Upload, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";
import { useDB } from "@/lib/services/data";
import { cardsOnDefault, importTemplate, patchLibrary, pricingOf, removeSavedTemplate, restoreSavedTemplate, saveTemplate, setDefaultTemplate, toggleFavoriteTemplate } from "@/lib/services/templates";
import { getFontPairing } from "@/lib/design/fonts";
import { bundleFromDB } from "@/lib/mock";
import { templatePricing } from "@/lib/entitlements";
import { formatPeso } from "@/lib/pricing";
import type { TemplatePricing } from "@/lib/types";
import { AccessBadge } from "@/components/templates/access-badge";
import { cn } from "@/lib/utils";
import { getTemplate, getTheme } from "@/templates/registry";
import { Button, LinkButton } from "@/components/ui/button";
import { Badge, Toggle } from "@/components/ui/controls";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { ApplyTemplateDialog } from "@/components/templates/apply-dialog";
import { CompareDialog, TemplatePreviewDialog } from "@/components/templates/preview-dialogs";
import { TemplateBrowser } from "@/components/templates/template-browser";
import { itemLook, templateItems, type TemplateItem } from "@/components/templates/template-items";

const MAX_COMPARE = 3;

/** /admin/templates: browse, preview, compare and apply templates; set what clients can choose. */
export function TemplateLibrary() {
  const { db, hydrated } = useDB();
  const toast = useToast();
  const router = useRouter();
  const params = useSearchParams();
  const lib = db.library;
  const items = useMemo(() => templateItems(lib), [lib]);
  const cards = useMemo(() => [...db.cards].sort((a, b) => b.updated_at.localeCompare(a.updated_at)), [db.cards]);
  const fromCard = params.get("card");
  const [cardId, setCardId] = useState<string | null>(fromCard);
  const targetId = cards.some((c) => c.id === cardId) ? cardId! : cards[0]?.id ?? null;
  const target = useMemo(() => (targetId ? bundleFromDB(db, targetId) : null), [db, targetId]);

  const [selectedKey, setSelectedKey] = useState<string>(() => params.get("template") ?? "");
  const selected = items.find((i) => i.key === selectedKey) ?? items.find((i) => i.key === (target?.card.templateId ?? lib.defaultTemplateId)) ?? items[0];
  const [themeFor, setThemeFor] = useState<{ key: string; themeId: string } | null>(null);
  const previewTheme = themeFor?.key === selected.key ? themeFor.themeId : undefined;

  const [compare, setCompare] = useState<string[] | null>(null);
  const [dialog, setDialog] = useState<null | "apply" | "preview" | "compare" | "duplicate" | "import" | "default">(null);
  const [settingDefault, setSettingDefault] = useState(false);
  const [applyItem, setApplyItem] = useState<TemplateItem | null>(null);
  const panelRef = useRef<HTMLElement>(null);

  const usageMap = useMemo(() => {
    const m = new Map<string, number>();
    db.cards.forEach((c) => m.set(c.templateId, (m.get(c.templateId) ?? 0) + 1));
    return m;
  }, [db.cards]);
  const usage = useCallback((id: string) => usageMap.get(id) ?? 0, [usageMap]);

  const select = (key: string) => {
    setSelectedKey(key);
  };
  const openApply = (it: TemplateItem) => {
    setApplyItem(it);
    setDialog("apply");
  };
  const toggleCompare = (key: string) =>
    setCompare((ks) => (ks ? (ks.includes(key) ? ks.filter((k) => k !== key) : ks.length >= MAX_COMPARE ? ks : [...ks, key]) : [key]));

  const isHidden = (it: TemplateItem) => lib.disabledTemplates.includes(it.manifest.id);
  const compareItems = (compare ?? []).map((k) => items.find((i) => i.key === k)).filter((x): x is TemplateItem => !!x);

  return (
    <div className="mx-auto flex max-w-[1480px] flex-col gap-6 px-4 py-6 pb-28 sm:px-6 lg:px-10 lg:py-8 lg:pb-10">
      <header className="flex flex-col gap-4">
        <LinkButton href={fromCard ? `/admin/cards/${fromCard}?tab=design` : "/admin"} variant="ghost" size="sm" className="-ml-2 self-start" icon={<ArrowLeft aria-hidden className="size-4" />}>
          {fromCard ? "Back to editor" : "Cards"}
        </LinkButton>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-semibold tracking-[-0.02em] sm:text-2xl">Template library</h1>
              <Badge tone="neutral" className="tabular-nums">
                {items.length}
              </Badge>
            </div>
            <p className="max-w-[70ch] text-sm text-studio-ink-3">Every template renders the real card. Pick one to see its themes and fonts, preview it full size, or apply it to a card. Content always stays.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button icon={<Upload aria-hidden className="size-4" />} onClick={() => setDialog("import")}>
              Import template
            </Button>
            <LinkButton href={`/admin/cards/new?template=${encodeURIComponent(lib.defaultTemplateId)}`} variant="primary" icon={<FilePlus2 aria-hidden className="size-4" />}>
              New from blank
            </LinkButton>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <TemplateBrowser
          items={items}
          selectedKey={selected.key}
          onSelect={select}
          favorites={lib.favoriteTemplates}
          onToggleFavorite={(k) => {
            const was = lib.favoriteTemplates.includes(k);
            toggleFavoriteTemplate(k);
            toast.success(was ? "Removed from starred" : "Starred", { duration: 2000 });
          }}
          previewTheme={previewTheme}
          compare={compare ? { keys: compare, max: MAX_COMPARE, onToggle: toggleCompare } : null}
          currentKey={target?.card.templateId}
          hiddenKeys={lib.disabledTemplates}
          usage={usage}
          loading={!hydrated}
          pricing={pricingOf(db)}
          toolbar={
            <Button
              aria-pressed={!!compare}
              icon={compare ? <X aria-hidden className="size-4" /> : <Columns3 aria-hidden className="size-4" />}
              onClick={() => setCompare((c) => (c ? null : [selected.key]))}
              variant={compare ? "primary" : "secondary"}
            >
              {compare ? "Exit compare" : "Compare"}
            </Button>
          }
        />

        <aside ref={panelRef} id="template-details" aria-label={`${selected.name} details`} className="scroll-mt-6 lg:sticky lg:top-6">
          <SidePanel
            item={selected}
            themeId={previewTheme}
            onTheme={(id) => setThemeFor({ key: selected.key, themeId: id })}
            cards={cards.map((c) => ({ id: c.id, name: c.name }))}
            targetId={targetId}
            onTarget={setCardId}
            hidden={isHidden(selected)}
            isDefault={lib.defaultTemplateId === selected.manifest.id && !selected.saved}
            pricing={templatePricing(selected.manifest.id, pricingOf(db))}
            usage={usage(selected.manifest.id)}
            hydrated={hydrated}
            onApply={() => openApply(selected)}
            onPreview={() => setDialog("preview")}
            onDuplicate={() => setDialog("duplicate")}
            onToggleAvailable={(on) => {
              const id = selected.manifest.id;
              if (!on && id === lib.defaultTemplateId) {
                toast.error("The default template can’t be hidden", { description: "Choose another default first." });
                return;
              }
              patchLibrary({ disabledTemplates: on ? lib.disabledTemplates.filter((x) => x !== id) : [...lib.disabledTemplates, id] });
              toast.success(on ? `${selected.manifest.name} is available to clients` : `${selected.manifest.name} is hidden from clients`, {
                description: on ? undefined : usage(id) ? `${usage(id)} card${usage(id) === 1 ? " keeps" : "s keep"} using it.` : "Cards already using it don’t change.",
              });
            }}
            onMakeDefault={() => setDialog("default")}
            onRemoveSaved={() => {
              const removed = selected.saved && removeSavedTemplate(selected.saved.id);
              setSelectedKey(selected.manifest.id);
              if (removed) toast.success(`${removed.name} removed`, { action: { label: "Undo", onClick: () => restoreSavedTemplate(removed) } });
            }}
          />
        </aside>
      </div>

      {/* Phone and tablet: the panel sits below the grid, so keep the main actions in reach. */}
      {!compare && hydrated && (
        <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-2 border-t border-studio-line bg-studio-surface/95 px-4 py-3 lg:hidden">
          <p className="min-w-0 flex-1 truncate text-sm">
            <span className="font-semibold">{selected.name}</span>
            <span className="text-studio-ink-3"> · {selected.manifest.category}</span>
          </p>
          <Button size="sm" onClick={() => panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}>
            Details
          </Button>
          {target && (
            <Button size="sm" variant="primary" onClick={() => openApply(selected)}>
              Apply
            </Button>
          )}
        </div>
      )}

      {compare && (
        <div role="region" aria-label="Compare" className="fixed inset-x-0 bottom-0 z-30 border-t border-studio-line bg-studio-surface/95 px-4 py-3 sm:px-6 lg:pl-[calc(15rem+2.5rem)]">
          <div className="mx-auto flex max-w-[1480px] flex-wrap items-center gap-3">
            <p className="text-sm">
              <span className="font-semibold tabular-nums">
                {compare.length} of {MAX_COMPARE}
              </span>{" "}
              <span className="text-studio-ink-3">selected. {compare.length >= MAX_COMPARE ? "That’s the most that fit side by side." : "Pick up to three."}</span>
            </p>
            <div className="ml-auto flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setCompare([])} disabled={!compare.length}>
                Clear
              </Button>
              <Button size="sm" variant="primary" disabled={compare.length < 2} onClick={() => setDialog("compare")}>
                Compare side by side
              </Button>
            </div>
          </div>
        </div>
      )}

      {target && (
        <ApplyTemplateDialog
          bundle={target}
          item={applyItem}
          themeId={applyItem?.key === selected.key ? previewTheme : undefined}
          open={dialog === "apply"}
          onOpenChange={(v) => !v && setDialog(null)}
          clientName={db.clients.find((c) => c.cardId === target.card.id)?.name}
        />
      )}
      <DefaultDialog
        open={dialog === "default"}
        onOpenChange={(v) => !v && setDialog(null)}
        nextName={selected.manifest.name}
        oldName={getTemplate(lib.defaultTemplateId).name}
        oldPrice={templatePricing(lib.defaultTemplateId, { ...pricingOf(db), defaultTemplateId: selected.manifest.id }).price ?? 0}
        keep={cardsOnDefault(db).length}
        busy={settingDefault}
        onConfirm={async () => {
          setSettingDefault(true);
          const res = await setDefaultTemplate(selected.manifest.id);
          setSettingDefault(false);
          if (!res.ok) return toast.error("Couldn’t change the Default", { description: res.error });
          patchLibrary({ disabledTemplates: lib.disabledTemplates.filter((x) => x !== selected.manifest.id) });
          setDialog(null);
          toast.success(`${selected.manifest.name} is the Default`, {
            description: res.data.kept ? `New cards start with it, free. ${res.data.kept} card${res.data.kept === 1 ? " keeps" : "s keep"} the old Default.` : "New cards start with it, free.",
          });
        }}
      />
      <TemplatePreviewDialog
        item={selected}
        themeId={previewTheme}
        card={target}
        open={dialog === "preview"}
        onOpenChange={(v) => !v && setDialog(null)}
        onApply={target ? () => openApply(selected) : undefined}
      />
      <CompareDialog
        items={compareItems}
        card={target}
        open={dialog === "compare"}
        onOpenChange={(v) => !v && setDialog(null)}
        onApply={openApply}
        onRemove={(k) => setCompare((ks) => (ks ?? []).filter((x) => x !== k))}
      />
      <DuplicateDialog
        key={`${selected.key}-${previewTheme}-${dialog === "duplicate"}`}
        item={selected}
        themeId={previewTheme}
        open={dialog === "duplicate"}
        onOpenChange={(v) => !v && setDialog(null)}
        onSaved={(id, name) => {
          setDialog(null);
          setSelectedKey(id);
          toast.success(`${name} saved`, { description: "It’s in the grid with a Yours badge." });
        }}
      />
      <ImportDialog open={dialog === "import"} onOpenChange={(v) => !v && setDialog(null)} onNewFromBlank={() => router.push("/admin/cards/new")} />
    </div>
  );
}

/* ------------------------------------------------------------- Side panel */

function SidePanel({
  item,
  themeId,
  onTheme,
  cards,
  targetId,
  onTarget,
  hidden,
  isDefault,
  usage,
  hydrated,
  onApply,
  onPreview,
  onDuplicate,
  onToggleAvailable,
  onMakeDefault,
  onRemoveSaved,
  pricing,
}: {
  item: TemplateItem;
  themeId?: string;
  onTheme: (id: string) => void;
  cards: { id: string; name: string }[];
  targetId: string | null;
  onTarget: (id: string) => void;
  hidden: boolean;
  isDefault: boolean;
  usage: number;
  hydrated: boolean;
  onApply: () => void;
  onPreview: () => void;
  onDuplicate: () => void;
  onToggleAvailable: (on: boolean) => void;
  onMakeDefault: () => void;
  onRemoveSaved: () => void;
  pricing: TemplatePricing;
}) {
  const m = item.manifest;
  const look = itemLook(item, themeId);
  const fonts = getFontPairing(look.fontPairingId);
  const target = cards.find((c) => c.id === targetId);
  const extras = [
    m.supports.coverPhoto ? "Background photo" : "No background photo",
    m.supports.orgChartTree && "Team tree",
    m.supports.hours && "Opening hours",
    m.supports.serviceChips && "Services",
    m.supports.serviceAreas && "Service areas",
    m.supports.booking && "Booking button",
    m.supports.expertiseChips && "Expertise chips",
    m.supports.taglines && "Tagline and name tag",
    m.supports.idCard && "Employee ID card",
    m.supports.event && "Event countdown",
  ].filter(Boolean) as string[];

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-studio-line bg-studio-surface p-5">
      <div className="flex flex-col gap-1.5">
        <p className="flex flex-wrap items-center gap-1.5 text-2xs font-semibold text-studio-ink-3">
          {m.category}
          {item.isNew && <Badge tone="warn">New</Badge>}
          {item.saved && <Badge>Yours, from {m.name}</Badge>}
          {!item.saved && <AccessBadge state={pricing.tier === "free" ? "free" : "locked"} pricing={pricing} admin />}
        </p>
        <h2 className="text-xl font-semibold tracking-[-0.015em]">{item.name}</h2>
        <p className="text-sm leading-relaxed text-studio-ink-2">{m.description}</p>
      </div>

      <section aria-labelledby="sp-themes" className="flex flex-col gap-2">
        <h3 id="sp-themes" className="text-sm font-semibold">
          Themes <span className="font-normal text-studio-ink-3">· {getTheme(m.id, look.themeId).name}</span>
        </h3>
        <div role="radiogroup" aria-labelledby="sp-themes" className="flex flex-wrap gap-2">
          {m.themes.map((th) => {
            const active = th.id === look.themeId && !(item.saved?.customTokens && !themeId);
            return (
              <button
                key={th.id}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={`${th.name} theme`}
                title={th.name}
                onClick={() => onTheme(th.id)}
                className={cn(
                  "relative inline-flex size-11 cursor-pointer items-center justify-center rounded-full border-2 transition-[border-color,box-shadow]",
                  active ? "border-studio-action shadow-[0_0_0_3px_var(--studio-action-soft)]" : "border-studio-line hover:border-studio-line-strong",
                )}
              >
                <span aria-hidden className="relative size-8 overflow-hidden rounded-full" style={{ background: th.tokens.background }}>
                  <span className="absolute inset-y-0 right-0 w-1/2" style={{ background: th.tokens.surface }} />
                  <span className="absolute right-[18%] bottom-[18%] size-2.5 rounded-full" style={{ background: th.tokens.primary, boxShadow: `0 0 0 1.5px ${th.tokens.surface}` }} />
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-2xs text-studio-ink-3">Click a swatch to preview it on the thumbnail. Custom colors are set per card in the editor.</p>
      </section>

      <dl className="grid gap-3 border-t border-studio-line pt-4 text-sm">
        <div className="flex flex-col gap-0.5">
          <dt className="text-2xs font-semibold text-studio-ink-3">Fonts</dt>
          <dd>
            <span className="text-lg leading-tight" style={{ fontFamily: fonts.display, fontWeight: fonts.displayWeight, letterSpacing: fonts.displayTracking }}>
              {m.fonts.heading}
            </span>
            <span className="text-studio-ink-2" style={{ fontFamily: fonts.body }}>
              {m.fonts.body !== m.fonts.heading ? ` + ${m.fonts.body}` : ""}
              {m.fonts.mono ? ` + ${m.fonts.mono}` : ""}
            </span>
          </dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-2xs font-semibold text-studio-ink-3">Best for</dt>
          <dd className="text-studio-ink-2">{m.bestFor}</dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-2xs font-semibold text-studio-ink-3">Shows</dt>
          <dd className="flex flex-wrap gap-1.5">
            {extras.map((e) => (
              <Badge key={e}>{e}</Badge>
            ))}
          </dd>
        </div>
      </dl>

      <p className="rounded-lg bg-studio-raised px-3.5 py-3 text-2xs leading-relaxed text-studio-ink-2">
        Switching templates keeps all content: text, photos, social links, the org chart and any details this template doesn’t show.
      </p>

      <div className="flex flex-col gap-2.5">
        {cards.length > 0 ? (
          <>
            <Field label="Apply to">
              {(p) => (
                <Select id={p.id} value={targetId ?? ""} onChange={(e) => onTarget(e.target.value)} disabled={!hydrated}>
                  {cards.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Button variant="primary" size="lg" onClick={onApply} disabled={!hydrated} className="w-full">
              <span className="truncate">Apply to {target?.name ?? "card"}</span>
            </Button>
          </>
        ) : (
          <p className="text-sm text-studio-ink-3">Create a card to apply templates to it.</p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Button icon={<Eye aria-hidden className="size-4" />} onClick={onPreview}>
            Preview full size
          </Button>
          <Button icon={<Copy aria-hidden className="size-4" />} onClick={onDuplicate} disabled={!hydrated}>
            Duplicate
          </Button>
        </div>
      </div>

      <section aria-labelledby="sp-admin" className="flex flex-col gap-3 border-t border-studio-line pt-4">
        <h3 id="sp-admin" className="text-sm font-semibold">
          For clients
        </h3>
        {item.saved ? (
          <Button variant="danger-ghost" size="sm" icon={<Trash2 aria-hidden className="size-4" />} onClick={onRemoveSaved} className="self-start">
            Remove saved template
          </Button>
        ) : (
          <>
            <Toggle
              label="Available for new cards"
              description={hidden && usage ? `Hidden. ${usage} card${usage === 1 ? " still uses" : "s still use"} it.` : `${usage} card${usage === 1 ? "" : "s"} use it now.`}
              checked={!hidden}
              disabled={!hydrated}
              onCheckedChange={onToggleAvailable}
            />
            {isDefault ? (
              <p className="text-2xs text-studio-ink-3">The Default: free for every client, and new cards start with it.</p>
            ) : (
              <div className="flex flex-col gap-1">
                <p className="text-2xs text-studio-ink-3">
                  Clients unlock it for {formatPeso(pricing.price ?? 0)}. Prices are in Templates &amp; pricing.
                </p>
                <Button size="sm" variant="ghost" onClick={onMakeDefault} disabled={!hydrated} className="-ml-3 self-start">
                  Set as Default
                </Button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

/* --------------------------------------------------------------- Dialogs */

function DuplicateDialog({
  item,
  themeId,
  open,
  onOpenChange,
  onSaved,
}: {
  item: TemplateItem;
  themeId?: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: (id: string, name: string) => void;
}) {
  const look = itemLook(item, themeId);
  const theme = getTheme(item.manifest.id, look.themeId);
  const [name, setName] = useState(`${item.manifest.name} ${theme.name}`);
  const [touched, setTouched] = useState(false);
  const error = touched && !name.trim() ? "Give the template a name so admins can find it." : null;
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Duplicate ${item.name}`}
      description="Saves this template with the theme you picked as a new entry in the library. It uses the same layout, so content always fits."
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant="primary"
            onClick={() => {
              setTouched(true);
              if (!name.trim()) return;
              const saved = saveTemplate({ name: name.trim(), baseId: item.manifest.id, ...look, themeId: look.themeId });
              onSaved(saved.id, saved.name);
            }}
          >
            Save template
          </Button>
        </>
      }
    >
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        <Field label="Template name" error={error} hint={`${item.manifest.name} layout, ${theme.name} theme, ${getFontPairing(look.fontPairingId).name} fonts.`}>
          {(p) => <Input id={p.id} aria-describedby={p.describedBy} invalid={p.invalid} autoFocus value={name} onChange={(e) => setName(e.target.value)} onBlur={() => setTouched(true)} />}
        </Field>
      </form>
    </Dialog>
  );
}

function ImportDialog({ open, onOpenChange, onNewFromBlank }: { open: boolean; onOpenChange: (v: boolean) => void; onNewFromBlank: () => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setError(null);
        onOpenChange(v);
      }}
      title="Import a template"
      description={`Template packages come from ${BRAND.name}: a manifest, the card layout and a sample card.`}
      footer={
        <>
          <Button onClick={onNewFromBlank}>Start a card instead</Button>
          <Button variant="primary" icon={<Upload aria-hidden className="size-4" />} onClick={() => input.current?.click()} disabled={busy}>
            {busy ? "Checking file…" : "Choose file"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3 text-sm text-studio-ink-2">
        <p>Upload a .zip or .json template package. It’s checked before it appears in the library.</p>
        <input
          ref={input}
          type="file"
          accept=".zip,.json,application/zip,application/json"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            setBusy(true);
            setError(null);
            const res = await importTemplate(file);
            setBusy(false);
            if (res.ok) {
              toast.success("Template imported");
              onOpenChange(false);
            } else setError(res.error);
          }}
        />
        {error && (
          <p role="alert" className="rounded-lg bg-studio-warn-soft px-3.5 py-3 text-studio-warn-ink">
            {error}
          </p>
        )}
      </div>
    </Dialog>
  );
}

/** Changing the Default is safe: client cards on the old Default keep it. Say so before it happens. */
function DefaultDialog({
  open,
  onOpenChange,
  nextName,
  oldName,
  oldPrice,
  keep,
  busy,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  nextName: string;
  oldName: string;
  oldPrice: number;
  keep: number;
  busy: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      title={`Make ${nextName} the Default?`}
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Keep {oldName}</Button>
          <Button variant="primary" loading={busy} onClick={onConfirm}>
            Set as Default
          </Button>
        </>
      }
    >
      <ul className="flex list-disc flex-col gap-2 pl-5 text-sm text-studio-ink-2">
        <li>{nextName} becomes free for every client, and new cards start with it.</li>
        <li>
          {oldName} becomes a paid template ({formatPeso(oldPrice)}) for new requests.
        </li>
        <li>
          {keep > 0
            ? `${keep} client card${keep === 1 ? " is" : "s are"} on ${oldName} now. ${keep === 1 ? "It keeps" : "They keep"} it: it’s unlocked for ${keep === 1 ? "that card" : "those cards"}.`
            : `No client cards are on ${oldName} now.`}
        </li>
      </ul>
    </Dialog>
  );
}
