/** A card's full data (draft card + socials, photos, team), in the UI's shape. */
import { getFirestore } from "firebase-admin/firestore";
import { COL, decode } from "@/lib/firebase/model";
import type { Card, CardBundle } from "@/lib/types";

export async function bundleFor(cardId: string): Promise<CardBundle | null> {
  const ref = getFirestore().collection(COL.cards).doc(cardId);
  const [card, socials, photos, members] = await Promise.all([ref.get(), ref.collection(COL.socials).get(), ref.collection(COL.photos).get(), ref.collection(COL.orgMembers).get()]);
  if (!card.exists) return null;
  const { orgChart, lastEditedBy: _a, lastEditedSections: _b, ...rest } = card.data()!;
  void _a; void _b;
  const byPos = (a: { position: number }, b: { position: number }) => a.position - b.position;
  return {
    card: decode<Card>({ ...rest, id: cardId }, { renameTopLevel: true }),
    socials: socials.docs.map((d) => decode<CardBundle["socials"][number]>({ ...d.data(), id: d.id })).sort(byPos),
    photos: photos.docs.map((d) => decode<CardBundle["photos"][number]>({ ...d.data(), id: d.id })).sort(byPos),
    orgChart: orgChart ? decode(orgChart) : undefined,
    orgMembers: members.docs.map((d) => decode<CardBundle["orgMembers"][number]>({ ...d.data(), id: d.id })).sort(byPos),
  };
}

/**
 * What the world sees: the published copy. Internal fields (owner, review, permissions,
 * hidden socials, storage paths) stay out of the public snapshot.
 */
export function publicBundle(b: CardBundle, publishedAt: string): CardBundle {
  const { clientId: _c, permissions: _p, review: _r, ...card } = b.card;
  void _c; void _p; void _r;
  return {
    card: { ...card, status: "published", published_at: publishedAt },
    socials: b.socials.filter((s) => s.visible),
    photos: b.photos.map(({ storagePath: _s, ...p }) => (void _s, p)),
    orgChart: b.orgChart,
    orgMembers: b.orgMembers,
  };
}
