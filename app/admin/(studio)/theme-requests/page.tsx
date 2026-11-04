import { redirect } from "next/navigation";
import { Suspense } from "react";

/* Renamed when templates (not themes) became the paid product. Keeps ?request= links working. */
export default function OldThemeRequests({ searchParams }: PageProps<"/admin/theme-requests">) {
  return (
    <Suspense fallback={null}>
      <Forward searchParams={searchParams} />
    </Suspense>
  );
}

async function Forward({ searchParams }: { searchParams: PageProps<"/admin/theme-requests">["searchParams"] }) {
  const { request } = await searchParams;
  redirect(typeof request === "string" ? `/admin/template-requests?request=${encodeURIComponent(request)}` : "/admin/template-requests");
  return null;
}
