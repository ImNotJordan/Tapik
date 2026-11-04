"use client";

import { CircleAlert } from "lucide-react";
import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";

/** Label + control + hint/error, wired with ids for assistive tech. */
export function Field({
  label,
  hint,
  error,
  counter,
  optional,
  children,
  className,
  id: idProp,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  counter?: { value: number; max: number };
  optional?: boolean;
  className?: string;
  id?: string;
  children: (ids: { id: string; describedBy?: string; invalid: boolean }) => ReactNode;
}) {
  const auto = useId();
  const id = idProp ?? `f${auto}`;
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-err` : undefined;
  const describedBy = [errId, hintId].filter(Boolean).join(" ") || undefined;
  const over = counter && counter.value > counter.max;

  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-semibold text-studio-ink">
          {label}
          {optional && <span className="ml-1.5 font-normal text-studio-ink-3">Optional</span>}
        </label>
        {counter && (
          <span
            className={cn("text-2xs tabular-nums", over ? "font-semibold text-studio-danger-ink" : "text-studio-ink-3")}
            aria-live="polite"
          >
            {counter.value} / {counter.max}
          </span>
        )}
      </div>
      {children({ id, describedBy, invalid: !!error })}
      {error ? (
        <p id={errId} className="flex items-start gap-1.5 text-2xs font-medium text-studio-danger-ink">
          <CircleAlert aria-hidden className="mt-px size-3.5 shrink-0" />
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-2xs text-studio-ink-3">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

const control =
  "w-full min-w-0 rounded-lg border bg-studio-surface px-3 text-[15px] text-studio-ink placeholder:text-studio-ink-3 transition-[border-color,box-shadow] duration-150 focus:outline-none focus-visible:outline-none focus:border-studio-action focus:shadow-[0_0_0_3px_var(--studio-action-soft)] disabled:bg-studio-raised disabled:text-studio-ink-3";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  function Input({ className, invalid, ...rest }, ref) {
    return (
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          control,
          "h-11",
          invalid ? "border-studio-danger focus:border-studio-danger focus:shadow-[0_0_0_3px_var(--studio-danger-soft)]" : "border-studio-line-strong",
          className,
        )}
        {...rest}
      />
    );
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(
  function Textarea({ className, invalid, rows = 3, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        rows={rows}
        aria-invalid={invalid || undefined}
        className={cn(
          control,
          "resize-y py-2.5 leading-relaxed",
          invalid ? "border-studio-danger" : "border-studio-line-strong",
          className,
        )}
        {...rest}
      />
    );
  },
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }>(
  function Select({ className, invalid, children, ...rest }, ref) {
    return (
      <div className="relative">
        <select
          ref={ref}
          aria-invalid={invalid || undefined}
          className={cn(
            control,
            "h-11 cursor-pointer appearance-none pr-9",
            invalid ? "border-studio-danger" : "border-studio-line-strong",
            className,
          )}
          {...rest}
        >
          {children}
        </select>
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-studio-ink-3"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>
    );
  },
);

/** Section heading inside a studio panel. */
export function PanelSection({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex flex-col gap-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h3 className="text-base font-semibold text-studio-ink">{title}</h3>
          {description && <p className="text-sm text-studio-ink-3">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}
