import type { Metadata } from "next";
import { StudioShell } from "@/components/admin/studio-shell";
import { TemplatePricingSettings } from "@/components/admin/template-pricing";

export const metadata: Metadata = { title: "Templates & pricing" };

export default function TemplatesPricingPage() {
  return (
    <StudioShell>
      <TemplatePricingSettings />
    </StudioShell>
  );
}
