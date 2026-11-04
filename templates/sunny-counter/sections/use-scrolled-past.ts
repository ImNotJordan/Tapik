"use client";

import { useEffect, useState, type RefObject } from "react";
import { useScrollRoot } from "@/components/ui/device-preview";

/** True once `ref` has scrolled above the top of the scroll root (window or preview frame). */
export function useScrolledPast(ref: RefObject<HTMLElement | null>): boolean {
  const root = useScrollRoot();
  const [past, setPast] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        const above = entry.boundingClientRect.top < (entry.rootBounds?.top ?? 0);
        setPast(!entry.isIntersecting && above);
      },
      { root: root?.current ?? null, threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, root]);
  return past;
}
