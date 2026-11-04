import { StudioRecovery } from "@/components/admin/studio-recovery";

/* Any unknown /admin address shows the studio recovery screen, never a 404. */
export default function UnknownStudioScreen() {
  return <StudioRecovery />;
}
