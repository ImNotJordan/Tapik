"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { patchCard, saveCardDraft } from "@/lib/services/cards";
import type { Card, CardBundle, Client, Role } from "@/lib/types";
import { getTemplate, lookFor } from "@/templates/registry";
import type { Device } from "@/components/ui/device-preview";

export type EditorTab = "content" | "media" | "socials" | "photos" | "org" | "map" | "details" | "sections" | "design" | "share";

export const EDITOR_TABS: EditorTab[] = ["content", "media", "socials", "photos", "org", "map", "details", "sections", "design", "share"];

/** Tabs a client can open in the Client Portal. Share (slug, NFC, QR, unpublish) is the admin's. */
export const CLIENT_TABS: EditorTab[] = ["content", "media", "photos", "socials", "org", "map", "details", "sections", "design"];

export type SaveState = { status: "idle" | "saving" | "saved" | "error"; savedAt?: string; error?: string };

type Ctx = {
  bundle: CardBundle;
  card: Card;
  patch: (p: Partial<Card>) => void;
  save: SaveState;
  retrySave: () => void;
  /** Fields holding a value that failed validation (not written to the card). */
  invalid: Record<string, string>;
  setInvalid: (key: string, message: string | null) => void;
  tab: EditorTab;
  setTab: (t: EditorTab) => void;
  device: Device;
  setDevice: (d: Device) => void;
  /** Same editor for both: the client role hides admin-only controls. */
  role: Role;
  client?: Client;
  /**
   * A locked template shown on the client's own card in the preview only
   * ("Previewing X, not applied"), in one of its themes. Never saved.
   */
  templatePreview: TemplatePreview | null;
  setTemplatePreview: (t: TemplatePreview | null) => void;
  /** The bundle the live preview renders: the saved card, or in the previewed template. */
  previewBundle: CardBundle;
};

export type TemplatePreview = { templateId: string; themeId: string };

const EditorCtx = createContext<Ctx | null>(null);

export function useEditor(): Ctx {
  const ctx = useContext(EditorCtx);
  if (!ctx) throw new Error("useEditor must be used inside <EditorProvider>");
  return ctx;
}

export function EditorProvider({
  bundle,
  tab,
  setTab,
  role = "admin",
  client,
  children,
}: {
  bundle: CardBundle;
  tab: EditorTab;
  setTab: (t: EditorTab) => void;
  role?: Role;
  client?: Client;
  children: ReactNode;
}) {
  const card = bundle.card;
  const [templatePreview, setTemplatePreview] = useState<TemplatePreview | null>(null);
  // Leaving the Design tab ends a theme preview.
  const changeTab = useCallback(
    (t: EditorTab) => {
      if (t !== "design") setTemplatePreview(null);
      setTab(t);
    },
    [setTab],
  );
  const previewBundle = useMemo(
    () => (templatePreview ? { ...bundle, card: { ...bundle.card, ...lookFor(getTemplate(templatePreview.templateId), templatePreview.themeId) } } : bundle),
    [bundle, templatePreview],
  );
  const [save, setSave] = useState<SaveState>({ status: "idle", savedAt: card.updated_at });
  const [invalid, setInvalidState] = useState<Record<string, string>>({});
  const [device, setDevice] = useState<Device>("phone");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSeen = useRef(card.updated_at);
  const latest = useRef(card);
  useEffect(() => {
    latest.current = card;
  }, [card]);

  const runSave = useCallback(async () => {
    setSave((s) => ({ ...s, status: "saving" }));
    const res =
      typeof navigator !== "undefined" && !navigator.onLine
        ? ({ ok: false, error: "You’re offline. Changes are kept in this browser and save when you reconnect." } as const)
        : await saveCardDraft(latest.current);
    setSave(res.ok ? { status: "saved", savedAt: res.data.savedAt } : { status: "error", error: res.error });
  }, []);

  // Autosave: any change to the card (including photos, socials, org chart) bumps updated_at.
  useEffect(() => {
    if (card.updated_at === lastSeen.current) return;
    lastSeen.current = card.updated_at;
    setSave((s) => ({ ...s, status: "saving" }));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(runSave, 700);
  }, [card.updated_at, runSave]);

  useEffect(() => {
    const onOnline = () => save.status === "error" && runSave();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [save.status, runSave]);

  // Unsaved-change protection: warn before closing the tab mid-save or with invalid fields.
  const pending = save.status === "saving" || save.status === "error" || Object.keys(invalid).length > 0;
  useEffect(() => {
    if (!pending) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [pending]);

  const patch = useCallback((p: Partial<Card>) => patchCard(card.id, p), [card.id]);
  const setInvalid = useCallback((key: string, message: string | null) => {
    setInvalidState((cur) => {
      if (message === null) {
        if (!(key in cur)) return cur;
        const next = { ...cur };
        delete next[key];
        return next;
      }
      return cur[key] === message ? cur : { ...cur, [key]: message };
    });
  }, []);

  return (
    <EditorCtx.Provider
      value={{ bundle, card, patch, save, retrySave: runSave, invalid, setInvalid, tab, setTab: changeTab, device, setDevice, role, client, templatePreview, setTemplatePreview, previewBundle }}
    >
      {children}
    </EditorCtx.Provider>
  );
}
