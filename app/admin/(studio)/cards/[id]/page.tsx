import type { Metadata } from "next";
import { Suspense } from "react";
import { EditorLoader, EditorSkeleton } from "@/components/admin/editor/editor-loader";

export const metadata: Metadata = { title: "Edit card" };

export default function EditCardPage({ params }: PageProps<"/admin/cards/[id]">) {
  return (
    <Suspense fallback={<EditorSkeleton />}>
      <EditorLoader params={params} />
    </Suspense>
  );
}
