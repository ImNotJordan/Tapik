"use client";
import type { Result } from "@/lib/services/types";
import { CircleAlert, CircleCheck, ImagePlus, RotateCcw, X } from "lucide-react";
import { useCallback, useId, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type UploadItem = {
  id: string;
  name: string;
  progress: number;
  status: "uploading" | "done" | "error";
  error?: string;
  file: File;
};

/** Queue of uploads with progress, success, error and cancel per file. */
export function useUploadQueue<T>(
  upload: (file: File, onProgress: (p: number) => void, signal: AbortSignal) => Promise<Result<T>>,
  onDone: (data: T, file: File) => void,
) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const seq = useRef(0);
  const controllers = useRef(new Map<string, AbortController>());

  const run = useCallback(
    async (item: UploadItem) => {
      const ctrl = new AbortController();
      controllers.current.set(item.id, ctrl);
      const res = await upload(
        item.file,
        (p) => setItems((xs) => xs.map((x) => (x.id === item.id ? { ...x, progress: p } : x))),
        ctrl.signal,
      );
      controllers.current.delete(item.id);
      if (ctrl.signal.aborted) return; // cancelled: the row is already gone
      if (res.ok) {
        onDone(res.data, item.file);
        setItems((xs) => xs.map((x) => (x.id === item.id ? { ...x, status: "done", progress: 100 } : x)));
        setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== item.id)), 2200);
      } else {
        setItems((xs) => xs.map((x) => (x.id === item.id ? { ...x, status: "error", error: res.error } : x)));
      }
    },
    [upload, onDone],
  );

  const add = useCallback(
    (files: File[]) => {
      const fresh = files.map<UploadItem>((file) => ({
        id: `u${seq.current++}`,
        name: file.name,
        progress: 0,
        status: "uploading",
        file,
      }));
      setItems((xs) => [...xs, ...fresh]);
      fresh.forEach(run);
    },
    [run],
  );

  const retry = useCallback(
    (id: string) => {
      const item = items.find((x) => x.id === id);
      if (!item) return;
      const reset = { ...item, status: "uploading" as const, progress: 0, error: undefined };
      setItems((xs) => xs.map((x) => (x.id === id ? reset : x)));
      run(reset);
    },
    [items, run],
  );

  /** Removes a row; if it's still uploading, the upload is cancelled. */
  const dismiss = useCallback((id: string) => {
    controllers.current.get(id)?.abort();
    controllers.current.delete(id);
    setItems((xs) => xs.filter((x) => x.id !== id));
  }, []);

  return { items, add, retry, dismiss, busy: items.some((x) => x.status === "uploading") };
}

/**
 * Drop area with empty, dragging-over, uploading, success and error states.
 * The visible label names what to drop; the browse button is a real input.
 */
