import type { CardBundle, LibrarySettings, SavedTemplate } from "@/lib/types";
import { getPreview } from "@/templates/previews";
import { lookFor, lookForSaved, TEMPLATES, type TemplateLook } from "@/templates/registry";
import type { TemplateCategory, TemplateManifest } from "@/templates/types";

/** One tile in the library: a built-in template, or one an admin saved from it. */
export type TemplateItem = {
  key: string;
  name: string;
  manifest: TemplateManifest;
  saved?: SavedTemplate;
  isNew: boolean;
  addedAt: string;
};

export function templateItems(lib: LibrarySettings): TemplateItem[] {
  const saved = lib.savedTemplates
    .map((s): TemplateItem | null => {
      const m = TEMPLATES.find((t) => t.id === s.baseId);
      return m ? { key: s.id, name: s.name, manifest: m, saved: s, isNew: false, addedAt: s.created_at } : null;
    })
    .filter((x): x is TemplateItem => !!x);
  return [...saved, ...TEMPLATES.map((m) => ({ key: m.id, name: m.name, manifest: m, isNew: !!m.isNew, addedAt: m.addedAt }))];
}

/** Design settings the item applies, with an optional theme picked in the panel. */
export function itemLook(item: TemplateItem, themeId?: string): TemplateLook {
  if (item.saved && (!themeId || themeId === item.saved.themeId)) return lookForSaved(item.saved);
  return lookFor(item.manifest, themeId);
}

/** The item rendered with its own sample card, or with `content` when given. */
export function itemBundle(item: TemplateItem, themeId?: string, content?: CardBundle): CardBundle {
  const base = content ?? getPreview(item.manifest.id);
  return { ...base, card: { ...base.card, ...itemLook(item, themeId) } };
}

export type CategoryFilter = "All" | TemplateCategory | "Starred";
export type SortKey = "popular" | "newest" | "az";

export function filterItems(
  items: TemplateItem[],
  opts: { category: CategoryFilter; query: string; sort: SortKey; favorites: string[]; usage: (id: string) => number },
): TemplateItem[] {
  const q = opts.query.trim().toLowerCase();
  const words = q.split(/\s+/).filter(Boolean);
  const out = items.filter((it) => {
    if (opts.category === "Starred" && !opts.favorites.includes(it.key)) return false;
    if (opts.category !== "All" && opts.category !== "Starred" && it.manifest.category !== opts.category) return false;
    if (!words.length) return true;
    const hay = [it.name, it.manifest.name, it.manifest.category, it.manifest.bestFor, it.manifest.description, ...it.manifest.tags].join(" ").toLowerCase();
    return words.every((w) => hay.includes(w));
  });
  const score = (it: TemplateItem) => it.manifest.popularity + opts.usage(it.manifest.id) * 10 + (it.saved ? 5 : 0);
  return out.sort((a, b) =>
    opts.sort === "az" ? a.name.localeCompare(b.name) : opts.sort === "newest" ? b.addedAt.localeCompare(a.addedAt) || a.name.localeCompare(b.name) : score(b) - score(a),
  );
}
