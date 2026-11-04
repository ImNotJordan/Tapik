import type { Metadata } from "next";
import { Suspense } from "react";
import { NewCardFlow } from "@/components/admin/new-card-flow";
import { StudioShell } from "@/components/admin/studio-shell";

export const metadata: Metadata = { title: "New card" };

export default function NewCardPage() {
  return (
    <StudioShell>
      {/* Reads ?template= and ?step= (from the Template library's "New from blank"). */}
      <Suspense fallback={null}>
        <NewCardFlow />
      </Suspense>
    </StudioShell>
  );
}
