"use client";

import { Tabs as T } from "radix-ui";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Tabs({
  value,
  onValueChange,
  tabs,
  label,
  className,
}: {
  value: string;
  onValueChange: (v: string) => void;
  tabs: { value: string; label: ReactNode; content: ReactNode }[];
  label: string;
  className?: string;
}) {
  return (
    <T.Root value={value} onValueChange={onValueChange} className={cn("flex flex-col gap-5", className)}>
      <T.List aria-label={label} className="flex gap-1 overflow-x-auto border-b border-studio-line">
        {tabs.map((t) => (
          <T.Trigger
            key={t.value}
            value={t.value}
            className="relative -mb-px h-10 shrink-0 cursor-pointer border-b-2 border-transparent px-3 text-sm font-medium text-studio-ink-3 transition-colors hover:text-studio-ink data-[state=active]:border-studio-action data-[state=active]:font-semibold data-[state=active]:text-studio-ink"
          >
            {t.label}
          </T.Trigger>
        ))}
      </T.List>
      {tabs.map((t) => (
        <T.Content key={t.value} value={t.value} className="focus:outline-none">
          {t.content}
        </T.Content>
      ))}
    </T.Root>
  );
}
