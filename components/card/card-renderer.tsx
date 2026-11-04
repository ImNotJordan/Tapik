"use client";

import { WifiOff } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { resolveCardStyle, resolveTokens } from "@/lib/design/resolve";
import { TEMPLATE_COMPONENTS } from "@/templates/components";
import { getTemplate } from "@/templates/registry";
import type { CardBundle, ReorderableSection } from "@/lib/types";
import { cn, publicCardUrl } from "@/lib/utils";
import { CardContext, type CardMode } from "./context";

/**
 * Renders one card from a bundle. The outer element carries the theme
 * variables; the inner `.card-root` is a size container so templates respond
 * to the card's own width (phone frame, tablet frame or the real viewport).
 */
export function CardRenderer({
  bundle,
  mode = "public",
  viewportHeight,
  className,
}: {
  bundle: CardBundle;
  mode?: CardMode;
  /** CSS length for one screen of height; the preview passes the frame height. */
  viewportHeight?: string;
  className?: string;
}) {
  const { card } = bundle;
  const portal = useRef<HTMLDivElement>(null);
  const template = getTemplate(card.templateId);
  const tokens = useMemo(() => resolveTokens(card), [card]);
  const style = useMemo(
    () => ({ ...resolveCardStyle(card), "--c-vh": viewportHeight ?? "100svh" }) as CSSProperties,
    [card, viewportHeight],
  );

  const ctx = useMemo(
    () => ({
      bundle,
      template,
      tokens,
      mode,
      url: publicCardUrl(card.slug),
      portal,
      isHidden: (key: string) => card.hiddenSections.includes(key as ReorderableSection),
    }),
    [bundle, template, tokens, mode, card.slug, card.hiddenSections],
  );

  const Template = TEMPLATE_COMPONENTS[template.id] ?? TEMPLATE_COMPONENTS.keepsake;

  return (
    <CardContext.Provider value={ctx}>
      <div
        style={style}
        data-template={template.id}
        data-fill={card.buttonFill}
        data-motion={card.motion && mode !== "thumbnail" ? "on" : "off"}
        className={cn("relative min-h-full bg-c-bg text-c-on-bg", className)}
      >
        {mode === "public" && <OfflineBanner />}
        <div className="card-root relative min-h-full">
          <Template bundle={bundle} tokens={tokens} mode={mode} />
        </div>
        <div ref={portal} className="contents" style={{ fontFamily: "var(--c-font-body)" }} />
      </div>
    </CardContext.Provider>
  );
}

/** Renders reorderable sections in the admin-defined order, skipping hidden ones. */
export function OrderedSections({
  order,
  hidden,
  render,
}: {
  order: ReorderableSection[];
  hidden: string[];
  render: Partial<Record<ReorderableSection, () => ReactNode>>;
}) {
  return (
    <>
      {order
        .filter((key) => !hidden.includes(key))
        .map((key) => {
          const node = render[key]?.();
          return node ? <SectionSlot key={key}>{node}</SectionSlot> : null;
        })}
    </>
  );
}

function SectionSlot({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  if (!offline) return null;
  return (
    <div role="status" className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-c-on-bg px-4 py-2.5 text-center text-sm font-medium text-c-bg">
      <WifiOff aria-hidden className="size-4 shrink-0" />
      You’re offline. Call and Message still work; photos may not load.
    </div>
  );
}
