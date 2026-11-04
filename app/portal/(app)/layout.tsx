import { PortalGate } from "@/components/auth/server-gates";

// Every visit verifies the session cookie on the server, so these screens block on it by design.
export const instant = false;

/** The Client Portal except the sign-in screens: signed-in clients only. */
export default function PortalAppLayout({ children }: { children: React.ReactNode }) {
  return <PortalGate>{children}</PortalGate>;
}
