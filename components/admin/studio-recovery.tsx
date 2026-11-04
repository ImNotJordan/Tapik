"use client";

import { LayoutGrid, Plus } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { StudioShell } from "./studio-shell";

/**
 * In-studio recovery screen. The studio never shows a bare 404: unknown
 * addresses and missing cards land here, with the way back one click away.
 */
export function StudioRecovery({
  title = "There’s no screen at this address",
  body = "The link may be old or mistyped. Everything in the studio is reachable from the menu.",
}: {
  title?: string;
  body?: string;
}) {
  return (
    <StudioShell>
      <div className="mx-auto flex max-w-[1240px] flex-col gap-6 px-4 py-10 sm:px-6 lg:px-10 lg:py-16">
        <div className="flex max-w-xl flex-col gap-3">
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">{title}</h1>
          <p className="text-base text-studio-ink-2">{body}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <LinkButton href="/admin" variant="primary" icon={<LayoutGrid aria-hidden className="size-4" />}>
            Go to cards
          </LinkButton>
          <LinkButton href="/admin/cards/new" icon={<Plus aria-hidden className="size-4" />}>
            New card
          </LinkButton>
        </div>
      </div>
    </StudioShell>
  );
}
