"use client";


import { BRAND } from "@/lib/brand";
import { TapikLogo } from "@/components/brand/tapik-logo";
import { ArrowRight, LogOut, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { WORKSPACE } from "@/lib/mock/workspace";
import { useDB } from "@/lib/services/data";
import { latestInvite } from "@/lib/services/invites";
import { isFirebaseMode, setSession, signOutAndGo, useSession } from "@/lib/services/session";
import type { Client } from "@/lib/types";
import { Button, LinkButton } from "@/components/ui/button";

/** Ends the session; in Firebase mode, then goes to the sign-in screen (the demo just switches back to the admin). */
function signOutThen(to: "/admin/sign-in" | "/portal/sign-in") {
  return () => void signOutAndGo(to);
}

/** Calm full-page message used by the gates, the invite page and the sign-in page. */
export function PortalNotice({ title, children, actions, logo = true }: { title: string; children?: ReactNode; actions?: ReactNode; logo?: boolean }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-studio-bg px-4 py-12">
      <div className="flex w-full max-w-md flex-col gap-6">
        {logo && <TapikLogo size="lg" className="text-studio-ink" />}
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-[-0.02em] [text-wrap:balance]">{title}</h1>
          {children && <div className="text-base text-studio-ink-2">{children}</div>}
        </div>
        {actions && <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">{actions}</div>}
      </div>
    </main>
  );
}

/** Admin Studio is for the admin. A signed-in client lands on a way back to their card, never a 404. */
export function AdminGate({ children }: { children: ReactNode }) {
  const session = useSession();
  const { db } = useDB();
  if (session.role === "admin") return <>{children}</>;
  if (session.role === "guest") {
    return (
      <PortalNotice title={`Sign in to ${BRAND.adminAppName}`} actions={<LinkButton href="/admin/sign-in" variant="primary" size="lg">Sign in</LinkButton>}>
        Your session ended. Sign in again to keep working.
      </PortalNotice>
    );
  }
  const clientId = session.clientId;
  const client = db.clients.find((c) => c.id === clientId);
  return (
    <PortalNotice
      title={`You’re signed in as ${client?.name ?? "a client"}`}
      actions={
        <>
          <LinkButton href="/portal" variant="primary" size="lg" icon={<ArrowRight aria-hidden className="size-4" />}>
            Go to my card
          </LinkButton>
          <Button size="lg" icon={<LogOut aria-hidden className="size-4" />} onClick={signOutThen("/admin/sign-in")}>
            Sign out
          </Button>
        </>
      }
    >
      {BRAND.adminAppName} is where {WORKSPACE.company} builds cards. Your own card is in your portal.
    </PortalNotice>
  );
}

/**
 * The portal needs a signed-in, active client. Renders children with that client.
 * Admins see who they can preview as; disabled or not-yet-accepted clients get
 * a clear next step.
 */
export function ClientGate({ children }: { children: (client: Client) => ReactNode }) {
  const session = useSession();
  const { db, hydrated } = useDB();
  if (!hydrated) return <PortalSkeleton />;

  if (session.role === "admin") {
    const active = db.clients.filter((c) => c.status === "active");
    return (
      <PortalNotice
        title="The portal is where clients edit their card"
        actions={
          <LinkButton href="/admin" size="lg">
            Back to {BRAND.adminAppName}
          </LinkButton>
        }
      >
        <p>You’re signed in as the {BRAND.adminAppName} admin. Clients sign in from their invite email.{isFirebaseMode ? "" : " To see the portal as a client:"}</p>
        {!isFirebaseMode && <ul className="mt-4 flex flex-col gap-2">
          {active.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => setSession({ role: "client", clientId: c.id })}
                className="flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-xl border border-studio-line bg-studio-surface px-3.5 py-2 text-left hover:border-studio-line-strong"
              >
                <UserRound aria-hidden className="size-4 shrink-0 text-studio-ink-3" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-semibold text-studio-ink">View as {c.name}</span>
                  <span className="truncate text-2xs text-studio-ink-3">{c.company}</span>
                </span>
                <ArrowRight aria-hidden className="size-4 shrink-0 text-studio-ink-3" />
              </button>
            </li>
          ))}
        </ul>}
      </PortalNotice>
    );
  }

  if (session.role === "guest") {
    return (
      <PortalNotice title="Sign in to edit your card" actions={<LinkButton href="/portal/sign-in" variant="primary" size="lg">Sign in</LinkButton>}>
        Your session ended. We’ll email you a new sign-in link.
      </PortalNotice>
    );
  }

  const clientId = session.clientId;
  const client = db.clients.find((c) => c.id === clientId);
  if (!client) {
    return (
      <PortalNotice title="We couldn’t find your account" actions={<Button size="lg" onClick={signOutThen("/portal/sign-in")}>Sign out</Button>}>
        It may have been removed. Ask {WORKSPACE.company} for a new invite.
      </PortalNotice>
    );
  }
  if (client.status === "disabled") {
    return (
      <PortalNotice
        title="Your access is paused"
        actions={
          <>
            <LinkButton href={`mailto:${WORKSPACE.replyTo}`} variant="primary" size="lg">
              Email {WORKSPACE.shortName}
            </LinkButton>
            <Button size="lg" onClick={signOutThen("/portal/sign-in")}>
              Sign out
            </Button>
          </>
        }
      >
        Your card is still online. To edit it again, ask {WORKSPACE.company} to turn your access back on.
      </PortalNotice>
    );
  }
  if (client.status === "invited") {
    const inv = latestInvite(db, client.id);
    return (
      <PortalNotice
        title="Finish setting up first"
        actions={
          <>
            {!isFirebaseMode && inv && inv.status !== "draft" && (
              <LinkButton href={`/invite/${inv.token}`} variant="primary" size="lg">
                Open my invite
              </LinkButton>
            )}
            <Button size="lg" onClick={signOutThen("/portal/sign-in")}>
              Sign out
            </Button>
          </>
        }
      >
        Open the invite {WORKSPACE.company} emailed to {client.email} to start editing your card.
      </PortalNotice>
    );
  }
  return <>{children(client)}</>;
}

/** Shown when a client's access was turned off (the server gate checks this on every visit). */
export function AccessPausedNotice() {
  return (
    <PortalNotice
      title="Your access is paused"
      actions={
        <>
          <LinkButton href={`mailto:${WORKSPACE.replyTo}`} variant="primary" size="lg">
            Email {WORKSPACE.shortName}
          </LinkButton>
          <Button size="lg" onClick={signOutThen("/portal/sign-in")}>
            Sign out
          </Button>
        </>
      }
    >
      Your card is still online. To edit it again, ask {WORKSPACE.company} to turn your access back on.
    </PortalNotice>
  );
}

export function PortalSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading" className="mx-auto flex min-h-dvh max-w-5xl flex-col gap-6 px-4 py-6">
      <div className="skeleton h-10 w-48 rounded-lg" />
      <div className="skeleton h-[420px] w-full max-w-sm rounded-[28px]" />
      <div className="skeleton h-12 w-full max-w-sm rounded-xl" />
    </div>
  );
}


