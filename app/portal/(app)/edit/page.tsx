import type { Metadata } from "next";
import { Suspense } from "react";
import { EditorSkeleton } from "@/components/admin/editor/editor-loader";
import { PortalEditor } from "@/components/portal/portal-editor";

export const metadata: Metadata = { title: "Edit my card" };

export default function PortalEditPage() {
  return (
    <Suspense fallback={<EditorSkeleton />}>
      <PortalEditor />
    </Suspense>
  );
}
