"use client";

import Link from "next/link";
import { forwardRef, type ButtonHTMLAttributes, type ComponentProps, type ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip } from "./tooltip";

import { base, buttonClass, variants, type Size, type Variant } from "./button-styles";

export { buttonClass };

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", loading, icon, className, children, disabled, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClass(variant, size, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : icon}
      {children}
    </button>
  );
});

export function LinkButton({
  variant = "secondary",
  size = "md",
  icon,
  className,
  children,
  ...rest
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size; icon?: ReactNode }) {
  return (
    <Link className={buttonClass(variant, size, className)} {...rest}>
      {icon}
      {children}
    </Link>
  );
}

export type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  /** Accessible name; also shown as the tooltip. */
  label: string;
  icon: ReactNode;
  variant?: Variant;
  size?: "sm" | "md";
  tooltip?: boolean;
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, icon, variant = "ghost", size = "md", tooltip = true, className, type = "button", ...rest },
  ref,
) {
  const btn = (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      className={cn(
        base,
        variants[variant],
        size === "sm" ? "size-9" : "size-10",
        "px-0 [&_svg]:size-[18px]",
        className,
      )}
      {...rest}
    >
      {icon}
    </button>
  );
  return tooltip ? <Tooltip content={label}>{btn}</Tooltip> : btn;
});
