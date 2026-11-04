import { StudioGate } from "@/components/auth/server-gates";

// Every visit verifies the session cookie on the server, so these screens block on it by design.
export const instant = false;

/** Everything in Tapik Studio except the sign-in screen: admins only. */
export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return <StudioGate>{children}</StudioGate>;
}
