"use client";

import { Popover } from "radix-ui";
import { Bell, CircleCheck, Mail, PenLine, Sparkles, Wallet, XCircle, type LucideIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { useDB } from "@/lib/services/data";
import { markAllRead } from "@/lib/services/requests";
import type { Client, ClientNotification } from "@/lib/types";
import { cn, formatRelative } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { unlockActionFor } from "./request-adapter";

const KIND: Record<ClientNotification["kind"], { icon: LucideIcon; tone: string }> = {
  template_unlocked: { icon: Sparkles, tone: "bg-studio-success-soft text-studio-success" },
  payment_requested: { icon: Wallet, tone: "bg-studio-info-soft text-studio-info-ink" },
  request_declined: { icon: XCircle, tone: "bg-studio-danger-soft text-studio-danger-ink" },
  review_approved: { icon: CircleCheck, tone: "bg-studio-success-soft text-studio-success" },
  review_changes: { icon: PenLine, tone: "bg-studio-warn-soft text-studio-warn-ink" },
};

/** In-portal updates: unlocks, payment requests, declines and review results. Opening marks them read. */
export function NotificationBell({ client }: { client: Client }) {
  const { db } = useDB();
  const [open, setOpen] = useState(false);
  // Which items were unread when the panel opened, so they stay marked "New" while it's open.
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const items = useMemo(
    () => db.notifications.filter((n) => n.clientId === client.id).sort((a, b) => Date.parse(b.at) - Date.parse(a.at)),
    [db.notifications, client.id],
  );
  const unread = items.filter((n) => !n.read).length;

  return (
    <Popover.Root
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) {
          setFresh(new Set(items.filter((n) => !n.read).map((n) => n.id)));
          if (unread) markAllRead(client.id);
        }
      }}
    >
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
          className="relative inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-studio-ink-2 transition-colors hover:bg-studio-raised hover:text-studio-ink"
        >
          <Bell aria-hidden className="size-5" strokeWidth={1.75} />
          {unread > 0 && (
            <span aria-hidden className="absolute top-1.5 right-1.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-studio-surface bg-studio-danger px-1 text-[10px] leading-none font-bold text-studio-on-danger tabular-nums">
              {unread}
            </span>
          )}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          collisionPadding={12}
          className="z-[70] flex max-h-[min(560px,75dvh)] w-[min(380px,calc(100vw-24px))] flex-col overflow-hidden rounded-2xl border border-studio-line bg-studio-surface text-studio-ink shadow-[0_16px_40px_rgb(0_0_0/0.18)] [animation:fade-in_120ms_ease-out]"
        >
          <div className="flex items-baseline justify-between gap-3 border-b border-studio-line px-4 py-3">
            <h2 className="text-base font-semibold">Updates</h2>
            {fresh.size > 0 && <span className="text-2xs text-studio-ink-3">{fresh.size} new</span>}
          </div>
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
              <Bell aria-hidden className="size-6 text-studio-ink-3" strokeWidth={1.5} />
              <p className="text-sm font-semibold">Nothing new</p>
              <p className="text-sm text-studio-ink-3">Updates about your template requests and reviews show up here.</p>
            </div>
          ) : (
            <ul className="studio-scroll flex flex-col overflow-y-auto">
              {items.map((n) => (
                <Item key={n.id} n={n} isNew={fresh.has(n.id)} onDone={() => setOpen(false)} />
              ))}
            </ul>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function Item({ n, isNew, onDone }: { n: ClientNotification; isNew: boolean; onDone: () => void }) {
  const { db } = useDB();
  const toast = useToast();
  const { icon: Icon, tone } = KIND[n.kind];
  const card = db.cards.find((c) => c.id === n.cardId);
  const action = unlockActionFor(db, n);

  const runApply = () => {
    if (action?.kind !== "apply") return;
    const res = action.run();
    if (!res.ok) return toast.error("Couldn’t apply it", { description: res.error });
    toast.success(`${res.name} applied`, {
      description: card?.permissions?.clientCanPublish ? "Publish from the editor to make it live." : "Submit it for review from the editor to make it live.",
      action: { label: "Undo", onClick: res.undo },
    });
    onDone();
  };

  return (
    <li className={cn("flex gap-3 border-b border-studio-line px-4 py-3.5 last:border-b-0", isNew && "bg-studio-action-soft/40")}>
      <span aria-hidden className={cn("mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full", tone)}>
        <Icon className="size-4" strokeWidth={2} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="flex flex-wrap items-baseline gap-x-2 text-sm font-semibold">
          {n.title}
          {isNew && <span className="text-2xs font-semibold text-studio-action-ink">New</span>}
        </p>
        <p className="text-sm whitespace-pre-line text-studio-ink-2 [overflow-wrap:anywhere]">{n.kind === "request_declined" || n.kind === "review_changes" ? `“${n.body}”` : n.body}</p>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-2xs text-studio-ink-3">
          <span>{formatRelative(n.at)}</span>
          {n.emailed && (
            <span className="inline-flex items-center gap-1">
              <Mail aria-hidden className="size-3" />
              We also emailed you
            </span>
          )}
        </p>
        {action?.kind === "apply" && (
          <Button size="sm" variant="primary" onClick={runApply} className="mt-1 h-11 self-start">
            {action.label}
          </Button>
        )}
        {action?.kind === "in-use" && (
          <span className="mt-1 inline-flex items-center gap-1.5 text-2xs font-semibold text-studio-success">
            <CircleCheck aria-hidden className="size-3.5" />
            {action.label} on your card
          </span>
        )}
      </div>
    </li>
  );
}
