"use client";

import { Dialog as D } from "radix-ui";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Modal dialog. Radix handles focus trap, Escape and focus return. */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  /** "full" fills the viewport (32px margin) for previews; its body is a flex column. */
  size?: "sm" | "md" | "lg" | "full";
}) {
  const width = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl", full: "h-[calc(100dvh-32px)] max-w-[1440px]" }[size];
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-[60] bg-[var(--studio-scrim)] [animation:fade-in_160ms_ease-out]" />
        <D.Content
          className={cn(
            "fixed top-1/2 left-1/2 z-[61] flex max-h-[calc(100dvh-32px)] w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border border-studio-line bg-studio-surface text-studio-ink shadow-[0_24px_64px_rgb(0_0_0/0.22)] [animation:dialog-in_220ms_var(--ease-out-expo)] focus:outline-none",
            width,
          )}
        >
          <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-3">
            <div className="flex min-w-0 flex-col gap-1">
              <D.Title className="text-lg font-semibold">{title}</D.Title>
              {description ? (
                <D.Description className="text-sm text-studio-ink-3">{description}</D.Description>
              ) : (
                <D.Description className="sr-only">{typeof title === "string" ? title : "Dialog"}</D.Description>
              )}
            </div>
            <D.Close
              aria-label="Close"
              className="-mt-1 -mr-2 inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-lg text-studio-ink-3 hover:bg-studio-raised hover:text-studio-ink"
            >
              <X aria-hidden className="size-[18px]" />
            </D.Close>
          </div>
          {children && <div className={cn("studio-scroll min-h-0 overflow-y-auto px-6 pb-5", size === "full" && "flex flex-1 flex-col")}>{children}</div>}
          {footer && (
            <div className="flex flex-wrap justify-end gap-2 border-t border-studio-line px-6 py-4">{footer}</div>
          )}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}

/** Side sheet on wide screens, bottom sheet on phones. */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  side = "right",
  className,
  overlayClassName,
  container,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  side?: "right" | "bottom";
  className?: string;
  overlayClassName?: string;
  container?: HTMLElement | null;
}) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal container={container ?? undefined}>
        <D.Overlay
          className={cn(
            "z-[60] bg-[var(--studio-scrim)] [animation:fade-in_160ms_ease-out]",
            container ? "absolute inset-0" : "fixed inset-0",
            overlayClassName,
          )}
        />
        <D.Content
          className={cn(
            "z-[61] flex flex-col bg-studio-surface text-studio-ink shadow-[0_-12px_40px_rgb(0_0_0/0.2)] focus:outline-none",
            container ? "absolute" : "fixed",
            side === "bottom"
              ? "inset-x-0 bottom-0 max-h-[85%] rounded-t-2xl [animation:sheet-up_280ms_var(--ease-out-expo)]"
              : "inset-x-0 bottom-0 max-h-[90dvh] rounded-t-2xl [animation:sheet-up_280ms_var(--ease-out-expo)] sm:inset-y-0 sm:right-0 sm:left-auto sm:max-h-none sm:w-[420px] sm:rounded-none sm:border-l sm:border-studio-line",
            className,
          )}
        >
          {side === "bottom" && <div aria-hidden className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-current opacity-20" />}
          <div className="flex items-start justify-between gap-4 px-5 pt-4 pb-3">
            <div className="flex min-w-0 flex-col gap-1">
              <D.Title className="text-lg font-semibold">{title}</D.Title>
              {description ? (
                <D.Description className="text-sm opacity-75">{description}</D.Description>
              ) : (
                <D.Description className="sr-only">{typeof title === "string" ? title : "Details"}</D.Description>
              )}
            </div>
            <D.Close
              aria-label="Close"
              className="-mr-2 inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg opacity-70 hover:opacity-100"
            >
              <X aria-hidden className="size-5" />
            </D.Close>
          </div>
          <div className="studio-scroll min-h-0 flex-1 overflow-y-auto px-5 pb-6">{children}</div>
          {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-current/10 px-5 py-4">{footer}</div>}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}

/** A dialog on wider screens and a bottom sheet on phones (same focus trap and Escape). */
export function AdaptiveDialog({
  desktop,
  size = "md",
  ...props
}: {
  desktop: boolean;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  return desktop ? <Dialog size={size} {...props} /> : <Sheet side="bottom" className="max-h-[92dvh]" {...props} />;
}
