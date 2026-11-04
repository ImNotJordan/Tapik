"use client";

import { Slider as RSlider, Switch } from "radix-ui";
import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/* ---------------------------------------------------------------- Toggle */

export function Toggle({
  checked,
  onCheckedChange,
  label,
  description,
  disabled,
  id: idProp,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  id?: string;
}) {
  const auto = useId();
  const id = idProp ?? `t${auto}`;
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-0.5">
        <label htmlFor={id} className="cursor-pointer text-sm font-semibold text-studio-ink">
          {label}
        </label>
        {description && (
          <p id={`${id}-d`} className="text-2xs text-studio-ink-3">
            {description}
          </p>
        )}
      </div>
      <Switch.Root
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-describedby={description ? `${id}-d` : undefined}
        className="relative mt-0.5 inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full border border-transparent bg-studio-line-strong transition-colors duration-200 data-[state=checked]:bg-studio-action disabled:cursor-not-allowed disabled:opacity-50 before:absolute before:-inset-2.5 before:content-['']"
      >
        <Switch.Thumb className="block size-5 translate-x-0.5 rounded-full bg-white shadow-[0_1px_2px_rgb(0_0_0/0.25)] transition-transform duration-200 [transition-timing-function:var(--ease-out-quart)] data-[state=checked]:translate-x-[18px]" />
      </Switch.Root>
    </div>
  );
}

/* ---------------------------------------------------------------- Slider */

export function Slider({
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  label,
  format = (v) => String(v),
  id: idProp,
}: {
  value: number;
  onValueChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label: string;
  format?: (v: number) => string;
  id?: string;
}) {
  const auto = useId();
  const id = idProp ?? `s${auto}`;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span id={`${id}-l`} className="text-sm font-semibold text-studio-ink">
          {label}
        </span>
        <span className="text-sm tabular-nums text-studio-ink-3">{format(value)}</span>
      </div>
      <RSlider.Root
        value={[value]}
        onValueChange={([v]) => onValueChange(v)}
        min={min}
        max={max}
        step={step}
        className="relative flex h-6 w-full touch-none items-center select-none"
      >
        <RSlider.Track className="relative h-1.5 grow overflow-hidden rounded-full bg-studio-line">
          <RSlider.Range className="absolute h-full bg-studio-action" />
        </RSlider.Track>
        <RSlider.Thumb
          aria-labelledby={`${id}-l`}
          aria-valuetext={format(value)}
          className="block size-5 cursor-grab rounded-full border-2 border-studio-action bg-studio-surface shadow-[0_1px_3px_rgb(0_0_0/0.2)] active:cursor-grabbing"
        />
      </RSlider.Root>
    </div>
  );
}

/* ------------------------------------------------------------ Segmented */

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  size = "md",
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode; icon?: ReactNode; ariaLabel?: string }[];
  label: string;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("inline-grid auto-cols-fr grid-flow-col gap-0.5 rounded-[10px] bg-studio-raised p-[3px]", className)}
      onKeyDown={(e) => {
        const i = options.findIndex((o) => o.value === value);
        if (e.key === "ArrowRight" || e.key === "ArrowDown") {
          e.preventDefault();
          onChange(options[(i + 1) % options.length].value);
        } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
          e.preventDefault();
          onChange(options[(i - 1 + options.length) % options.length].value);
        }
      }}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={o.ariaLabel}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(o.value)}
            className={cn(
              "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-[7px] px-3 font-medium whitespace-nowrap transition-colors duration-150 [&_svg]:size-4",
              size === "sm" ? "h-8 text-2xs" : "h-9 text-sm",
              active
                ? "bg-studio-surface font-semibold text-studio-ink shadow-[0_1px_2px_rgb(0_0_0/0.1)]"
                : "text-studio-ink-2 hover:text-studio-ink",
            )}
          >
            {o.icon}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------- Badge */

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: "neutral" | "success" | "warn" | "danger" | "action";
  children: ReactNode;
  className?: string;
}) {
  const tones = {
    neutral: "bg-studio-raised text-studio-ink-2",
    success: "bg-studio-success-soft text-studio-success",
    warn: "bg-studio-warn-soft text-studio-warn-ink",
    danger: "bg-studio-danger-soft text-studio-danger-ink",
    action: "bg-studio-action-soft text-studio-action-ink",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-md px-2 text-2xs font-semibold whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status, dirty }: { status: "draft" | "published"; dirty?: boolean }) {
  if (status === "draft") return <Badge tone="warn">Draft</Badge>;
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <Badge tone="success">
        <span aria-hidden className="size-1.5 rounded-full bg-current" />
        Published
      </Badge>
      {dirty && <Badge tone="neutral">Unpublished changes</Badge>}
    </span>
  );
}

/* -------------------------------------------------------------- Skeleton */

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton rounded-md", className)} />;
}
