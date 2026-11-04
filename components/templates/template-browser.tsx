"use client";

import { Check, Lock, Search, Star, X } from "lucide-react";
import { memo, useMemo, useState, type ReactNode } from "react";
import { templatePricing, type PricingSettings, type TemplateAccess } from "@/lib/entitlements";
import type { CardBundle, TemplatePricing } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CATEGORIES } from "@/templates/registry";
import { Button } from "@/components/ui/button";
import { Badge, Toggle } from "@/components/ui/controls";
import { Select } from "@/components/ui/field";
import { filterItems, itemBundle, type CategoryFilter, type SortKey, type TemplateItem } from "./template-items";
import { AccessBadge, accessLabel, type TileState } from "./access-badge";
import { TemplateThumbnail } from "./template-thumbnail";

const FILTERS: CategoryFilter[] = ["All", ...CATEGORIES];

export type BrowserProps = {
  items: TemplateItem[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
  favorites: string[];
  onToggleFavorite?: (key: string) => void;
  /** Theme the selected tile previews (picked from the side panel's swatches). */
  previewTheme?: string;
  /** Compare mode: tiles toggle membership instead of selecting. */
  compare?: { keys: string[]; max: number; onToggle: (key: string) => void } | null;
  /** Badges: the card's current template, and templates hidden from clients. */
  currentKey?: string;
  hiddenKeys?: string[];
  usage?: (templateId: string) => number;
  loading?: boolean;
  /** Content for thumbnails; omitted = each template's own sample card. */
  content?: CardBundle;
  /** Extra controls in the toolbar (e.g. Compare). */
  toolbar?: ReactNode;
  className?: string;
  /**
   * Paid templates. With `pricing`, every tile shows Free or its price.
   * `access` (client mode) adds locks, "Requested" and "Unlocked", and the
   * "Show only what I can use" toggle. Admins pass pricing only: nothing is locked for them.
   */
  pricing?: PricingSettings;
  access?: (templateId: string) => TemplateAccess;
  /** The locked template shown in the preview right now. */
  previewingKey?: string | null;
};

/** Filters, search, sort and the grid of live template tiles. Shared by the library, New card and the editor. */
export function TemplateBrowser({
  items,
  selectedKey,
  onSelect,
  favorites,
  onToggleFavorite,
  previewTheme,
  compare,
  currentKey,
  hiddenKeys = [],
  usage = () => 0,
  loading,
  content,
  toolbar,
  className,
  pricing,
  access,
  previewingKey,
}: BrowserProps) {
  const [category, setCategory] = useState<CategoryFilter>("All");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("popular");
  const [usableOnly, setUsableOnly] = useState(false);
  const shown = useMemo(() => {
    const list = filterItems(items, { category, query, sort, favorites, usage });
    return usableOnly && access ? list.filter((i) => ["free", "unlocked"].includes(access(i.manifest.id))) : list;
  }, [items, category, query, sort, favorites, usage, usableOnly, access]);
  const filtered = category !== "All" || query.trim() !== "" || usableOnly;
  const clear = () => {
    setCategory("All");
    setQuery("");
    setUsableOnly(false);
  };
  const count = (c: CategoryFilter) => (c === "All" ? items.length : c === "Starred" ? items.filter((i) => favorites.includes(i.key)).length : items.filter((i) => i.manifest.category === c).length);

  return (
    <div className={cn("flex flex-col gap-5", className)}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative min-w-[220px] flex-1 sm:max-w-sm">
            <span className="sr-only">Search templates</span>
            <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-studio-ink-3" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, tag or who it’s for"
              className="h-11 w-full rounded-lg border border-studio-line-strong bg-studio-surface pr-3 pl-9 text-sm text-studio-ink placeholder:text-studio-ink-3 focus:border-studio-action focus:shadow-[0_0_0_3px_var(--studio-action-soft)] focus:outline-none"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-studio-ink-2">
            <span className="shrink-0">Sort</span>
            <Select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="w-36">
              <option value="popular">Popular</option>
              <option value="newest">Newest</option>
              <option value="az">A–Z</option>
            </Select>
          </label>
          {access && (
            <div className="min-w-[220px] rounded-lg border border-studio-line bg-studio-surface px-3 py-2.5">
              <Toggle label="Show only what I can use" checked={usableOnly} onCheckedChange={setUsableOnly} />
            </div>
          )}
          {toolbar && <div className="ml-auto flex items-center gap-2">{toolbar}</div>}
        </div>
        <div role="group" aria-label="Filter by category" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]">
          {[...FILTERS, ...(onToggleFavorite || favorites.length ? (["Starred"] as const) : [])].map((c) => {
            const active = c === category;
            return (
              <button
                key={c}
                type="button"
                aria-pressed={active}
                onClick={() => setCategory(c)}
                className={cn(
                  "inline-flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors",
                  active ? "border-studio-ink bg-studio-ink text-studio-surface" : "border-studio-line-strong bg-studio-surface text-studio-ink-2 hover:border-studio-ink-3 hover:text-studio-ink",
                )}
              >
                {c === "Starred" && <Star aria-hidden className="size-3.5" fill="currentColor" />}
                {c}
                <span className={cn("tabular-nums", active ? "opacity-75" : "text-studio-ink-3")}>{count(c)}</span>
              </button>
            );
          })}
        </div>
      </div>

      <p aria-live="polite" className="sr-only">
        {loading ? "Loading templates" : `${shown.length} template${shown.length === 1 ? "" : "s"} shown`}
      </p>

      {loading ? (
        <ul aria-hidden className="grid grid-cols-[repeat(auto-fill,minmax(196px,1fr))] gap-4">
          {Array.from({ length: 8 }, (_, i) => (
            <li key={i} className="flex flex-col overflow-hidden rounded-2xl border border-studio-line bg-studio-surface">
              <div className="flex justify-center bg-studio-sunken px-4 pt-4">
                <div className="skeleton h-[280px] w-[156px] rounded-t-[22px]" />
              </div>
              <div className="flex flex-col gap-2 p-3.5">
                <div className="skeleton h-4 w-2/3 rounded" />
                <div className="skeleton h-3 w-1/3 rounded" />
              </div>
            </li>
          ))}
        </ul>
      ) : shown.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-studio-line-strong bg-studio-surface px-6 py-10">
          <p className="text-base font-semibold">{query.trim() ? `No templates match “${query.trim()}”` : usableOnly ? "Nothing here you can use yet" : category === "Starred" ? "No starred templates yet" : `No ${category} templates`}</p>
          <p className="max-w-[52ch] text-sm text-studio-ink-3">
            {category === "Starred" && !query.trim() ? "Star a template to keep it here." : "Try a different word, like “clinic”, “photo” or “serif”, or look across every category."}
          </p>
          {filtered && (
            <Button size="sm" onClick={clear} icon={<X aria-hidden className="size-4" />}>
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(196px,1fr))] gap-4">
          {shown.map((it) => (
            <TemplateTile
              key={it.key}
              item={it}
              selected={compare ? compare.keys.includes(it.key) : it.key === selectedKey}
              compareMode={!!compare}
              compareFull={!!compare && compare.keys.length >= compare.max && !compare.keys.includes(it.key)}
              favorite={favorites.includes(it.key)}
              onToggleFavorite={onToggleFavorite}
              onPress={() => (compare ? compare.onToggle(it.key) : onSelect(it.key))}
              themeId={it.key === selectedKey ? previewTheme : undefined}
              current={it.key === currentKey}
              hidden={hiddenKeys.includes(it.key)}
              content={content}
              pricing={pricing && !it.saved ? templatePricing(it.manifest.id, pricing) : undefined}
              state={pricing ? (previewingKey === it.key ? "previewing" : access ? access(it.manifest.id) : templatePricing(it.manifest.id, pricing).tier === "free" ? "free" : "locked") : undefined}
              admin={!access}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * One template: a live thumbnail of the card in a phone frame, name, category
 * and, with pricing, its state: free (Default), locked (price), requested,
 * unlocked, selected or previewing.
 */
export const TemplateTile = memo(function TemplateTile({
  item,
  selected,
  compareMode,
  compareFull,
  favorite,
  onToggleFavorite,
  onPress,
  themeId,
  current,
  hidden,
  content,
  pricing,
  state,
  admin,
}: {
  item: TemplateItem;
  selected: boolean;
  compareMode: boolean;
  compareFull: boolean;
  favorite: boolean;
  onToggleFavorite?: (key: string) => void;
  onPress: () => void;
  themeId?: string;
  current: boolean;
  hidden: boolean;
  content?: CardBundle;
  pricing?: TemplatePricing;
  state?: TileState;
  admin?: boolean;
}) {
  const bundle = useMemo(() => itemBundle(item, themeId, content), [item, themeId, content]);
  const locked = !admin && (state === "locked" || state === "requested");
  const label = `${item.name}, ${item.manifest.category}${pricing && state ? `, ${accessLabel(state, pricing, admin)}` : ""}${item.saved ? `, saved from ${item.manifest.name}` : ""}${item.isNew ? ", new" : ""}${current ? ", current template" : ""}${hidden ? ", hidden from clients" : ""}`;
  return (
    <li className="relative">
      <div
        className={cn(
          "group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-studio-surface transition-[transform,border-color,box-shadow] duration-200 ease-out",
          "hover:-translate-y-0.5 hover:border-studio-line-strong hover:shadow-[0_10px_24px_-14px_rgb(0_0_0/0.35)] has-[:focus-visible]:-translate-y-0.5",
          selected ? "border-studio-action shadow-[0_0_0_2px_var(--studio-action),0_0_0_6px_var(--studio-action-soft)] hover:border-studio-action" : "border-studio-line",
          compareFull && "opacity-60",
        )}
      >
        <button
          type="button"
          aria-pressed={selected}
          aria-disabled={compareFull || undefined}
          aria-label={compareMode ? `Compare ${label}` : label}
          onClick={() => !compareFull && onPress()}
          className={cn("absolute inset-0 z-10 rounded-2xl focus-visible:outline-offset-[3px]", compareFull ? "cursor-not-allowed" : "cursor-pointer")}
        />
        <div className={cn("relative flex justify-center bg-studio-sunken px-4 pt-4", hidden && "[&>div]:opacity-55 [&>div]:grayscale")}>
          {/* Phone frame: bezel and screen, cropped at the bottom like a phone in a pocket. */}
          <div className="rounded-t-[24px] bg-[#141614] p-[5px] pb-0">
            <div className="overflow-hidden rounded-t-[19px]">
              <TemplateThumbnail bundle={bundle} width={390} height={700} scale={0.4} />
            </div>
          </div>
          {locked && (
            <span aria-hidden className="absolute top-2.5 right-2.5 inline-flex size-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm">
              <Lock className="size-3.5" strokeWidth={2.5} />
            </span>
          )}
          <div className="absolute top-2.5 left-2.5 flex flex-col items-start gap-1">
            {selected && !compareMode && (
              <span className="inline-flex h-6 items-center gap-1.5 rounded-md bg-studio-action px-2 text-2xs font-semibold text-studio-on-action">
                <Check aria-hidden className="size-3" strokeWidth={3} />
                Selected
              </span>
            )}
            {selected && compareMode && (
              <span className="inline-flex h-6 items-center gap-1.5 rounded-md bg-studio-action px-2 text-2xs font-semibold text-studio-on-action">
                <Check aria-hidden className="size-3" strokeWidth={3} />
                Comparing
              </span>
            )}
          </div>
        </div>
        <div aria-hidden className="flex flex-1 flex-col gap-1 border-t border-studio-line p-3.5 pr-12">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-semibold text-studio-ink">{item.name}</span>
            {item.isNew && <Badge tone="warn">New</Badge>}
            {item.saved && <Badge>Yours</Badge>}
          </span>
          {pricing && state && <AccessBadge state={state} pricing={pricing} admin={admin} className="mt-1 self-start" />}
          <span className="text-2xs text-studio-ink-3">
            {item.manifest.category}
            {current && " · Current"}
            {hidden && " · Hidden"}
          </span>
        </div>
      </div>
      {onToggleFavorite && (
        <button
          type="button"
          aria-pressed={favorite}
          aria-label={favorite ? `Unstar ${item.name}` : `Star ${item.name}`}
          onClick={() => onToggleFavorite(item.key)}
          className={cn(
            "absolute right-1.5 bottom-1.5 z-20 inline-flex size-11 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-studio-raised",
            favorite ? "text-studio-warn-ink" : "text-studio-ink-3 hover:text-studio-ink",
          )}
        >
          <Star aria-hidden className="size-[18px]" fill={favorite ? "currentColor" : "none"} strokeWidth={1.75} />
        </button>
      )}
    </li>
  );
});
