"use client";

import { DEFAULT_SECTION_ORDER } from "@/lib/design/sections";
import { getTemplate, type TemplateLook } from "@/templates/registry";
import { bundleFromDB, type MockDB } from "@/lib/mock";
import type {
  AlbumPhoto,
  Card,
  LibrarySettings,
  OrgChart,
  SavedTemplate,
  OrgMember,
  SocialLink,
} from "@/lib/types";
import { nowISO, slugify, uid } from "@/lib/utils";
import { saveLibrarySettings } from "@/lib/api";
import { fieldLabels, logChanges } from "./change-log";
import { readDB, updateDB } from "./db";

/* Local mutations behind the stubs in lib/api.ts. Each one is a pure update of the mock DB. */

function touch(db: MockDB, cardId: string, field?: string): MockDB {
  const next = { ...db, cards: db.cards.map((c) => (c.id === cardId ? { ...c, updated_at: nowISO() } : c)) };
  return field ? logChanges(next, cardId, [field]) : next;
}

/* ----------------------------------------------------------------- Cards */

export function patchCard(cardId: string, patch: Partial<Card>) {
  updateDB((db) =>
    logChanges(
      { ...db, cards: db.cards.map((c) => (c.id === cardId ? { ...c, ...patch, updated_at: nowISO() } : c)) },
      cardId,
      fieldLabels(patch),
    ),
  );
}

export function uniqueSlug(base: string, db: MockDB = readDB(), exceptId?: string): string {
  const root = slugify(base) || "card";
  const taken = new Set(db.cards.filter((c) => c.id !== exceptId).map((c) => c.slug));
  if (!taken.has(root)) return root;
  let n = 2;
  while (taken.has(`${root}-${n}`)) n++;
  return `${root}-${n}`;
}

export function createCard(input: {
  look: TemplateLook;
  name: string;
  title?: string;
  phone?: string;
  email?: string;
  /** Reserved earlier so photos could upload into the card's folder before it existed. */
  id?: string;
}): Card {
  const db = readDB();
  const now = nowISO();
  const id = input.id ?? uid("card");
  const card: Card = {
    id,
    slug: uniqueSlug(input.name, db),
    status: "draft",
    ...input.look,
    motion: true,
    name: input.name,
    title: input.title || undefined,
    phone: input.phone || undefined,
    email: input.email || undefined,
    messageChannel: "sms",
    showDirections: true,
    overlayOpacity: 0.55,
    backgroundFocalPoint: { x: 0.5, y: 0.5 },
    sectionOrder: getTemplate(input.look.templateId).defaultSectionOrder ?? DEFAULT_SECTION_ORDER,
    hiddenSections: [],
    created_at: now,
    updated_at: now,
  };
  const orgChart: OrgChart = { id: uid("org"), cardId: id, mode: "tree", created_at: now };
  updateDB((d) => ({ ...d, cards: [card, ...d.cards], orgCharts: [...d.orgCharts, orgChart] }));
  return card;
}

