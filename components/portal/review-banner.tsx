import { Hourglass, PenLine } from "lucide-react";
import type { ReactNode } from "react";
import type { CardReview } from "@/lib/types";
import { cn, formatRelative } from "@/lib/utils";

/**
 * "Waiting for review" and "Changes requested". The client sees it in the
 * portal; the admin sees the same banner (with their own actions) in the editor.
 */
export function ReviewBanner({
  review,
  audience,
  company,
  clientName,
  actions,
  className,
}: {
  review: CardReview;
  audience: "client" | "admin";
  /** The admin's company (client view). */
  company: string;
  /** The client's name (admin view). */
  clientName?: string;
  actions?: ReactNode;
  className?: string;
}) {
  if (review.status === "approved") return null;
  const pending = review.status === "pending";
  const Icon = pending ? Hourglass : PenLine;
  const title = pending
    ? audience === "client"
      ? `Sent to ${company} for review`
      : `${clientName ?? "The client"} sent changes for review`
    : audience === "client"
      ? `${company} asked for a few changes`
      : "You asked for changes";
  const body = pending
    ? audience === "client"
      ? `Submitted ${formatRelative(review.submittedAt)}. Your live card stays as it is until it’s approved. You can keep editing; they’ll see the latest version.`
      : `Submitted ${formatRelative(review.submittedAt)}. Approving publishes this draft.`
    : review.note;

  return (
    <section
      role="status"
      aria-label={title}
      className={cn(
        "flex flex-wrap items-start gap-x-4 gap-y-3 rounded-xl border px-4 py-3",
        pending ? "border-studio-info-ink/25 bg-studio-info-soft text-studio-info-ink" : "border-studio-warn-ink/25 bg-studio-warn-soft text-studio-warn-ink",
        className,
      )}
    >
      <Icon aria-hidden className="mt-0.5 size-5 shrink-0" strokeWidth={2} />
      <div className="flex min-w-0 flex-1 basis-56 flex-col gap-0.5">
        <p className="text-sm font-semibold">{title}</p>
        {body && <p className="text-sm whitespace-pre-line opacity-90">{pending ? body : `“${body}”`}</p>}
        {!pending && review.resolvedAt && <p className="text-2xs opacity-80">{formatRelative(review.resolvedAt)}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </section>
  );
}
