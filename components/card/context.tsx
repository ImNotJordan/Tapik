"use client";

import { createContext, useContext, type RefObject } from "react";
import type { TemplateManifest } from "@/templates/types";
import type { CardBundle, ThemeTokens } from "@/lib/types";

export type CardMode = "public" | "preview" | "thumbnail";

export type CardCtx = {
  bundle: CardBundle;
  template: TemplateManifest;
  tokens: ThemeTokens;
  mode: CardMode;
  url: string;
  /** Element that dialogs, sheets and the lightbox portal into (inside the themed root). */
  portal: RefObject<HTMLDivElement | null>;
  isHidden: (key: string) => boolean;
};

export const CardContext = createContext<CardCtx | null>(null);

export function useCard(): CardCtx {
  const ctx = useContext(CardContext);
  if (!ctx) throw new Error("useCard must be used inside <CardRenderer>");
  return ctx;
}
