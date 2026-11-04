import { redirect } from "next/navigation";

/** The old "Templates & themes" page lives on as the Template library. */
export default function LibraryPage() {
  redirect("/admin/templates");
}
