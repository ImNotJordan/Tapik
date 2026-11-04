import type { Metadata } from "next";
import { Suspense } from "react";
import { StudioShell } from "@/components/admin/studio-shell";
import { TemplateLibrary } from "@/components/admin/template-library";

export const metadata: Metadata = { title: "Template library" };

export default function TemplatesPage() {
  return (
    <StudioShell>
      {/* The library reads ?card= and ?template= from the URL. */}
      <Suspense fallback={null}>
        <TemplateLibrary />
      </Suspense>
    </StudioShell>
  );
}
