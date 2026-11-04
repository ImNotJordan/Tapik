import { StudioRecovery } from "@/components/admin/studio-recovery";

/* Unknown sub-pages of a card fall back to the studio recovery screen, never a 404. */
export default function UnknownCardScreen() {
  return <StudioRecovery />;
}
