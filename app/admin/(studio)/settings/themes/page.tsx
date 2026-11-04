import { redirect } from "next/navigation";

/* Renamed when templates (not themes) became the paid product. */
export default function OldThemePricing() {
  redirect("/admin/settings/templates");
}
