"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Inbox, LayoutGrid, Library, LogOut, Plus, RotateCcw, QrCode, SlidersHorizontal, Users } from "lucide-react";
import { Suspense, useState, type ReactNode } from "react";
import { resetDemoData, useDB } from "@/lib/services/data";
import { pendingRequestCount } from "@/lib/services/requests";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { TapikLogo } from "@/components/brand/tapik-logo";
import { isEmulatorMode, isFirebaseMode, signOutAndGo, useAccountEmail } from "@/lib/services/session";

const NAV = [
  { href: "/admin", label: "Cards", icon: LayoutGrid, match: (p: string) => p === "/admin" || (p.startsWith("/admin/cards") && !p.startsWith("/admin/cards/new")) },
  { href: "/admin/cards/new", label: "New card", icon: Plus, match: (p: string) => p.startsWith("/admin/cards/new") },
  { href: "/admin/clients", label: "Clients", icon: Users, match: (p: string) => p.startsWith("/admin/clients") },
  { href: "/admin/template-requests", label: "Template requests", icon: Inbox, match: (p: string) => p.startsWith("/admin/template-requests"), badge: "requests" as const },
  { href: "/admin/templates", label: "Template library", icon: Library, match: (p: string) => p.startsWith("/admin/templates") || p.startsWith("/admin/library") },
  { href: "/admin/settings/templates", label: "Templates & pricing", icon: SlidersHorizontal, match: (p: string) => p.startsWith("/admin/settings") && !p.startsWith("/admin/settings/payment") },
  { href: "/admin/settings/payment", label: "Payment settings", icon: QrCode, match: (p: string) => p.startsWith("/admin/settings/payment") },
  { href: "/design", label: "Style guide", icon: BookOpen, match: (p: string) => p.startsWith("/design") },
];

/** Frame for studio pages other than the editor: sidebar on desktop, top bar on small screens. */
export function StudioShell({ children }: { children: ReactNode }) {
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  const email = useAccountEmail();
  const endSession = () => void signOutAndGo("/admin/sign-in");

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <aside className="flex shrink-0 flex-col border-b border-studio-line bg-studio-surface lg:sticky lg:top-0 lg:h-dvh lg:w-60 lg:border-r lg:border-b-0">
        <div className="flex h-14 items-center justify-between gap-3 px-4 lg:h-16 lg:px-5">
          <TapikLogo app="admin" href="/admin" className="text-studio-ink" />
          {isFirebaseMode && (
            <button
              type="button"
              onClick={endSession}
              aria-label="Sign out"
              className="inline-flex size-11 cursor-pointer items-center justify-center rounded-lg text-studio-ink-3 hover:bg-studio-raised hover:text-studio-ink lg:hidden"
            >
              <LogOut aria-hidden className="size-[18px]" strokeWidth={1.75} />
            </button>
          )}
        </div>
        <Suspense fallback={<StudioNav pathname="" />}>
          <ActiveStudioNav />
        </Suspense>
        {isFirebaseMode ? (
          // pb-16 against the emulators keeps the dev RoleSwitcher pill from covering Sign out.
          <div className={cn("mt-auto hidden flex-col gap-1 border-t border-studio-line p-3 lg:flex", isEmulatorMode && process.env.NODE_ENV !== "production" && "pb-16")}>
            {email && <p className="truncate px-3 pt-1 text-2xs text-studio-ink-3" title={email}>Signed in as {email}</p>}
            <button
              type="button"
              onClick={endSession}
              className="flex h-10 cursor-pointer items-center gap-2.5 rounded-lg px-3 text-sm font-medium text-studio-ink-3 hover:bg-studio-raised hover:text-studio-ink"
            >
              <LogOut aria-hidden className="size-4" strokeWidth={1.75} />
              Sign out
            </button>
          </div>
        ) : (
        <div className="mt-auto hidden flex-col gap-1 border-t border-studio-line p-3 lg:flex">
          <button
            type="button"
            onClick={() => setConfirm(true)}
            className="flex h-10 cursor-pointer items-center gap-2.5 rounded-lg px-3 text-sm font-medium text-studio-ink-3 hover:bg-studio-raised hover:text-studio-ink"
          >
            <RotateCcw aria-hidden className="size-4" strokeWidth={1.75} />
            Reset demo data
          </button>
          <p className="px-3 pb-1 text-2xs text-studio-ink-3">Demo build: changes stay in this browser.</p>
        </div>
        )}
      </aside>
      <div className="min-w-0 flex-1">{children}</div>

      <Dialog
        open={confirm}
        onOpenChange={setConfirm}
        size="sm"
        title="Reset demo data?"
        description="Cards, clients, invites and template requests go back to the samples. Anything you created or edited in this browser is removed."
        footer={
          <>
            <Button onClick={() => setConfirm(false)}>Keep my changes</Button>
            <Button
              variant="danger"
              onClick={() => {
                resetDemoData();
                setConfirm(false);
                toast.success("Demo data reset");
              }}
            >
              Reset data
            </Button>
          </>
        }
      />
    </div>
  );
}

function ActiveStudioNav() {
  return <StudioNav pathname={usePathname()} />;
}

function StudioNav({ pathname }: { pathname: string }) {
  const { db, hydrated } = useDB();
  const pending = hydrated ? pendingRequestCount(db) : 0;
  return (
    <nav aria-label="Studio" className="flex gap-1 overflow-x-auto px-3 pb-2 after:w-2 after:shrink-0 after:content-[''] lg:flex-col lg:px-3 lg:pt-2 lg:pb-0 lg:after:hidden">
      {NAV.map((n) => {
        const active = n.match(pathname);
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex h-10 shrink-0 items-center gap-2.5 rounded-lg px-3 text-sm font-medium transition-colors",
              active ? "bg-studio-action-soft font-semibold text-studio-action-ink" : "text-studio-ink-2 hover:bg-studio-raised hover:text-studio-ink",
            )}
          >
            <n.icon aria-hidden className="size-[18px]" strokeWidth={1.75} />
            {n.label}
            {"badge" in n && pending > 0 && (
              <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-studio-action px-1.5 text-2xs font-semibold text-studio-on-action tabular-nums">
                {pending}
                <span className="sr-only"> pending</span>
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-[-0.02em] sm:text-2xl">{title}</h1>
        {description && <p className="text-sm text-studio-ink-3">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