export function duplicateCard(cardId: string): Card | null {
  const db = readDB();
  const src = db.cards.find((c) => c.id === cardId);
  if (!src) return null;
  const now = nowISO();
  const id = uid("card");
  // A copy is a studio card: it doesn't belong to the source card's client or carry its review.
  const { clientId: _cl, permissions: _pe, review: _re, ...rest } = structuredClone(src);
  void _cl; void _pe; void _re;
  const copy: Card = {
    ...rest,
    id,
    slug: uniqueSlug(`${src.slug}-copy`, db),
    name: `${src.name} (copy)`,
    status: "draft",
    created_at: now,
    updated_at: now,
    published_at: undefined,
  };
  const srcChart = db.orgCharts.find((o) => o.cardId === cardId);
  const chartId = uid("org");
  const memberIdMap = new Map<string, string>();
  const srcMembers = srcChart ? db.orgMembers.filter((m) => m.orgChartId === srcChart.id) : [];
  srcMembers.forEach((m) => memberIdMap.set(m.id, uid("mem")));

  updateDB((d) => ({
    ...d,
    cards: [copy, ...d.cards],
    socialLinks: [
      ...d.socialLinks,
      ...d.socialLinks.filter((s) => s.cardId === cardId).map((s) => ({ ...s, id: uid("so"), cardId: id, created_at: now })),
    ],
    albumPhotos: [
      ...d.albumPhotos,
      ...d.albumPhotos.filter((p) => p.cardId === cardId).map((p) => ({ ...p, id: uid("ph"), cardId: id, created_at: now })),
    ],
    orgCharts: [...d.orgCharts, { ...(srcChart ?? { mode: "tree" as const }), id: chartId, cardId: id, created_at: now }],
    orgMembers: [
      ...d.orgMembers,
      ...srcMembers.map((m) => ({
        ...m,
        id: memberIdMap.get(m.id)!,
        orgChartId: chartId,
        parentId: m.parentId ? memberIdMap.get(m.parentId) ?? null : null,
        created_at: now,
      })),
    ],
  }));
  return copy;
}

/**
 * Apply a template's look. Only design settings change: every piece of
 * content (including fields the new template doesn't show) and the admin's
 * section order stay as they are. Returns the previous look for Undo.
 */
export function applyTemplate(cardId: string, look: TemplateLook): TemplateLook | null {
  const card = readDB().cards.find((c) => c.id === cardId);
  if (!card) return null;
  const prev: TemplateLook = {
    templateId: card.templateId,
    themeId: card.themeId,
    customTokens: card.customTokens,
    fontPairingId: card.fontPairingId,
    buttonShape: card.buttonShape,
    buttonFill: card.buttonFill,
  };
  patchCard(cardId, look);
  return prev;
}

/* --------------------------------------------------------------- Socials */

export function addSocial(cardId: string, link: Omit<SocialLink, "id" | "cardId" | "position" | "created_at">) {
  updateDB((db) => {
    const position = db.socialLinks.filter((s) => s.cardId === cardId).length;
    return touch({ ...db, socialLinks: [...db.socialLinks, { ...link, id: uid("so"), cardId, position, created_at: nowISO() }] }, cardId, "Socials");
  });
}

export function patchSocial(cardId: string, id: string, patch: Partial<SocialLink>) {
  updateDB((db) => touch({ ...db, socialLinks: db.socialLinks.map((s) => (s.id === id ? { ...s, ...patch } : s)) }, cardId, "Socials"));
}

export function removeSocial(cardId: string, id: string): SocialLink | undefined {
  const removed = readDB().socialLinks.find((s) => s.id === id);
  updateDB((db) => touch({ ...db, socialLinks: db.socialLinks.filter((s) => s.id !== id) }, cardId, "Socials"));
  return removed;
}

export function restoreSocial(link: SocialLink) {
  updateDB((db) => touch({ ...db, socialLinks: [...db.socialLinks, link] }, link.cardId, "Socials"));
}

export function reorderSocials(cardId: string, orderedIds: string[]) {
  updateDB((db) =>
    touch(
      { ...db, socialLinks: db.socialLinks.map((s) => (s.cardId === cardId ? { ...s, position: orderedIds.indexOf(s.id) } : s)) },
      cardId,
      "Socials",
    ),
  );
}

/* ---------------------------------------------------------------- Photos */

export function addPhoto(cardId: string, photo: Pick<AlbumPhoto, "url" | "caption" | "alt"> & Partial<Pick<AlbumPhoto, "storagePath" | "width" | "height">>): AlbumPhoto {
  const db = readDB();
  const existing = db.albumPhotos.filter((p) => p.cardId === cardId);
  const row: AlbumPhoto = {
    ...photo,
    id: uid("ph"),
    cardId,
    position: existing.length,
    isCover: existing.length === 0,
    created_at: nowISO(),
  };
  updateDB((d) => touch({ ...d, albumPhotos: [...d.albumPhotos, row] }, cardId, "Album"));
  return row;
}

