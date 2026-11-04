"use client";

import { DropdownMenu as M } from "radix-ui";
import type { ReactElement, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type MenuItem =
  | { type?: "item"; label: string; icon?: ReactNode; onSelect: () => void; danger?: boolean; disabled?: boolean }
  | { type: "separator" };

/** Keyboard-accessible overflow menu (arrow keys, type-ahead, Escape). */
export function Menu({ trigger, items, align = "end" }: { trigger: ReactElement; items: MenuItem[]; align?: "start" | "end" }) {
  return (
    <M.Root modal={false}>
      <M.Trigger asChild>{trigger}</M.Trigger>
      <M.Portal>
        <M.Content
          align={align}
          sideOffset={6}
          className="z-[70] min-w-52 rounded-xl border border-studio-line bg-studio-surface p-1.5 text-studio-ink shadow-[0_12px_32px_rgb(0_0_0/0.14)] [animation:fade-in_120ms_ease-out]"
        >
          {items.map((it, i) =>
            it.type === "separator" ? (
              <M.Separator key={i} className="my-1 h-px bg-studio-line" />
            ) : (
              <M.Item
                key={i}
                disabled={it.disabled}
                onSelect={it.onSelect}
                className={cn(
                  "flex h-10 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-45 data-[highlighted]:bg-studio-raised [&_svg]:size-4 [&_svg]:shrink-0",
                  it.danger ? "text-studio-danger-ink" : "text-studio-ink",
                )}
              >
                {it.icon}
                {it.label}
              </M.Item>
            ),
          )}
        </M.Content>
      </M.Portal>
    </M.Root>
  );
}
