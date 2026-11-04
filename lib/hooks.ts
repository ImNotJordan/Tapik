"use client";

import { useCallback, useSyncExternalStore } from "react";

/** Matches a media query; false on the server and during hydration. */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (cb: () => void) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    [query],
  );
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);
}

/** Phones get bottom sheets; wider screens get dialogs. */
export function useIsDesktop(): boolean {
  return useMediaQuery("(min-width: 640px)");
}
