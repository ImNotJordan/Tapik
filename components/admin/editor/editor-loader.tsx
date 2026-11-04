"use client";

import { BRAND } from "@/lib/brand";
import { use } from "react";
import { useCardBundle } from "@/lib/services/data";
import { Skeleton } from "@/components/ui/controls";
import { StudioRecovery } from "../studio-recovery";
import { Editor } from "./editor";
import { FullPreview } from "./full-preview";

export function EditorSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading the editor" className="flex h-dvh flex-col">
      <div className="flex h-14 items-center gap-3 border-b border-studio-line bg-studio-surface px-4">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-6 w-48" />
        <Skeleton className="ml-auto h-9 w-24" />
      </div>
      <div className="flex flex-1">
        <div className="hidden w-[84px] border-r border-studio-line bg-studio-surface lg:block" />
        <div className="flex w-full flex-col gap-5 bg-studio-surface p-6 lg:w-[440px] lg:border-r lg:border-studio-line">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <div className="hidden flex-1 items-start justify-center bg-studio-sunken pt-16 lg:flex">
          <Skeleton className="h-[620px] w-[300px] rounded-[44px]" />
        </div>
      </div>
    </div>
  );
}

function MissingCard() {
  return (
    <StudioRecovery
      title={`This card isn’t in ${BRAND.adminAppName}`}
      body="It may have been removed, or the demo data was reset in this browser. Pick a card from the list, or start a new one."
    />
  );
}

export function EditorLoader({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { bundle, hydrated } = useCardBundle(id);
  if (!hydrated) return <EditorSkeleton />;
  if (!bundle) return <MissingCard />;
  return <Editor bundle={bundle} />;
}

export function PreviewLoader({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { bundle, hydrated } = useCardBundle(id);
  if (!hydrated) return <EditorSkeleton />;
  if (!bundle) return <MissingCard />;
  return <FullPreview bundle={bundle} />;
}
