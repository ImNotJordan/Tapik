/**
 * Server gates for Tapik Studio (/admin) and the Client Portal (/portal).
 * Firebase mode: the session cookie is verified on the server for every
 * request (inside <Suspense>, as Cache Components requires) and the verified
 * session is handed to the client through <SessionProvider>. The rules on
 * Firestore and Storage are still the real permission system; these gates
 * decide what renders. Mock mode keeps the in-browser demo gates.
 */
import { Suspense, type ReactNode } from "react";
import { redirect } from "next/navigation";
import { isFirebaseMode as firebaseMode } from "@/lib/services/mode";
import { clientStatus, getServerSession, requestPath } from "@/lib/services/session.server";
import { SessionProvider } from "@/lib/services/session";
import { AccessPausedNotice, AdminGate, PortalSkeleton } from "@/components/portal/gates";


function StudioSkeleton() {
  return <div aria-busy="true" aria-label="Loading Tapik Studio" className="min-h-dvh bg-studio-bg" />;
}

export function StudioGate({ children }: { children: ReactNode }) {
  if (!firebaseMode) return <AdminGate>{children}</AdminGate>;
  return (
    <Suspense fallback={<StudioSkeleton />}>
      <VerifiedStudio>{children}</VerifiedStudio>
    </Suspense>
  );
}

async function VerifiedStudio({ children }: { children: ReactNode }) {
  const s = await getServerSession();
  if (!s) redirect(`/admin/sign-in?next=${encodeURIComponent(await requestPath())}`);
  if (s.role !== "admin") {
    // A signed-in client gets a way back to their card; the studio itself never renders.
    return (
      <SessionProvider session={{ role: "client", clientId: s.clientId, uid: s.uid }}>
        <AdminGate>{null}</AdminGate>
      </SessionProvider>
    );
  }
  return <SessionProvider session={{ role: "admin", uid: s.uid, email: s.email }}>{children}</SessionProvider>;
}

export function PortalGate({ children }: { children: ReactNode }) {
  if (!firebaseMode) return <>{children}</>;
  return (
    <Suspense fallback={<PortalSkeleton />}>
      <VerifiedPortal>{children}</VerifiedPortal>
    </Suspense>
  );
}

async function VerifiedPortal({ children }: { children: ReactNode }) {
  const s = await getServerSession();
  if (!s) redirect(`/portal/sign-in?next=${encodeURIComponent(await requestPath())}`);
  if (s.role === "admin") {
    // ClientGate shows the admin a "the portal is for clients" screen.
    return <SessionProvider session={{ role: "admin", uid: s.uid }}>{children}</SessionProvider>;
  }
  const record = await clientStatus(s.clientId);
  if (!record || record.status === "disabled") {
    return (
      <SessionProvider session={{ role: "client", clientId: s.clientId, uid: s.uid }}>
        <AccessPausedNotice />
      </SessionProvider>
    );
  }
  return <SessionProvider session={{ role: "client", clientId: s.clientId, uid: s.uid }}>{children}</SessionProvider>;
}