export function Dropzone({
  accept = "image/*",
  multiple = false,
  onFiles,
  title,
  hint,
  items = [],
  onRetry,
  onDismiss,
  disabled,
  disabledReason,
  compact,
  icon,
}: {
  accept?: string;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  title: string;
  hint?: string;
  items?: UploadItem[];
  onRetry?: (id: string) => void;
  onDismiss?: (id: string) => void;
  disabled?: boolean;
  disabledReason?: string;
  compact?: boolean;
  icon?: ReactNode;
}) {
  const id = useId();
  const [over, setOver] = useState(false);
  const depth = useRef(0);

  const accepts = (f: File) =>
    accept
      .split(",")
      .map((a) => a.trim())
      .some((a) => (a.endsWith("/*") ? f.type.startsWith(a.slice(0, -1)) : f.type === a || f.name.toLowerCase().endsWith(a)));

  const take = (list: FileList | null) => {
    if (!list || disabled) return;
    const files = Array.from(list);
    onFiles(multiple ? files : files.slice(0, 1));
  };

  return (
    <div className="flex flex-col gap-2">
      <div
        onDragEnter={(e) => {
          e.preventDefault();
          depth.current++;
          if (!disabled) setOver(true);
        }}
        onDragLeave={() => {
          depth.current--;
          if (depth.current <= 0) setOver(false);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          depth.current = 0;
          setOver(false);
          const files = Array.from(e.dataTransfer.files);
          const bad = files.filter((f) => !accepts(f));
          if (bad.length && files.length === bad.length) return onFiles(bad);
          take(e.dataTransfer.files);
        }}
        className={cn(
          "relative flex flex-col items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed text-center transition-[background-color,border-color] duration-150",
          compact ? "px-4 py-5" : "px-6 py-8",
          disabled
            ? "border-studio-line bg-studio-raised/50"
            : over
              ? "border-studio-action bg-studio-action-soft"
              : "border-studio-line-strong bg-studio-surface hover:border-studio-ink-3",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "flex size-10 items-center justify-center rounded-full transition-colors",
            over ? "bg-studio-action text-studio-on-action" : "bg-studio-raised text-studio-ink-2",
          )}
        >
          {icon ?? <ImagePlus className="size-5" />}
        </span>
        <p className="text-sm font-semibold text-studio-ink">{over ? "Drop to upload" : title}</p>
        {disabled && disabledReason ? (
          <p className="text-2xs text-studio-ink-3">{disabledReason}</p>
        ) : (
          <p className="text-2xs text-studio-ink-3">
            Drag files here or{" "}
            <label
              htmlFor={id}
              className="cursor-pointer font-semibold text-studio-action-ink underline underline-offset-2 hover:no-underline"
            >
              browse
            </label>
            {hint ? `. ${hint}` : ""}
          </p>
        )}
        <input
          id={id}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          className="sr-only"
          onChange={(e) => {
            take(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {items.length > 0 && (
        <ul className="flex flex-col gap-1.5" aria-label="Uploads">
          {items.map((it) => (
            <li
              key={it.id}
              ref={(el) => {
                // A new row, or one that just failed, can land under a fixed bottom bar
                // (New card flow, editor on phones): bring it into view above the bar.
                if (!el || el.dataset.seen === it.status) return;
                el.dataset.seen = it.status;
                if (it.status !== "done") {
                  const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
                  requestAnimationFrame(() => el.scrollIntoView({ block: "nearest", behavior: smooth ? "smooth" : "auto" }));
                }
              }}
              className={cn(
                "flex scroll-mt-20 scroll-mb-28 items-center gap-3 rounded-lg border px-3 py-2",
                it.status === "error" ? "border-studio-danger/40 bg-studio-danger-soft" : "border-studio-line bg-studio-surface",
              )}
            >
              {it.status === "done" ? (
                <CircleCheck aria-hidden className="size-4 shrink-0 text-studio-success" />
              ) : it.status === "error" ? (
                <CircleAlert aria-hidden className="size-4 shrink-0 text-studio-danger" />
              ) : (
                <span aria-hidden className="size-4 shrink-0 animate-spin rounded-full border-2 border-studio-line border-t-studio-action" />
              )}
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-2xs font-medium text-studio-ink">{it.name}</span>
                  <span className="shrink-0 text-2xs tabular-nums text-studio-ink-3">
                    {it.status === "done" ? "Uploaded" : it.status === "error" ? "Failed" : `${it.progress}%`}
                  </span>
                </div>
                {it.status === "error" ? (
                  <p className="text-2xs text-studio-danger-ink">{it.error}</p>
                ) : (
                  <div
                    role="progressbar"
                    aria-label={`Uploading ${it.name}`}
                    aria-valuenow={it.progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    className="h-1 overflow-hidden rounded-full bg-studio-line"
                  >
                    <div
                      className="h-full rounded-full bg-studio-action transition-[width] duration-300 ease-out"
                      style={{ width: `${it.progress}%` }}
                    />
                  </div>
                )}
              </div>
              {it.status === "error" && onRetry && (
                <button
                  type="button"
                  onClick={() => onRetry(it.id)}
                  aria-label={`Retry ${it.name}`}
                  className="inline-flex size-9 cursor-pointer items-center justify-center rounded-md text-studio-ink-2 hover:bg-studio-surface"
                >
                  <RotateCcw aria-hidden className="size-4" />
                </button>
              )}
              {it.status === "uploading" && onDismiss && (
                <button
                  type="button"
                  onClick={() => onDismiss(it.id)}
                  aria-label={`Cancel upload of ${it.name}`}
                  className="inline-flex size-9 cursor-pointer items-center justify-center rounded-md text-studio-ink-2 hover:bg-studio-raised"
                >
                  <X aria-hidden className="size-4" />
                </button>
              )}
              {it.status === "error" && onDismiss && (
                <button
                  type="button"
                  onClick={() => onDismiss(it.id)}
                  aria-label={`Dismiss ${it.name}`}
                  className="inline-flex size-9 cursor-pointer items-center justify-center rounded-md text-studio-ink-2 hover:bg-studio-surface"
                >
                  <X aria-hidden className="size-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
