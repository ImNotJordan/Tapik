"use client";

import { Tooltip as T } from "radix-ui";
import type { ReactElement, ReactNode } from "react";

export function TooltipProvider({ children }: { children: ReactNode }) {
  return (
    <T.Provider delayDuration={350} skipDelayDuration={150}>
      {children}
    </T.Provider>
  );
}

export function Tooltip({
  content,
  children,
  side = "top",
}: {
  content: ReactNode;
  children: ReactElement;
  side?: "top" | "right" | "bottom" | "left";
}) {
  return (
    <T.Root>
      <T.Trigger asChild>{children}</T.Trigger>
      <T.Portal>
        <T.Content
          side={side}
          sideOffset={6}
          className="z-[80] max-w-64 rounded-md bg-studio-ink px-2.5 py-1.5 text-2xs font-medium text-studio-bg shadow-[0_4px_12px_rgb(0_0_0/0.18)] [animation:fade-in_120ms_ease-out]"
        >
          {content}
        </T.Content>
      </T.Portal>
    </T.Root>
  );
}
