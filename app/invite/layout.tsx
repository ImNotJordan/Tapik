import type { Metadata } from "next";
import { ToastProvider } from "@/components/ui/toast";
import { RoleSwitcher } from "@/components/dev/role-switcher";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: { absolute: `Your card invite · ${BRAND.clientAppName}` },
  robots: { index: false },
};

export default function InviteLayout({ children }: LayoutProps<"/invite">) {
  return (
    <ToastProvider>
      {children}
      <RoleSwitcher />
    </ToastProvider>
  );
}
