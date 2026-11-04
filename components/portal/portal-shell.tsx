"use client";

import { BRAND } from "@/lib/brand";
import { TapikLogo } from "@/components/brand/tapik-logo";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DropdownMenu as M } from "radix-ui";
import { ChevronDown, House, LogOut, PenLine } from "lucide-react";
import type { ReactNode } from "react";
import { WORKSPACE } from "@/lib/mock/workspace";
import { signOut } from "@/lib/services/session";
import type { Client } from "@/lib/types";
import { cn, greetingName, initials } from "@/lib/utils";
import { NotificationBell } from "./notification-bell";

/** Calm portal header: the Tapik wordmark with the admin company beside it, updates and the account menu. Reused by the portal editor. */
export function PortalHeader({ client, className, children }: { client: Client; className?: string; children?: ReactNode }) {
  return (
    <header className={cn("flex h-16 shrink-0 items-center justify-between gap-3 border-b border-studio-line bg-studio-surface px-3 sm:px-5", className)}>
      <Link href="/portal" aria-label={`${BRAND.clientAppName}: my card, from ${WORKSPACE.company}`} className="flex min-h-11 min-w-0 items-center gap-3 rounded-lg pr-2 text-studio-ink">
        <TapikLogo />
        <span aria-hidden className="hidden min-w-0 truncate border-l border-studio-line py-1 pl-3 text-2xs font-semibold text-studio-ink-3 md:block">
          {WORKSPACE.company}
        </span>
      </Link>
      {children}
      <div className="flex shrink-0 items-center gap-1">
        <NotificationBell client={client} />
        <AccountMenu client={client} />
      </div>
    </header>
  );
}

function AccountMenu({ client }: { client: Client }) {
  const router = useRouter();
  const item = "flex h-11 cursor-pointer items-center gap-2.5 rounded-lg px-3 text-sm font-medium outline-none select-none data-[highlighted]:bg-studio-raised [&_svg]:size-4 [&_svg]:shrink-0";
  return (
    <M.Root modal={false}>
      <M.Trigger asChild>
        <button
          type="button"
          aria-label={`Account: ${client.name}`}
          className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full py-1 pr-2.5 pl-1 text-sm font-semibold text-studio-ink hover:bg-studio-raised"
        >
          <span aria-hidden className="inline-flex size-9 items-center justify-center rounded-full bg-studio-action-soft text-2xs font-bold text-studio-action-ink">
            {initials(client.name)}
          </span>
          <span className="hidden max-w-[12ch] truncate sm:inline">{greetingName(client.name)}</span>
          <ChevronDown aria-hidden className="size-4 text-studio-ink-3" />
        </button>
      </M.Trigger>
      <M.Portal>
        <M.Content align="end" sideOffset={6} className="z-[70] w-60 rounded-xl border border-studio-line bg-studio-surface p-1.5 text-studio-ink shadow-[0_12px_32px_rgb(0_0_0/0.14)] [animation:fade-in_120ms_ease-out]">
          <div className="px-3 pt-2 pb-2.5">
            <p className="truncate text-sm font-semibold">{client.name}</p>
            <p className="truncate text-2xs text-studio-ink-3">{client.email}</p>
          </div>
          <M.Separator className="my-1 h-px bg-studio-line" />
          <M.Item className={item} onSelect={() => router.push("/portal")}>
            <House aria-hidden />
            My card
          </M.Item>
          <M.Item className={item} onSelect={() => router.push("/portal/edit")}>
            <PenLine aria-hidden />
            Edit my card
          </M.Item>
          <M.Separator className="my-1 h-px bg-studio-line" />
          <M.Item
            className={item}
            onSelect={() => {
              void signOut().then(() => router.push("/portal/sign-in"));
            }}
          >
            <LogOut aria-hidden />
            Sign out
          </M.Item>
        </M.Content>
      </M.Portal>
    </M.Root>
  );
}

/** Page frame for portal screens other than the editor. */
export function PortalShell({ client, children }: { client: Client; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-studio-bg">
      <PortalHeader client={client} className="sticky top-0 z-30" />
      <div className="flex-1">{children}</div>
      <footer className="px-4 pt-6 pb-20 text-center text-2xs text-studio-ink-3 sm:pb-8">
        Questions about your card? {WORKSPACE.company} ·{" "}
        <a href={`mailto:${WORKSPACE.replyTo}`} className="font-semibold text-studio-ink-2 underline underline-offset-2">
          {WORKSPACE.replyTo}
        </a>
      </footer>
    </div>
  );
}
