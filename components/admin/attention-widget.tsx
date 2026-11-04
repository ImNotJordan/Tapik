"use client";

import Link from "next/link";
import { ArrowRight, Hourglass, Inbox } from "lucide-react";
import { useDB } from "@/lib/services/data";
import { openRequests } from "@/lib/services/requests";

/** Dashboard: what clients are waiting on. Hidden when nothing is. */
export function AttentionWidget() {
  const { db } = useDB();
  const wanting = new Set(openRequests(db).map((r) => r.clientId)).size;
  const reviews = db.cards.filter((c) => c.clientId && c.review?.status === "pending").length;
  if (!wanting && !reviews) return null;
  return (
    <section aria-label="Waiting on you" className="flex flex-col divide-y divide-studio-line overflow-hidden rounded-2xl border border-studio-line bg-studio-surface sm:flex-row sm:divide-x sm:divide-y-0">
      {wanting > 0 && (
        <Row href="/admin/template-requests" icon={<Inbox aria-hidden className="size-[18px]" strokeWidth={1.75} />}>
          <strong className="font-semibold tabular-nums">{wanting}</strong> client{wanting === 1 ? " wants" : "s want"} a paid template
        </Row>
      )}
      {reviews > 0 && (
        <Row href="/admin/clients" icon={<Hourglass aria-hidden className="size-[18px]" strokeWidth={1.75} />}>
          <strong className="font-semibold tabular-nums">{reviews}</strong> change{reviews === 1 ? "" : "s"} waiting for your review
        </Row>
      )}
    </section>
  );
}

function Row({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link href={href} className="group flex min-h-14 flex-1 items-center gap-3 px-4 py-3 text-sm text-studio-ink-2 hover:bg-studio-raised/60 sm:px-5">
      <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-studio-action-soft text-studio-action-ink">{icon}</span>
      <span className="min-w-0 flex-1 text-studio-ink">{children}</span>
      <ArrowRight aria-hidden className="size-4 shrink-0 text-studio-ink-3 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
