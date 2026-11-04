"use client";

import { ImageOff } from "lucide-react";
import { Component, memo, useEffect, useRef, useState, type ReactNode } from "react";
import type { CardBundle } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CardRenderer } from "@/components/card/card-renderer";

/*
 * Live thumbnails are real cards scaled down, so they cost real renders.
 * Three limits keep a grid of them smooth:
 *  1. render only near the viewport (IntersectionObserver), unmount when far away;
 *  2. at most MAX_LIVE mounted at once, the rest wait in a queue;
 *  3. mount at most PER_FRAME per animation frame so scrolling never stalls.
 */
const MAX_LIVE = 18;
const PER_FRAME = 2;

type Slot = { grant: () => void; state: "waiting" | "granted" | "released" };
const waiting: Slot[] = [];
let active = 0;
let scheduled = false;

function pump() {
  scheduled = false;
  let granted = 0;
  while (active < MAX_LIVE && waiting.length && granted < PER_FRAME) {
    const slot = waiting.shift()!;
    if (slot.state !== "waiting") continue;
    slot.state = "granted";
    active++;
    granted++;
    slot.grant();
  }
  if (waiting.length && active < MAX_LIVE) schedule();
}

function schedule() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(pump);
}

function requestSlot(grant: () => void): () => void {
  const slot: Slot = { grant, state: "waiting" };
  waiting.push(slot);
  schedule();
  return () => {
    if (slot.state === "granted") active--;
    slot.state = "released";
    schedule();
  };
}

class ThumbnailBoundary extends Component<{ children: ReactNode; resetKey: unknown }, { failed: boolean; key: unknown }> {
  state = { failed: false, key: this.props.resetKey };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  static getDerivedStateFromProps(props: { resetKey: unknown }, state: { failed: boolean; key: unknown }) {
    return props.resetKey !== state.key ? { failed: false, key: props.resetKey } : null;
  }
  render() {
    if (this.state.failed) {
      return (
        <div className="flex size-full flex-col items-center justify-center gap-2 bg-studio-raised p-4 text-center text-2xs text-studio-ink-3">
          <ImageOff aria-hidden className="size-5" strokeWidth={1.75} />
          Preview unavailable
        </div>
      );
    }
    return this.props.children;
  }
}

export type ThumbnailProps = {
  bundle: CardBundle;
  /** Device width the card renders at. */
  width?: number;
  /** Device height the card renders at (the visible crop). */
  height?: number;
  scale?: number;
  className?: string;
  /** Render immediately, skipping the viewport check (for a single, always-visible preview). */
  eager?: boolean;
};

/** A live, non-interactive, scaled-down card. Pass a memoized bundle. */
export const TemplateThumbnail = memo(function TemplateThumbnail({ bundle, width = 390, height = 700, scale = 0.43, className, eager }: ThumbnailProps) {
  const host = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const [granted, setGranted] = useState(false);

  useEffect(() => {
    if (eager) return;
    const el = host.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setNear(e.isIntersecting), { rootMargin: "320px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [eager]);

  useEffect(() => {
    if (eager || !near) return;
    const release = requestSlot(() => setGranted(true));
    return () => {
      release();
      setGranted(false);
    };
  }, [near, eager]);

  const live = eager || granted;

  return (
    <div
      ref={host}
      aria-hidden
      inert
      className={cn("pointer-events-none relative shrink-0 overflow-hidden select-none", className)}
      style={{ width: width * scale, height: height * scale }}
    >
      {live ? (
        <div className="origin-top-left overflow-hidden" style={{ width, height, transform: `scale(${scale})` }}>
          <ThumbnailBoundary resetKey={bundle}>
            <CardRenderer bundle={bundle} mode="thumbnail" viewportHeight={`${height}px`} />
          </ThumbnailBoundary>
        </div>
      ) : (
        <div className="skeleton size-full" />
      )}
    </div>
  );
});