export function patchPhoto(cardId: string, id: string, patch: Partial<AlbumPhoto>) {
  updateDB((db) => touch({ ...db, albumPhotos: db.albumPhotos.map((p) => (p.id === id ? { ...p, ...patch } : p)) }, cardId, "Album"));
}

export function setCoverPhoto(cardId: string, id: string) {
  updateDB((db) =>
    touch({ ...db, albumPhotos: db.albumPhotos.map((p) => (p.cardId === cardId ? { ...p, isCover: p.id === id } : p)) }, cardId, "Album"),
  );
}

export function removePhoto(cardId: string, id: string): AlbumPhoto | undefined {
  const removed = readDB().albumPhotos.find((p) => p.id === id);
  updateDB((db) => {
    let photos = db.albumPhotos.filter((p) => p.id !== id);
    if (removed?.isCover) {
      const next = photos.filter((p) => p.cardId === cardId).sort((a, b) => a.position - b.position)[0];
      if (next) photos = photos.map((p) => (p.id === next.id ? { ...p, isCover: true } : p));
    }
    return touch({ ...db, albumPhotos: photos }, cardId, "Album");
  });
  return removed;
}

export function restorePhoto(photo: AlbumPhoto) {
  updateDB((db) => {
    let photos = [...db.albumPhotos, photo];
    if (photo.isCover) photos = photos.map((p) => (p.cardId === photo.cardId ? { ...p, isCover: p.id === photo.id } : p));
    return touch({ ...db, albumPhotos: photos }, photo.cardId, "Album");
  });
}

export function reorderPhotos(cardId: string, orderedIds: string[]) {
  updateDB((db) =>
    touch(
      { ...db, albumPhotos: db.albumPhotos.map((p) => (p.cardId === cardId ? { ...p, position: orderedIds.indexOf(p.id) } : p)) },
      cardId,
      "Album",
    ),
  );
}

/* ------------------------------------------------------------- Org chart */

function chartFor(db: MockDB, cardId: string): OrgChart {
  return db.orgCharts.find((o) => o.cardId === cardId) ?? { id: `org_${cardId}`, cardId, mode: "tree", created_at: nowISO() };
}

export function patchOrgChart(cardId: string, patch: Partial<OrgChart>) {
  updateDB((db) => {
    const chart = chartFor(db, cardId);
    const exists = db.orgCharts.some((o) => o.id === chart.id);
    const next = { ...chart, ...patch };
    return touch(
      { ...db, orgCharts: exists ? db.orgCharts.map((o) => (o.id === chart.id ? next : o)) : [...db.orgCharts, next] },
      cardId,
      "Org chart",
    );
  });
}

export function addMember(cardId: string, member: Pick<OrgMember, "name" | "role" | "parentId" | "photoUrl">): OrgMember {
  const db = readDB();
  const chart = chartFor(db, cardId);
  const siblings = db.orgMembers.filter((m) => m.orgChartId === chart.id && m.parentId === member.parentId);
  const row: OrgMember = { ...member, id: uid("mem"), orgChartId: chart.id, position: siblings.length, created_at: nowISO() };
  updateDB((d) => {
    const hasChart = d.orgCharts.some((o) => o.id === chart.id);
    return touch({ ...d, orgCharts: hasChart ? d.orgCharts : [...d.orgCharts, chart], orgMembers: [...d.orgMembers, row] }, cardId, "Org chart");
  });
  return row;
}

export function patchMember(cardId: string, id: string, patch: Partial<OrgMember>) {
  updateDB((db) => touch({ ...db, orgMembers: db.orgMembers.map((m) => (m.id === id ? { ...m, ...patch } : m)) }, cardId, "Org chart"));
}

