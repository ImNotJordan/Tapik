import { redirect } from "next/navigation";

/* Settings has one screen so far. */
export default function SettingsPage() {
  redirect("/admin/settings/templates");
}
