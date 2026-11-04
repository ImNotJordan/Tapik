"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { cn } from "@/lib/utils";

export type Device = "phone" | "tablet" | "desktop";

export const DEVICES: Record<Device, { w: number; h: number; label: string }> = {
  phone: { w: 390, h: 844, label: "Phone" },
  tablet: { w: 768, h: 1024, label: "Tablet" },
  desktop: { w: 1280, h: 800, label: "Desktop" },
};

/** The element the card scrolls inside (null = the window). */
export const ScrollRootContext = createContext<RefObject<HTMLElement | null> | null>(null);
export function useScrollRoot() {
  return useContext(ScrollRootContext);
}

/**
 * Renders children at a real device width and scales the frame to fit,
 * so container queries and sticky bars behave as they will on the device.
 */
export function DevicePreview({
  device,
  children,
  urlLabel,
  className,
}: {
  device: Device;
  children: ReactNode;
  urlLabel?: string;
  className?: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const d = DEVICES[device];
  const bezel = device === "phone" ? 10 : device === "tablet" ? 14 : 0;
  const chrome = device === "desktop" ? 36 : 0;
  const outerW = d.w + bezel * 2;
  const outerH = d.h + bezel * 2 + chrome;

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setScale(Math.min(1, width / outerW, height / outerH));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [outerW, outerH]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [device]);

  return (
    <div ref={host} className={cn("relative flex min-h-0 w-full flex-1 items-start justify-center", className)}>
      <div style={{ width: outerW * scale, height: outerH * scale }} className="shrink-0">
        <div
          className={cn(
            "origin-top-left overflow-hidden bg-[#111412]",
            device === "phone" && "rounded-[52px] shadow-[0_30px_60px_-20px_rgb(0_0_0/0.35)]",
            device === "tablet" && "rounded-[36px] shadow-[0_30px_60px_-20px_rgb(0_0_0/0.3)]",
            device === "desktop" && "rounded-xl border border-studio-line-strong shadow-[0_24px_48px_-16px_rgb(0_0_0/0.25)]",
          )}
          style={{ width: outerW, height: outerH, transform: `scale(${scale})`, padding: bezel }}
        >
          {device === "desktop" && (
            <div className="flex h-9 items-center gap-3 bg-studio-raised px-3">
              <span aria-hidden className="flex gap-1.5">
                <i className="size-2.5 rounded-full bg-studio-line-strong" />
                <i className="size-2.5 rounded-full bg-studio-line-strong" />
                <i className="size-2.5 rounded-full bg-studio-line-strong" />
              </span>
              <span className="flex h-6 flex-1 items-center rounded-md bg-studio-surface px-3 text-2xs text-studio-ink-3">
                {urlLabel}
              </span>
            </div>
          )}
          <div
            ref={scroller}
            className={cn(
              "relative overflow-x-hidden overflow-y-auto overscroll-contain bg-white [scrollbar-width:none]",
              device === "phone" && "rounded-[42px]",
              device === "tablet" && "rounded-[22px]",
            )}
            style={{ width: d.w, height: d.h }}
          >
            <ScrollRootContext.Provider value={scroller}>{children}</ScrollRootContext.Provider>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Non-interactive, scaled-down render for thumbnails and galleries. */
export function MiniPreview({
  children,
  width = 390,
  height = 640,
  scale = 0.42,
  className,
}: {
  children: ReactNode;
  width?: number;
  height?: number;
  scale?: number;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      inert
      className={cn("pointer-events-none relative overflow-hidden select-none", className)}
      style={{ width: width * scale, height: height * scale }}
    >
      <div className="origin-top-left overflow-hidden" style={{ width, height, transform: `scale(${scale})` }}>
        {children}
      </div>
    </div>
  );
}
