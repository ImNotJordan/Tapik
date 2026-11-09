"use client";

import Link from "next/link";
import { ArrowRight, Check, CircleAlert, CircleCheck, Eye, Lock } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { bestOn, formatRatio } from "@/lib/design/contrast";
import { accentGround, contrastChecks, resolveTokens } from "@/lib/design/resolve";
import { useDB } from "@/lib/services/data";
import { cancelRequest, requestTemplate, requestTemplateName } from "@/lib/services/requests";
import { applyThemeOnly, entitlementsFor, pricingOf } from "@/lib/services/templates";
import { openRequestFor, OPEN_REQUEST, templateAccess, templatePricing } from "@/lib/entitlements";
import type { ButtonFill, ButtonShape, TemplatePricing, TemplateRequestStatus, ThemeTokens } from "@/lib/types";
import { cn } from "@/lib/utils";
import { getTemplate } from "@/templates/registry";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Segmented, Toggle } from "@/components/ui/controls";
import { ColorPicker } from "@/components/ui/color-picker";
import { FontPicker } from "@/components/ui/font-picker";
import { useToast } from "@/components/ui/toast";
import { ApplyTemplateDialog } from "@/components/templates/apply-dialog";
import { TemplateBrowser } from "@/components/templates/template-browser";
import { AccessBadge, accessLabel, type TileState } from "@/components/templates/access-badge";
import { PaywallSheet } from "@/components/templates/paywall-sheet";
import { ThemeSwatch } from "@/components/themes/theme-swatch";
import { itemBundle, templateItems, type TemplateItem } from "@/components/templates/template-items";
import { TemplateThumbnail } from "@/components/templates/template-thumbnail";
import { useEditor } from "../editor-context";
import { Divider, PanelHeader } from "../fields";

const PAIRS: { title: string; keys: [keyof ThemeTokens, keyof ThemeTokens | null]; labels: [string, string?] }[] = [
  { title: "Page", keys: ["background", "onBackground"], labels: ["Background", "Text on background"] },
  { title: "Surface", keys: ["surface", "text"], labels: ["Surface", "Text on surface"] },
  { title: "Buttons", keys: ["primary", "onPrimary"], labels: ["Primary", "Text on primary"] },
  { title: "Details", keys: ["accent", null], labels: ["Accent"] },
];

