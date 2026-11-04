import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import { PortalHome } from "@/components/portal/portal-home";

// Same segment as app/portal/layout.tsx, so its title template doesn't apply here.
export const metadata: Metadata = { title: { absolute: `My card · ${BRAND.clientAppName}` } };

export default function PortalPage() {
  return <PortalHome />;
}
