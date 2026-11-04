"use client";

import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from "react";

/**
 * One line of display type that never wraps or breaks mid-word: it renders at
 * `max` and shrinks to the container's width. Works for any font pairing and
 * any name length. The CSS estimate in `max` keeps the first paint close.
 */
export function FitLine({ children, max, style }: { children: ReactNode; max: string; style?: CSSProperties }) {
  const ref = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    const box = el?.parentElement;
    if (!el || !box) return;
    const fit = () => {
      el.style.fontSize = max;
      const avail = box.clientWidth - parseFloat(getComputedStyle(box).paddingLeft) - parseFloat(getComputedStyle(box).paddingRight);
      const need = el.scrollWidth;
      if (need > avail && need > 0) {
        const px = parseFloat(getComputedStyle(el).fontSize);
        el.style.fontSize = `${Math.floor(px * (avail / need) * 0.98)}px`;
      }
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(box);
    document.fonts?.ready.then(fit);
    return () => ro.disconnect();
  }, [max, children]);

  return (
    <span ref={ref} className="block w-max max-w-none whitespace-nowrap" style={{ ...style, fontSize: max }}>
      {children}
    </span>
  );
}