export function DesignPanel() {
  const { bundle, card, patch, role, client, templatePreview, setTemplatePreview } = useEditor();
  const { db } = useDB();
  const toast = useToast();
  const tpl = getTemplate(card.templateId);
  const tokens = resolveTokens(card);
  const checks = contrastChecks(card);
  const failing = checks.filter((c) => !c.passes);
  const [pending, setPending] = useState<TemplateItem | null>(null);
  const [browseAll, setBrowseAll] = useState(false);
  const [paywall, setPaywall] = useState<string | null>(null);
  const isClient = role === "client";

  /* Paid templates: tier and price, the card's unlocks and open requests. */
  const pricing = pricingOf(db);
  const ent = entitlementsFor(db, card.id);
  const accessOf = useCallback(
    (templateId: string) => templateAccess(role, ent, pricing, templateId, openRequestFor(db.templateRequests, card.id, templateId)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [role, ent, db.pricing, db.library.defaultTemplateId, db.templateRequests, card.id],
  );
  const defaultName = getTemplate(db.library.defaultTemplateId).name;
  const openForCard = db.templateRequests.filter((r) => r.cardId === card.id && OPEN_REQUEST.includes(r.status));
  const requestStatusOf = useCallback((templateId: string): TemplateRequestStatus | undefined => openForCard.find((r) => r.templateId === templateId)?.status, [openForCard]);

  // "Pay now" / "Resubmit payment" from the portal home or an email: ?request=<id> opens that request's sheet.
  const params = useSearchParams();
  const requestParam = params.get("request");
  useEffect(() => {
    if (!isClient || !requestParam) return;
    const r = db.templateRequests.find((x) => x.id === requestParam && x.cardId === card.id && OPEN_REQUEST.includes(x.status));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- opening the sheet a link points at, once the request has loaded
    if (r) setPaywall(r.templateId);
  }, [isClient, requestParam, db.templateRequests, card.id]);
  const accentOnLabel = tpl.accent.on === "primary" ? "buttons and bands" : tpl.accent.on;

  // Themes: the card's template, or the locked template being previewed (its themes are previewable too).
  const themeTpl = templatePreview ? getTemplate(templatePreview.templateId) : tpl;
  const themes = themeTpl.themes.filter((t) => (!templatePreview && t.id === card.themeId) || !db.library.disabledThemes.includes(`${themeTpl.id}:${t.id}`));
  const currentThemeName = card.themeId === "custom" ? "Custom colors" : (tpl.themes.find((t) => t.id === card.themeId) ?? tpl.themes[0]).name;

  const pickTheme = (themeId: string) => {
    if (templatePreview) return setTemplatePreview({ ...templatePreview, themeId });
    if (themeId === card.themeId) return;
    applyThemeOnly(card.id, themeId);
  };

  /** A tile in the strip or the gallery. Free and unlocked open the apply confirmation; locked ones preview. */
  const pickTemplate = (it: TemplateItem) => {
    const access = accessOf(it.manifest.id);
    if (isClient && (access === "locked" || access === "requested")) {
      // Look, don't save: the preview renders their card in it with a ribbon; the sheet explains the price.
      setTemplatePreview({ templateId: it.manifest.id, themeId: it.manifest.themes[0].id });
      setPaywall(it.manifest.id);
      return;
    }
    setTemplatePreview(null);
    if (it.key !== card.templateId) setPending(it);
  };

  const setColor = (key: keyof ThemeTokens, value: string) => patch({ themeId: "custom", customTokens: { ...tokens, [key]: value } });

  const fixPair = (fgKey: keyof ThemeTokens, bgKey: keyof ThemeTokens) => {
    const fg = bestOn(tokens[bgKey], "#FFFFFF", "#111111");
    setColor(fgKey, fg);
    toast.success("Text color adjusted", { description: `Set to ${fg === "#FFFFFF" ? "white" : "near black"} for readable contrast.` });
  };

  // Strip: the current template, then (clients) what they can use and what they requested, then starred, then the most used.
  const lib = db.library;
  const strip = useMemo(() => {
    const all = templateItems(lib).filter((i) => !i.saved && (i.key === card.templateId || !lib.disabledTemplates.includes(i.key)));
    const usable = (i: TemplateItem) => {
      if (!isClient) return 0;
      const a = accessOf(i.manifest.id);
      return a === "free" || a === "unlocked" ? 1e5 : a === "requested" ? 5e4 : 0;
    };
    const rank = (i: TemplateItem) => (i.key === card.templateId ? 1e6 : 0) + usable(i) + (lib.favoriteTemplates.includes(i.key) ? 1e4 : 0) + i.manifest.popularity;
    return all.sort((a, b) => rank(b) - rank(a));
  }, [lib, card.templateId, isClient, accessOf]);
  const visible = strip.slice(0, 8);
  // Thumbnails follow content edits a beat behind typing.
  const content = useDeferredValue(bundle);
  const paywallReq = paywall ? openRequestFor(db.templateRequests, card.id, paywall) : undefined;

  return (
    <div>
      <PanelHeader title="Design" description="Change the look without touching the content. Every option updates the preview right away." />

      {/* Template strip */}
      <section className="flex flex-col gap-3" aria-labelledby="tpl-h">
        <div className="flex items-baseline justify-between gap-3">
          <h3 id="tpl-h" className="text-base font-semibold">
            Template <span className="font-normal text-studio-ink-3">· {tpl.name}</span>
          </h3>
          {isClient ? (
            <button type="button" onClick={() => setBrowseAll(true)} className="inline-flex h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-studio-action-ink hover:bg-studio-action-soft">
              See all {strip.length}
              <ArrowRight aria-hidden className="size-4" />
            </button>
          ) : (
            <Link href={`/admin/templates?card=${card.id}&template=${card.templateId}`} className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-studio-action-ink hover:bg-studio-action-soft">
              See all {strip.length}
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          )}
        </div>
        <ul aria-labelledby="tpl-h" className="-mx-1 flex snap-x gap-2.5 overflow-x-auto px-1 pt-1 pb-2 [scrollbar-width:thin]">
          {visible.map((it) => (
            <StripTile
              key={it.key}
              item={it}
              content={content}
              active={it.key === card.templateId}
              state={templatePreview?.templateId === it.key ? "previewing" : accessOf(it.manifest.id)}
              pricing={templatePricing(it.manifest.id, pricing)}
              admin={!isClient}
              requestStatus={isClient ? requestStatusOf(it.manifest.id) : undefined}
              onPick={() => pickTemplate(it)}
            />
          ))}
        </ul>
        {isClient ? (
          // The one "more templates" hint: honest, no nagging.
          <p className="text-2xs text-studio-ink-3">
            {defaultName} is included. More templates are a one-time unlock: tap one to see your card in it first.
          </p>
        ) : (
          <p className="text-2xs text-studio-ink-3">
            {tpl.description}
            {card.clientId && ` Paid templates you apply here are unlocked for ${client?.name ?? "the client"} at no charge.`}
          </p>
        )}
        {templatePreview && (
          <p aria-live="polite" className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-studio-raised px-3 py-2 text-2xs text-studio-ink-2">
            <Eye aria-hidden className="size-3.5 shrink-0" />
            <span className="min-w-0 flex-1">
              Previewing <span className="font-semibold text-studio-ink">{getTemplate(templatePreview.templateId).name}</span> on your card. Try its themes below; nothing is saved.
            </span>
            <button type="button" onClick={() => setPaywall(templatePreview.templateId)} className="inline-flex h-10 cursor-pointer items-center font-semibold text-studio-action-ink underline underline-offset-2">
              Unlock it
            </button>
            <button type="button" onClick={() => setTemplatePreview(null)} className="inline-flex h-10 cursor-pointer items-center font-semibold text-studio-ink-2 underline underline-offset-2">
              Stop previewing
            </button>
          </p>
        )}
        {!isClient && openForCard.length > 0 && (
          <Link href={`/admin/template-requests?request=${openForCard[0].id}`} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-studio-warn-soft px-3 py-2 text-2xs font-semibold text-studio-warn-ink">
            <Lock aria-hidden className="size-3.5 shrink-0" />
            {client?.name ?? "The client"} requested {openForCard.map((r) => requestTemplateName(r)).join(" and ")}. Review in Template requests.
          </Link>
        )}
      </section>

      <Divider />

      {/* Theme: free for everyone */}
      <section className="flex flex-col gap-3" aria-labelledby="theme-h">
        <div className="flex flex-col gap-0.5">
          <h3 id="theme-h" className="text-base font-semibold">
            Theme{" "}
            <span className="font-normal text-studio-ink-3">
              · {templatePreview ? `${themeTpl.name}, previewing` : currentThemeName}
            </span>
          </h3>
          <p className="text-2xs text-studio-ink-3">{templatePreview ? `${themeTpl.name}'s color themes, shown on your card. Pick the one you'd want.` : "Every theme is free. Tap one to apply it."}</p>
        </div>
        <ul aria-labelledby="theme-h" className="grid grid-cols-2 gap-2 min-[400px]:grid-cols-3 sm:grid-cols-4">
          {themes.map((th) => (
            <li key={th.id}>
              <ThemeSwatch
                name={th.name}
                tokens={th.tokens}
                selected={templatePreview ? templatePreview.themeId === th.id : card.themeId === th.id}
                previewing={!!templatePreview}
                onClick={() => pickTheme(th.id)}
              />
            </li>
          ))}
          {!isClient && !templatePreview && (
            <li>
              <button
                type="button"
                aria-pressed={card.themeId === "custom"}
                onClick={() => patch({ themeId: "custom", customTokens: { ...tokens } })}
                className={cn(
                  "flex w-full cursor-pointer flex-col gap-2 rounded-xl border p-2 text-left",
                  card.themeId === "custom" ? "border-studio-action shadow-[0_0_0_2px_var(--studio-action)]" : "border-dashed border-studio-line-strong hover:border-studio-ink-3",
                )}
              >
                <span aria-hidden className="flex h-12 items-center justify-center rounded-lg bg-studio-raised text-2xs text-studio-ink-3">
                  Your colors
                </span>
                <span className="px-0.5 text-2xs font-semibold">Custom</span>
              </button>
            </li>
          )}
        </ul>
      </section>

      {!isClient && <Divider />}

      {/* Colors + contrast */}
      {!isClient && (<section className="flex flex-col gap-5" aria-labelledby="colors-h">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <h3 id="colors-h" className="text-base font-semibold">
              Colors
            </h3>
            <p className="text-2xs text-studio-ink-3">Editing any color switches the theme to Custom.</p>
          </div>
          {failing.length === 0 ? (
            <span className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md bg-studio-success-soft px-2 text-2xs font-semibold text-studio-success">
              <CircleCheck aria-hidden className="size-3.5" />
              Passes WCAG AA
            </span>
          ) : (
            <span className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md bg-studio-danger-soft px-2 text-2xs font-semibold text-studio-danger-ink">
              <CircleAlert aria-hidden className="size-3.5" />
              {failing.length} contrast issue{failing.length === 1 ? "" : "s"}
            </span>
          )}
        </div>

        {PAIRS.map((pair) => {
          const [bgKey, fgKey] = pair.keys;
          const chk = checks.find((c) => c.id === (fgKey ?? "accent"));
          return (
            <div key={pair.title} className="flex flex-col gap-3 border-t border-studio-line pt-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">{pair.title}</p>
                {chk && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 text-2xs font-semibold tabular-nums",
                      chk.passes ? "text-studio-success" : "text-studio-danger-ink",
                    )}
                  >
                    {chk.passes ? <Check aria-hidden className="size-3.5" /> : <CircleAlert aria-hidden className="size-3.5" />}
                    {formatRatio(chk.ratio)} {chk.passes ? "" : `(needs ${chk.required}:1)`}
                  </span>
                )}
              </div>
              <span
                aria-hidden
                className="flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold"
                style={{
                  background: fgKey ? tokens[bgKey] : accentGround(tpl, tokens),
                  color: fgKey ? tokens[fgKey] : tpl.accent.on === "surface" ? tokens.text : tpl.accent.on === "primary" ? tokens.onPrimary : tokens.onBackground,
                }}
              >
                {fgKey ? "Sample text Aa" : "Map pin and small marks"}
                {!fgKey && <span className="ml-auto h-5 w-9 rounded-full" style={{ background: tokens.accent }} />}
              </span>
              {fgKey === null && (
                <p className="-mt-1 text-2xs text-studio-ink-3">
                  Checked against the {accentOnLabel}, where {tpl.name} uses it{tpl.accent.use === "text" ? " for text (4.5:1)" : " for marks (3:1)"}.
                </p>
              )}
              <ColorPicker label={pair.labels[0]} value={tokens[bgKey]} onChange={(v) => setColor(bgKey, v)} />
              {fgKey && <ColorPicker label={pair.labels[1]!} value={tokens[fgKey]} onChange={(v) => setColor(fgKey, v)} />}
              {chk && !chk.passes && fgKey && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-studio-danger-soft px-3 py-2">
                  <p className="text-2xs text-studio-danger-ink">This text will be hard to read for many people.</p>
                  <Button size="sm" onClick={() => fixPair(fgKey, bgKey)}>
                    Fix text color
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </section>)}

      {!isClient && <Divider />}

      {!isClient && (<section className="flex flex-col gap-3" aria-labelledby="fonts-h">
        <h3 id="fonts-h" className="text-base font-semibold">
          Fonts
        </h3>
        <FontPicker value={card.fontPairingId} onChange={(id) => patch({ fontPairingId: id })} sampleName={card.name} pinnedId={tpl.fontPairingId} pinnedLabel={`Made for ${tpl.name}`} />
      </section>)}

      {!isClient && <Divider />}

      {!isClient && (<section className="flex flex-col gap-4" aria-labelledby="btn-h">
        <h3 id="btn-h" className="text-base font-semibold">
          Buttons
        </h3>
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold">Shape</span>
          <Segmented<ButtonShape>
            label="Button shape"
            value={card.buttonShape}
            onChange={(v) => patch({ buttonShape: v })}
            className="w-full"
            options={[
              { value: "pill", label: "Pill", icon: <span aria-hidden className="h-3.5 w-6 rounded-full border-[1.5px] border-current" /> },
              { value: "rounded", label: "Rounded", icon: <span aria-hidden className="h-3.5 w-6 rounded-[4px] border-[1.5px] border-current" /> },
              { value: "square", label: "Square", icon: <span aria-hidden className="h-3.5 w-6 border-[1.5px] border-current" /> },
            ]}
          />
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold">Fill</span>
          <Segmented<ButtonFill>
            label="Button fill"
            value={card.buttonFill}
            onChange={(v) => patch({ buttonFill: v })}
            className="w-full"
            options={[
              { value: "solid", label: "Solid" },
              { value: "outline", label: "Outline" },
              { value: "soft", label: "Soft" },
            ]}
          />
          <p className="text-2xs text-studio-ink-3">Applies to the main Call and Message buttons.</p>
        </div>
      </section>)}

      {!isClient && (
        <>
          <Divider />
          <Toggle
            label="Motion"
            description="One short entrance animation when the card opens. Always off for visitors who turn on reduced motion on their phone."
            checked={card.motion}
            onCheckedChange={(v) => patch({ motion: v })}
          />
        </>
      )}

      <ApplyTemplateDialog bundle={bundle} item={pending} open={!!pending} onOpenChange={(v) => !v && setPending(null)} role={role} clientName={client?.name} />

      {isClient && (
        <Dialog open={browseAll} onOpenChange={setBrowseAll} size="full" title="Templates" description={`${defaultName} is included. Locked templates show their price; tap one to preview your card in it.`}>
          <TemplateBrowser
            items={strip}
            selectedKey={card.templateId}
            currentKey={card.templateId}
            favorites={[]}
            content={content}
            pricing={pricing}
            access={accessOf}
            requestStatus={isClient ? requestStatusOf : undefined}
            previewingKey={templatePreview?.templateId}
            onSelect={(key) => {
              const it = strip.find((i) => i.key === key);
              if (!it || key === card.templateId) return;
              setBrowseAll(false);
              pickTemplate(it);
            }}
          />
        </Dialog>
      )}

      {paywall && (
        <PaywallSheet
          key={paywall}
          open
          onOpenChange={(v) => !v && setPaywall(null)}
          onKeep={() => setTemplatePreview(null)}
          templateId={paywall}
          pricing={templatePricing(paywall, pricing)}
          themeId={templatePreview?.templateId === paywall ? templatePreview.themeId : undefined}
          bundle={bundle}
          defaultName={defaultName}
          request={paywallReq}
          clientId={isClient ? client?.id : undefined}
          onRequest={async (note) => {
            const themeId = templatePreview?.templateId === paywall ? templatePreview.themeId : undefined;
            const res = await requestTemplate(card.id, paywall, themeId, note);
            if (!res.ok) return res;
            // The preview goes back to the saved card as soon as the request is sent.
            setTemplatePreview(null);
            return { ok: true, status: res.data.status };
          }}
          onCancelRequest={async () => {
            if (!paywallReq) return { ok: true };
            const res = await cancelRequest(paywallReq.id);
            if (!res.ok) return res;
            setTemplatePreview(null);
            toast.success("Request cancelled", { description: `${getTemplate(paywall).name} stays locked. You can request it again any time.` });
            return { ok: true };
          }}
        />
      )}
    </div>
  );
}

/** One template in the strip: the card's own content in that template, with its price state. */
function StripTile({
  item,
  content,
  active,
  state,
  pricing,
  admin,
  requestStatus,
  onPick,
}: {
  item: TemplateItem;
  content: Parameters<typeof itemBundle>[2];
  active: boolean;
  state: TileState;
  pricing: TemplatePricing;
  admin: boolean;
  requestStatus?: TemplateRequestStatus;
  onPick: () => void;
}) {
  const b = useMemo(() => itemBundle(item, undefined, content), [item, content]);
  const locked = !admin && (state === "locked" || state === "requested");
  return (
    <li className="relative shrink-0 snap-start">
      {/* Overlay button: the thumbnail is a whole card with its own buttons, so it can't sit inside one. */}
      <button
        type="button"
        aria-pressed={active}
        aria-label={`${item.name}, ${active ? "current template" : accessLabel(state, pricing, admin, requestStatus)}`}
        onClick={() => !active && onPick()}
        className={cn("peer absolute inset-0 z-10 rounded-xl focus-visible:outline-offset-2", active ? "cursor-default" : "cursor-pointer")}
      />
      <div className={cn("flex w-[100px] flex-col gap-1.5 rounded-xl p-1 transition-colors", active ? "bg-studio-action-soft" : "peer-hover:bg-studio-raised")}>
        <span className={cn("relative block overflow-hidden rounded-[10px] border-2", active ? "border-studio-action" : state === "previewing" ? "border-studio-ink" : "border-studio-line")}>
          <TemplateThumbnail bundle={b} width={390} height={700} scale={0.235} />
          {locked && (
            <span aria-hidden className="absolute top-1 right-1 inline-flex size-6 items-center justify-center rounded-full bg-black/60 text-white">
              <Lock className="size-3" strokeWidth={2.5} />
            </span>
          )}
        </span>
        <span aria-hidden className="flex flex-col gap-1 px-0.5">
          <span className="flex items-center gap-1 text-2xs leading-tight font-semibold">
            <span className="line-clamp-2">{item.name}</span>
            {active && <Check className="size-3.5 shrink-0 text-studio-action" strokeWidth={2.5} />}
          </span>
          {!active && <AccessBadge state={state} pricing={pricing} admin={admin} requestStatus={requestStatus} className="h-5 self-start px-1.5 text-[11px]" />}
        </span>
      </div>
    </li>
  );
}