/** Removes a person; their reports move up to the removed person's manager. */
export function removeMember(cardId: string, id: string): OrgMember[] {
  const db = readDB();
  const target = db.orgMembers.find((m) => m.id === id);
  if (!target) return [];
  const before = db.orgMembers.filter((m) => m.orgChartId === target.orgChartId);
  updateDB((d) =>
    touch(
      {
        ...d,
        orgMembers: d.orgMembers
          .filter((m) => m.id !== id)
          .map((m) => (m.parentId === id ? { ...m, parentId: target.parentId } : m)),
      },
      cardId,
      "Org chart",
    ),
  );
  return before;
}

/** Replace all members of a chart (used for drag-to-nest and for undo). */
export function setMembers(cardId: string, orgChartId: string, members: OrgMember[]) {
  updateDB((db) =>
    touch({ ...db, orgMembers: [...db.orgMembers.filter((m) => m.orgChartId !== orgChartId), ...members] }, cardId, "Org chart"),
  );
}

/* ------------------------------------------------------------ Publishing */

/** Publish: freeze the current draft as the public snapshot. */
export function markPublished(cardId: string, publishedAt: string) {
  updateDB((db) => {
    const cards = db.cards.map((c) =>
      c.id === cardId ? { ...c, status: "published" as const, published_at: publishedAt, updated_at: publishedAt } : c,
    );
    const next = logChanges({ ...db, cards }, cardId, ["Published"]);
    const bundle = bundleFromDB(next, cardId);
    return bundle ? { ...next, snapshots: { ...db.snapshots, [cardId]: structuredClone(bundle) } } : next;
  });
}

export function markUnpublished(cardId: string) {
  updateDB((db) => {
    const snapshots = { ...db.snapshots };
    delete snapshots[cardId];
    return {
      ...db,
      snapshots,
      cards: db.cards.map((c) => (c.id === cardId ? { ...c, status: "draft" as const, updated_at: nowISO() } : c)),
    };
  });
}

/** Draft has edits that are not live yet. */
export function hasUnpublishedChanges(card: Card): boolean {
  return card.status === "published" && !!card.published_at && new Date(card.updated_at) > new Date(card.published_at);
}

/* --------------------------------------------------------------- Library */

/* -------------------------------------------------------- Template library */

export function toggleFavoriteTemplate(id: string) {
  updateLibrary((lib) => ({
    ...lib,
    favoriteTemplates: lib.favoriteTemplates.includes(id) ? lib.favoriteTemplates.filter((x) => x !== id) : [...lib.favoriteTemplates, id],
  }));
}

/** "Duplicate as a new template": a named preset on top of a base template. */
export function saveTemplate(input: Omit<SavedTemplate, "id" | "created_at">): SavedTemplate {
  const saved: SavedTemplate = { ...input, id: uid("tpl"), created_at: nowISO() };
  updateLibrary((lib) => ({ ...lib, savedTemplates: [saved, ...lib.savedTemplates] }));
  return saved;
}

export function removeSavedTemplate(id: string): SavedTemplate | undefined {
  const removed = readDB().library.savedTemplates.find((t) => t.id === id);
  updateLibrary((lib) => ({ ...lib, savedTemplates: lib.savedTemplates.filter((t) => t.id !== id) }));
  return removed;
}

export function restoreSavedTemplate(t: SavedTemplate) {
  updateLibrary((lib) => ({ ...lib, savedTemplates: [t, ...lib.savedTemplates] }));
}

/** Every library change goes through here so the backend has one place to persist it. */
function updateLibrary(fn: (lib: LibrarySettings) => LibrarySettings) {
  updateDB((db) => ({ ...db, library: fn(db.library) }));
  void saveLibrarySettings(); // TODO(backend): send the changed settings
}

export function patchLibrary(patch: Partial<LibrarySettings>) {
  updateLibrary((lib) => ({ ...lib, ...patch }));
}
