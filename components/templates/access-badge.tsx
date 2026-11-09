import { Check, Clock, Eye, Lock, Wallet, XCircle } from "lucide-react";
import type { TemplateAccess } from "@/lib/entitlements";
import { formatPeso } from "@/lib/pricing";
import type { TemplatePricing, TemplateRequestStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export type TileState = TemplateAccess | "previewing";

/**
 * The price and lock state on a template tile. Text plus icon, never color alone.
 *   free (Default)  "Free · Included"     free (other)  "Free"
 *   locked          lock + "₱299"         requested     "Requested"
 *   unlocked        "Unlocked"            previewing    "Previewing"
 * Admins see prices without locks: `admin` shows "₱299" and "Free · Default".
 * With QR payments, a requested template says where the payment stands (`requestStatus`).
 */
const REQUESTED: Partial<Record<TemplateRequestStatus, { icon: typeof Clock; label: string; tone: string }>> = {
  pending_payment: { icon: Wallet, label: "Payment needed", tone: "bg-studio-warn-soft text-studio-warn-ink" },
  payment_submitted: { icon: Clock, label: "Verifying payment", tone: "bg-studio-info-soft text-studio-info-ink" },
  payment_rejected: { icon: XCircle, label: "Check payment", tone: "bg-studio-danger-soft text-studio-danger-ink" },
};

export function AccessBadge({ state, pricing, admin, requestStatus, className }: { state: TileState; pricing: TemplatePricing; admin?: boolean; requestStatus?: TemplateRequestStatus; className?: string }) {
  const price = formatPeso(pricing.price ?? 0);
  const requested = (requestStatus && REQUESTED[requestStatus]) || { icon: Clock, label: "Requested", tone: "bg-studio-info-soft text-studio-info-ink" };
  const def =
    state === "previewing"
      ? { icon: Eye, label: "Previewing", tone: "bg-studio-ink text-studio-bg" }
      : state === "free"
        ? { icon: pricing.isDefault ? Check : null, label: pricing.isDefault ? (admin ? "Free · Default" : "Free · Included") : "Free", tone: "bg-studio-success-soft text-studio-success" }
        : state === "unlocked"
          ? { icon: Check, label: "Unlocked", tone: "bg-studio-success-soft text-studio-success" }
          : state === "requested"
            ? requested
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
export function accessLabel(state: TileState, pricing: TemplatePricing, admin?: boolean, requestStatus?: TemplateRequestStatus): string {
  const price = formatPeso(pricing.price ?? 0);
  if (state === "previewing") return "previewing, not applied";
  if (state === "free") return pricing.isDefault ? (admin ? "free, the Default" : "free, included") : "free";
  if (state === "unlocked") return "unlocked";
  if (state === "requested") return (requestStatus && REQUESTED[requestStatus]?.label.toLowerCase()) || "requested";
  return admin ? `paid, ${price}` : `locked, ${price}`;
}
