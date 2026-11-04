import type { Metadata } from "next";
import { Suspense } from "react";
import { StudioShell } from "@/components/admin/studio-shell";
import { TemplateRequests } from "@/components/admin/template-requests";

export const metadata: Metadata = { title: "Template requests" };

export default function TemplateRequestsPage() {
  return (
    <StudioShell>
      {/* Reads ?request= to open one request in the side panel. */}
      <Suspense fallback={null}>
        <TemplateRequests />
      </Suspense>
    </StudioShell>
  );
}
