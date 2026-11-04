"use client";

import { BRAND } from "@/lib/brand";
import { Popover } from "radix-ui";
import { Check, ChevronUp, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useDB } from "@/lib/services/data";
import { devSignInAs, isEmulatorMode, isFirebaseMode, setSession, useSession } from "@/lib/services/session";
import { cn } from "@/lib/utils";

/**
 * Dev-only floating control to review every screen as the admin or as any
 * client. Mock mode: switches the demo session (also on demo deploys with
 * NEXT_PUBLIC_ROLE_SWITCHER=1). Firebase mode: only against the emulators,
 * where it really signs in as a seeded user. Never against a real project.
 */
export function RoleSwitcher() {
  if (isFirebaseMode && (!isEmulatorMode || process.env.NODE_ENV === "production")) return null;
  if (!isFirebaseMode && process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_ROLE_SWITCHER !== "1") return null;
  return <Switcher />;
}

/** Seeded emulator accounts (scripts/seed.ts): the admin, and every client who accepted an invite. */
const SEEDED_ADMIN_UID = "admin_rhea";
const seededClientUid = (clientId: string) => `client_${clientId}`;

function Switcher() {
  const session = useSession();
  const { db } = useDB();
  const router = useRouter();
  const client = session.role === "client" ? db.clients.find((c) => c.id === session.clientId) : undefined;
  const label = isFirebaseMode && session.role === "guest" ? "Switch account" : session.role === "admin" ? "Admin" : `Client: ${client?.name.split(" ").slice(0, 2).join(" ") ?? "?"}`;

  const pick = (next: { role: "admin" } | { role: "client"; clientId: string }) => {
    if (isFirebaseMode) {
      const uid = next.role === "admin" ? SEEDED_ADMIN_UID : seededClientUid(next.clientId);
      void devSignInAs(uid, next.role).then((r) => {
        if (r.ok) window.location.assign(next.role === "admin" ? "/admin" : "/portal");
        else window.alert(r.error);
      });
      return;
    }
    setSession(next);
    const path = window.location.pathname;
    if (next.role === "client" && path.startsWith("/admin")) router.push("/portal");
    if (next.role === "admin" && (path.startsWith("/portal") || path.startsWith("/invite"))) router.push("/admin");
  };

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={`Viewing as ${label}. Switch role (dev only)`}
          className="fixed bottom-[var(--dev-switcher-offset,12px)] left-2 z-[80] inline-flex h-11 max-w-[60vw] cursor-pointer items-center gap-2 rounded-full border border-dashed border-studio-ink-3 bg-studio-surface/95 p-1 sm:pr-3 sm:pl-1.5 text-2xs font-semibold text-studio-ink shadow-[0_6px_20px_rgb(0_0_0/0.18)] backdrop-blur print:hidden"
        >
          <span className={cn("inline-flex size-8 shrink-0 items-center justify-center rounded-full", session.role === "client" ? "bg-studio-action text-studio-on-action" : "bg-studio-ink text-studio-bg")}>
            <UserRound aria-hidden className="size-4" />
          </span>
          <span className="hidden truncate sm:inline">{label}</span>
          <ChevronUp aria-hidden className="hidden size-3.5 shrink-0 text-studio-ink-3 sm:block" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="top"
          align="start"
          sideOffset={8}
          className="z-[81] w-[min(300px,calc(100vw-24px))] rounded-xl border border-studio-line bg-studio-surface p-1.5 text-studio-ink shadow-[0_12px_32px_rgb(0_0_0/0.2)] [animation:fade-in_120ms_ease-out]"
        >
          <p className="px-2.5 pt-1.5 pb-2 text-2xs text-studio-ink-3">
            {isFirebaseMode ? "Emulators only: sign in as a seeded account. Clients who haven’t accepted an invite have no account yet." : "Dev only: review screens as another role. Not in production."}
          </p>
          <ul className="flex flex-col">
            <Item active={session.role === "admin"} onClick={() => pick({ role: "admin" })} title="Admin" sub={`${BRAND.adminAppName}, all cards`} />
            {db.clients.filter((c) => !isFirebaseMode || c.status === "active").map((c) => (
              <Item
                key={c.id}
                active={session.role === "client" && session.clientId === c.id}
                onClick={() => pick({ role: "client", clientId: c.id })}
                title={`Client: ${c.name}`}
                sub={c.status === "active" ? c.company ?? "Active" : c.status === "disabled" ? "Disabled" : "Hasn’t accepted the invite"}
              />
            ))}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function Item({ active, onClick, title, sub }: { active: boolean; onClick: () => void; title: string; sub: string }) {
  return (
    <li>
      <Popover.Close asChild>
        <button type="button" onClick={onClick} aria-current={active || undefined} className={cn("flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left hover:bg-studio-raised", active && "bg-studio-action-soft")}>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-semibold">{title}</span>
            <span className="truncate text-2xs text-studio-ink-3">{sub}</span>
          </span>
          {active && <Check aria-hidden className="size-4 shrink-0 text-studio-action" strokeWidth={2.5} />}
        </button>
      </Popover.Close>
    </li>
  );
}
