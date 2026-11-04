"use client";

import { useMemo } from "react";
import { useDB } from "@/lib/services/data";
import type { CardBundle } from "@/lib/types";
import { CardRenderer } from "./card-renderer";
import { CardSkeleton } from "./card-skeleton";
import { CardUnavailable } from "./card-unavailable";

/**
 * Public card. The server renders the published card from mock data; on the
 * client, a snapshot published from the studio in this browser takes over.
 * TODO(backend): drop the local snapshot logic once publishing writes to Supabase.
 */
export function PublicCard({ slug, serverBundle }: { slug: string; serverBundle: CardBundle | null }) {
  const { db, hydrated } = useDB();

  const bundle = useMemo(() => {
    if (!hydrated) return serverBundle;
    const local = db.cards.find((c) => c.slug === slug) ?? (serverBundle ? db.cards.find((c) => c.id === serverBundle.card.id) : undefined);
    if (local) {
      if (local.status !== "published") return null;
      return db.snapshots[local.id] ?? serverBundle;
    }
    return serverBundle;
  }, [db, hydrated, slug, serverBundle]);

  if (!bundle) {
    // Unknown on the server: wait for the local store before deciding it doesn't exist.
    if (!hydrated) return <CardSkeleton />;
    return <CardUnavailable />;
  }
  return <CardRenderer bundle={bundle} mode="public" />;
}
