import type { Metadata } from "next";
import { ToastProvider } from "@/components/ui/toast";
import { RoleSwitcher } from "@/components/dev/role-switcher";
import { SyncStatus } from "@/components/ui/sync-status";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: { default: `My card · ${BRAND.clientAppName}`, template: `%s · ${BRAND.clientAppName}` },
  robots: { index: false },
};

export default function PortalLayout({ children }: LayoutProps<"/portal">) {
  return (
    <ToastProvider>
      <SyncStatus />
      {children}
      <RoleSwitcher />
    </ToastProvider>
  );
}
