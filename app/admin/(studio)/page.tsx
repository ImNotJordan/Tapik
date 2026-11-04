import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import { Dashboard } from "@/components/admin/dashboard";
import { StudioShell } from "@/components/admin/studio-shell";

// Same segment as app/admin/layout.tsx, so its title template doesn't apply here.
export const metadata: Metadata = { title: { absolute: `Cards · ${BRAND.adminAppName}` } };

export default function AdminHome() {
  return (
    <StudioShell>
      <Dashboard />
    </StudioShell>
  );
}
