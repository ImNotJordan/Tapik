import { cn } from "@/lib/utils";

/* Shared by client components and server pages (which can't call client functions). */
export type Variant = "primary" | "secondary" | "ghost" | "danger" | "danger-ghost";
export type Size = "sm" | "md" | "lg";

export const base =
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold whitespace-nowrap select-none transition-[background-color,border-color,color,transform] duration-150 ease-out active:translate-y-px disabled:pointer-events-none disabled:opacity-50 cursor-pointer";

export const variants: Record<Variant, string> = {
  primary: "bg-studio-action text-studio-on-action hover:bg-studio-action-hover",
  secondary: "border border-studio-line-strong bg-studio-surface text-studio-ink hover:bg-studio-raised",
  ghost: "text-studio-ink-2 hover:bg-studio-raised hover:text-studio-ink",
  danger: "bg-studio-danger text-studio-on-danger hover:brightness-95",
  "danger-ghost": "text-studio-danger-ink hover:bg-studio-danger-soft",
};

export const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-5 text-base",
};

export function buttonClass(variant: Variant = "secondary", size: Size = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

