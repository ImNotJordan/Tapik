import {
  Ban,
  CircleCheck,
  CircleDashed,
  CircleDot,
  CirclePause,
  Clock,
  Eye,
  FilePen,
  Hourglass,
  MailCheck,
  PenLine,
  Radio,
  Send,
  Undo2,
  Wallet,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import type { ClientStatus, InviteStatus, TemplateRequestStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * One chip for every status in the product: invites, template requests, review and
 * clients. Always text plus an icon, never color alone.
 */
type Tone = "neutral" | "info" | "warn" | "success" | "danger" | "muted";

type Def = { label: string; icon: LucideIcon; tone: Tone };

export const INVITE_CHIP: Record<InviteStatus, Def> = {
  draft: { label: "Draft", icon: FilePen, tone: "muted" },
  sent: { label: "Sent", icon: Send, tone: "info" },
  opened: { label: "Opened", icon: Eye, tone: "warn" },
  accepted: { label: "Accepted", icon: MailCheck, tone: "success" },
  expired: { label: "Expired", icon: Clock, tone: "danger" },
  revoked: { label: "Revoked", icon: Ban, tone: "muted" },
};

export const REQUEST_CHIP: Record<TemplateRequestStatus, Def> = {
  pending_payment: { label: "Payment needed", icon: Wallet, tone: "warn" },
  payment_submitted: { label: "Verifying payment", icon: Clock, tone: "info" },
  payment_rejected: { label: "Payment not accepted", icon: XCircle, tone: "danger" },
  pending: { label: "Pending", icon: CircleDot, tone: "warn" },
  awaiting_payment: { label: "Awaiting payment", icon: Wallet, tone: "info" },
  paid: { label: "Paid", icon: CircleCheck, tone: "success" },
  approved: { label: "Approved", icon: CircleCheck, tone: "success" },
  declined: { label: "Declined", icon: XCircle, tone: "danger" },
  cancelled: { label: "Cancelled", icon: Undo2, tone: "muted" },
};

export type ReviewChipState = "live" | "draft" | "changes" | "review" | "changes_requested";

export const REVIEW_CHIP: Record<ReviewChipState, Def> = {
  live: { label: "Live", icon: Radio, tone: "success" },
  draft: { label: "Draft, not published", icon: CircleDashed, tone: "muted" },
  changes: { label: "Draft changes not published", icon: PenLine, tone: "warn" },
  review: { label: "Waiting for review", icon: Hourglass, tone: "info" },
  changes_requested: { label: "Changes requested", icon: PenLine, tone: "danger" },
};

export const CLIENT_CHIP: Record<ClientStatus, Def> = {
  invited: { label: "Invited", icon: Send, tone: "info" },
  active: { label: "Active", icon: CircleCheck, tone: "success" },
  disabled: { label: "Disabled", icon: CirclePause, tone: "muted" },
};

const TONES: Record<Tone, string> = {
  neutral: "bg-studio-raised text-studio-ink-2",
  muted: "bg-studio-raised text-studio-ink-3 [&_svg]:opacity-80",
  info: "bg-studio-info-soft text-studio-info-ink",
  warn: "bg-studio-warn-soft text-studio-warn-ink",
  success: "bg-studio-success-soft text-studio-success",
  danger: "bg-studio-danger-soft text-studio-danger-ink",
};

export function StatusChip({
  kind,
  status,
  label,
  size = "md",
  className,
}: {
  kind: "invite" | "request" | "review" | "client";
  status: string;
  /** Override the default label (e.g. "Requested"). */
  label?: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const map = { invite: INVITE_CHIP, request: REQUEST_CHIP, review: REVIEW_CHIP, client: CLIENT_CHIP }[kind] as Record<string, Def>;
  const def = map[status] ?? { label: status, icon: CircleDot, tone: "neutral" as Tone };
  const Icon = def.icon;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full font-semibold whitespace-nowrap",
        size === "sm" ? "h-6 px-2 text-2xs" : "h-7 px-2.5 text-2xs",
        TONES[def.tone],
        className,
      )}
    >
      <Icon aria-hidden className={size === "sm" ? "size-3" : "size-3.5"} strokeWidth={2.25} />
      {label ?? def.label}
    </span>
  );
}
