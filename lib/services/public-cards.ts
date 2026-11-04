import "server-only";

/**
 * Public card reads for server components and route handlers (/c/[slug]).
 * Mock mode: the sample cards. Firebase mode: the published snapshot in
 * publicCards/{slug}, read with the Admin SDK, cached per slug and refreshed
 * on publish (revalidateTag "card:<slug>", see /api/revalidate). Visitors'
 * browsers never load Firebase.
 */
import { cacheLife, cacheTag } from "next/cache";
import * as api from "@/lib/api";
import type { CardBundle } from "@/lib/types";
import { isFirebaseMode } from "./mode";

/** Built at deploy time so the route has one known path (Cache Components needs one); never a real card. */
export const PLACEHOLDER_SLUG = "__tapik-placeholder__";

export const cardTag = (slug: string) => `card:${slug}`;

async function readPublished(slug: string): Promise<{ bundle: CardBundle | null; redirectTo: string | null }> {
  "use cache";
  cacheTag(cardTag(slug));
  // Publishing refreshes this right away; the timer is only a safety net.
  cacheLife({ stale: 60, revalidate: 300, expire: 86_400 });
  if (slug === PLACEHOLDER_SLUG || !/^[a-z0-9-]{1,80}$/.test(slug)) return { bundle: null, redirectTo: null };
  const [{ adminDb }, { COL, decode }] = await Promise.all([import("@/lib/firebase/admin"), import("@/lib/firebase/model")]);
  const db = adminDb();
  const pub = await db.collection(COL.publicCards).doc(slug).get();
  if (pub.exists) return { bundle: decode<CardBundle>(pub.get("bundle") as Record<string, unknown>), redirectTo: null };
  // An old link (the card moved to a new one): printed NFC cards keep working.
  const s = await db.collection(COL.slugs).doc(slug).get();
  return { bundle: null, redirectTo: (s.get("redirectTo") as string | undefined) ?? null };
}

export async function getCardBySlug(slug: string): Promise<CardBundle | null> {
  if (!isFirebaseMode) return api.getCardBySlug(slug);
  return (await readPublished(slug)).bundle;
}

/** The current link for an old one, if the card was moved. */
export async function getSlugRedirect(slug: string): Promise<string | null> {
  if (!isFirebaseMode) return null;
  return (await readPublished(slug)).redirectTo;
}

/** Links prebuilt at deploy time. Firebase mode builds none (no production reads at build); cards render on first visit. */
export async function listPublishedSlugs(): Promise<string[]> {
  if (!isFirebaseMode) return api.listPublishedSlugs();
  return [PLACEHOLDER_SLUG];
}
