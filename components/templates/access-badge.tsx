import { Check, Clock, Eye, Lock } from "lucide-react";
import type { TemplateAccess } from "@/lib/entitlements";
import { formatPeso } from "@/lib/pricing";
import type { TemplatePricing } from "@/lib/types";
import { cn } from "@/lib/utils";

export type TileState = TemplateAccess | "previewing";

/**
 * The price and lock state on a template tile. Text plus icon, never color alone.
 *   free (Default)  "Free · Included"     free (other)  "Free"
 *   locked          lock + "₱299"         requested     "Requested"
 *   unlocked        "Unlocked"            previewing    "Previewing"
 * Admins see prices without locks: `admin` shows "₱299" and "Free · Default".
 */
export function AccessBadge({ state, pricing, admin, className }: { state: TileState; pricing: TemplatePricing; admin?: boolean; className?: string }) {
  const price = formatPeso(pricing.price ?? 0);
  const def =
    state === "previewing"
      ? { icon: Eye, label: "Previewing", tone: "bg-studio-ink text-studio-bg" }
      : state === "free"
        ? { icon: pricing.isDefault ? Check : null, label: pricing.isDefault ? (admin ? "Free · Default" : "Free · Included") : "Free", tone: "bg-studio-success-soft text-studio-success" }
        : state === "unlocked"
          ? { icon: Check, label: "Unlocked", tone: "bg-studio-success-soft text-studio-success" }
          : state === "requested"
            ? { icon: Clock, label: "Requested", tone: "bg-studio-info-soft text-studio-info-ink" }
            : admin
              ? { icon: null, label: price, tone: "bg-studio-raised text-studio-ink-2" }
              : { icon: Lock, label: price, tone: "bg-studio-raised text-studio-ink" };
  const Icon = def.icon;
  return (
    <span className={cn("inline-flex h-6 shrink-0 items-center gap-1 rounded-md px-2 text-2xs font-semibold whitespace-nowrap tabular-nums", def.tone, className)}>
      {Icon && <Icon aria-hidden className="size-3" strokeWidth={2.5} />}
      {def.label}
    </span>
  );
}

/** Spoken version of the badge, for tile labels. */
export function accessLabel(state: TileState, pricing: TemplatePricing, admin?: boolean): string {
  const price = formatPeso(pricing.price ?? 0);
  if (state === "previewing") return "previewing, not applied";
  if (state === "free") return pricing.isDefault ? (admin ? "free, the Default" : "free, included") : "free";
  if (state === "unlocked") return "unlocked";
  if (state === "requested") return "requested";
  return admin ? `paid, ${price}` : `locked, ${price}`;
}
