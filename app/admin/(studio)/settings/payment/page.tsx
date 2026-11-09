import type { Metadata } from "next";
import { StudioShell } from "@/components/admin/studio-shell";
import { PaymentSettingsScreen } from "@/components/admin/payment-settings";

export const metadata: Metadata = { title: "Payment settings" };

export default function PaymentSettingsPage() {
  return (
    <StudioShell>
      <PaymentSettingsScreen />
    </StudioShell>
  );
}
