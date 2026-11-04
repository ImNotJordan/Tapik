import type { Metadata } from "next";
import { Suspense } from "react";
import { Clients } from "@/components/admin/clients";
import { StudioShell } from "@/components/admin/studio-shell";

export const metadata: Metadata = { title: "Clients" };

export default function ClientsPage() {
  return (
    <StudioShell>
      {/* Reads ?client= to open a client's details. */}
      <Suspense fallback={null}>
        <Clients />
      </Suspense>
    </StudioShell>
  );
}
