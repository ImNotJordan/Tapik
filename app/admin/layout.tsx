import type { Metadata } from "next";
import { ToastProvider } from "@/components/ui/toast";
import { RoleSwitcher } from "@/components/dev/role-switcher";
import { SyncStatus } from "@/components/ui/sync-status";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: { default: BRAND.adminAppName, template: `%s · ${BRAND.adminAppName}` },
  robots: { index: false },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <ToastProvider>
      <SyncStatus />
      {children}
      <RoleSwitcher />
    </ToastProvider>
  );
}
