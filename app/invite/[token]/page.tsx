import { Suspense } from "react";
import { InviteLanding } from "@/components/portal/invite-landing";
import { PortalSkeleton } from "@/components/portal/gates";

/** Invite link from the email: /invite/<token>. Every state (valid, expired, revoked, used, unknown) has its own screen. */
export default function InvitePage({ params }: PageProps<"/invite/[token]">) {
  return (
    <Suspense fallback={<PortalSkeleton />}>
      <InviteLanding params={params} />
    </Suspense>
  );
}
