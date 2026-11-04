/**
 * Card drafts: content edits, socials, photos, org chart, uploads, publish and review.
 * Edits are store actions (lib/store/actions); in Firebase mode the store writes
 * them to Firestore (lib/store/firebase-sync). Uploads go to Cloud Storage.
 * TODO(backend, phase 7): publishCard / unpublishCard / submitForReview / reviewDecision callables.
 */
import * as api from "@/lib/api";
import { flushDB } from "@/lib/store/db";
import type { Card } from "@/lib/types";
import { isFirebaseMode } from "./mode";
import type { Result } from "./types";

export {
  addMember, addPhoto, addSocial, duplicateCard, hasUnpublishedChanges, markPublished, markUnpublished,
  patchCard, patchMember, patchOrgChart, patchPhoto, patchSocial, removeMember, removePhoto, removeSocial,
  reorderPhotos, reorderSocials, restorePhoto, restoreSocial, setCoverPhoto, setMembers,
} from "@/lib/store/actions";
export { publishCard, unpublishCard, writeNfcTag, downloadQrCode, type UploadKind } from "@/lib/api";
export { approveCardReview, requestCardChanges, setCardPermissions, portalCardState, submitCardForReview } from "@/lib/store/portal";

/** Autosave: resolves once this card's edits are stored (Firebase) or immediately (mock). */
export async function saveCardDraft(card: Card): Promise<Result<{ savedAt: string }>> {
  if (!isFirebaseMode) return api.saveCardDraft(card);
  const r = await flushDB();
  return r.ok ? { ok: true, data: { savedAt: r.savedAt } } : { ok: false, error: r.error };
}

export type UploadOptions = { cardId?: string; signal?: AbortSignal };

/** An image for a card field (agent photo, cover, logo, team member). */
export async function uploadImage(file: File, kind: api.UploadKind, onProgress?: (pct: number) => void, opts: UploadOptions = {}): Promise<Result<{ url: string }>> {
  if (!isFirebaseMode) return api.uploadImage(file, kind, onProgress);
  const { uploadCardImage } = await import("./storage");
  return uploadCardImage(opts.cardId, file, kind, onProgress, opts.signal);
}

/** An album photo. In Firebase mode also returns where it's stored and its size (for the thumbnail). */
export async function uploadAlbumPhoto(cardId: string, file: File, onProgress?: (pct: number) => void, signal?: AbortSignal): Promise<Result<{ url: string; storagePath?: string; width?: number; height?: number }>> {
  if (!isFirebaseMode) return api.uploadAlbumPhoto(cardId, file, onProgress);
  const { uploadCardImage } = await import("./storage");
  return uploadCardImage(cardId, file, "album", onProgress, signal);
}

export async function uploadOrgChartFile(cardId: string, file: File, onProgress?: (pct: number) => void, signal?: AbortSignal): Promise<Result<{ url: string; type: "image" | "pdf" }>> {
  if (!isFirebaseMode) return api.uploadOrgChartFile(cardId, file, onProgress);
  const { uploadCardOrgChart } = await import("./storage");
  return uploadCardOrgChart(cardId, file, onProgress, signal);
}

/**
 * Removing a photo keeps its file for now: Undo puts the photo straight back.
 * Files no card refers to any more are removed by a scheduled cleanup (DEPLOY.md).
 */
export async function deleteAlbumPhoto(photo: Parameters<typeof api.deleteAlbumPhoto>[0]): Promise<Result> {
  return api.deleteAlbumPhoto(photo);
}

/** Is this link free? Firebase mode asks the server (links are reserved there). */
export async function checkSlugAvailable(slug: string, taken: string[], cardId?: string): Promise<boolean> {
  if (!isFirebaseMode || !cardId) return api.checkSlugAvailable(slug, taken);
  const [{ firebaseFunctions }, { httpsCallable }] = await Promise.all([import("@/lib/firebase/client"), import("firebase/functions")]);
  try {
    const r = await httpsCallable<{ slug: string; cardId: string }, { available: boolean }>(firebaseFunctions(), "checkSlug")({ slug, cardId });
    return r.data.available;
  } catch {
    return false;
  }
}
