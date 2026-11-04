import type { Metadata } from "next";
import { Suspense } from "react";
import { EditorSkeleton, PreviewLoader } from "@/components/admin/editor/editor-loader";

export const metadata: Metadata = { title: "Preview" };

export default function PreviewPage({ params }: PageProps<"/admin/cards/[id]/preview">) {
  return (
    <Suspense fallback={<EditorSkeleton />}>
      <PreviewLoader params={params} />
    </Suspense>
  );
}
