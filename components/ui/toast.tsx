"use client";

import { CircleAlert, CircleCheck, Info, X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "success" | "error" | "info";
type ToastItem = {
  id: number;
  tone: Tone;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  duration: number;
};

type ToastApi = {
  show: (t: Omit<ToastItem, "id" | "duration"> & { duration?: number }) => void;
  success: (title: string, opts?: Partial<Omit<ToastItem, "id" | "tone" | "title">>) => void;
  error: (title: string, opts?: Partial<Omit<ToastItem, "id" | "tone" | "title">>) => void;
};

const Ctx = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const next = useRef(1);

  const dismiss = useCallback((id: number) => setItems((xs) => xs.filter((t) => t.id !== id)), []);

  const show = useCallback<ToastApi["show"]>((t) => {
    const id = next.current++;
    // Toasts with an action (Undo) stay longer so there is time to use it.
    const duration = t.duration ?? (t.action ? 7000 : t.tone === "error" ? 6000 : 3500);
    setItems((xs) => [...xs.slice(-2), { ...t, id, duration }]);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (title, opts) => show({ tone: "success", title, ...opts }),
      error: (title, opts) => show({ tone: "error", title, ...opts }),
    }),
    [show],
  );

  return (
    <Ctx.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        aria-relevant="additions"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[90] flex flex-col items-center gap-2 p-4 sm:items-end"
      >
        {items.map((t) => (
          <ToastView key={t.id} item={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </Ctx.Provider>
  );
}

function ToastView({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return;
    const t = setTimeout(onDismiss, item.duration);
    return () => clearTimeout(t);
  }, [paused, item.duration, onDismiss]);

  const Icon = item.tone === "success" ? CircleCheck : item.tone === "error" ? CircleAlert : Info;
  return (
    <div
      role={item.tone === "error" ? "alert" : "status"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-studio-line bg-studio-surface py-3 pr-2 pl-4 text-studio-ink shadow-[0_12px_32px_rgb(0_0_0/0.16)] [animation:toast-in_240ms_var(--ease-out-expo)]"
    >
      <Icon
        aria-hidden
        className={cn(
          "mt-0.5 size-[18px] shrink-0",
          item.tone === "success" && "text-studio-success",
          item.tone === "error" && "text-studio-danger",
          item.tone === "info" && "text-studio-ink-3",
        )}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 py-px">
        <p className="text-sm font-semibold">{item.title}</p>
        {item.description && <p className="text-2xs text-studio-ink-3">{item.description}</p>}
      </div>
      {item.action && (
        <button
          type="button"
          onClick={() => {
            item.action!.onClick();
            onDismiss();
          }}
          className="h-9 shrink-0 cursor-pointer rounded-md px-3 text-sm font-semibold text-studio-action-ink hover:bg-studio-action-soft"
        >
          {item.action.label}
        </button>
      )}
      <button
        type="button"
        aria-label="Dismiss"
        onClick={onDismiss}
        className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-md text-studio-ink-3 hover:bg-studio-raised"
      >
        <X aria-hidden className="size-4" />
      </button>
    </div>
  );
}
