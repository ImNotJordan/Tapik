import { StudioRecovery } from "@/components/admin/studio-recovery";

/* If anything inside the studio calls notFound(), it still renders inside the studio. */
export default function StudioNotFound() {
  return <StudioRecovery />;
}
