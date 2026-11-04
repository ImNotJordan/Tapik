import "./setup";
/**
 * Album photo thumbnails.
 *   onPhotoUpload   Storage: a new album image gets a 400px WebP thumbnail and its size
 *                   recorded; the photo doc (if it already exists) gets thumbUrl/width/height.
 *   onPhotoCreated  Firestore: a photo doc created after its upload finished picks the
 *                   thumbnail up from the object's metadata. Between them, either order works.
 * Uploads are already resized in the browser (lib/api.ts MAX_EDGE), so the full-size
 * image is the original; only the small tile size is made here.
 */
import { randomUUID } from "node:crypto";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { logger } from "firebase-functions";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onObjectFinalized } from "firebase-functions/v2/storage";
import sharp from "sharp";

const BUCKET = "tapik-ph-media";
const ALBUM = /^cards\/([A-Za-z0-9_-]+)\/album\/([^/]+)$/;
const THUMB_EDGE = 400;

/** A token download URL, the same shape getDownloadURL() returns in the browser. */
function downloadUrl(bucket: string, path: string, token: string): string {
  const host = process.env.FIREBASE_STORAGE_EMULATOR_HOST ? `http://${process.env.FIREBASE_STORAGE_EMULATOR_HOST}` : "https://firebasestorage.googleapis.com";
  return `${host}/v0/b/${bucket}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
}

export const onPhotoUpload = onObjectFinalized({ bucket: BUCKET, memory: "512MiB", retry: true }, async (event) => {
  const { name, contentType, metadata } = event.data;
  const m = name ? ALBUM.exec(name) : null;
  if (!m || !name || !contentType?.startsWith("image/") || contentType === "image/svg+xml") return;
  if (metadata?.variant || metadata?.thumbUrl) return; // our own thumbnail, or already done (retry)

  const bucket = getStorage().bucket(event.data.bucket);
  const [buffer] = await bucket.file(name).download();
  const image = sharp(buffer, { failOn: "error" }).rotate();
  const meta = await image.metadata();
  const width = meta.autoOrient?.width ?? meta.width;
  const height = meta.autoOrient?.height ?? meta.height;
  const thumb = await image.resize({ width: THUMB_EDGE, height: THUMB_EDGE, fit: "inside", withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();

  const thumbPath = name.replace(/\.[^.]+$/, "") + "__w400.webp";
  const token = randomUUID();
  await bucket.file(thumbPath).save(thumb, {
    contentType: "image/webp",
    metadata: { cacheControl: "public, max-age=31536000, immutable", metadata: { variant: "w400", firebaseStorageDownloadTokens: token } },
  });
  const thumbUrl = downloadUrl(event.data.bucket, thumbPath, token);
  await bucket.file(name).setMetadata({ metadata: { thumbUrl, width: String(width ?? ""), height: String(height ?? "") } });

  const docs = await getFirestore().collectionGroup("photos").where("storagePath", "==", name).get();
  await Promise.all(docs.docs.map((d) => d.ref.update({ thumbUrl, ...(width ? { width } : {}), ...(height ? { height } : {}) })));
  logger.info("album thumbnail made", { cardId: m[1], docs: docs.size });
});

export const onPhotoCreated = onDocumentCreated({ document: "cards/{cardId}/photos/{photoId}", retry: true }, async (event) => {
  const data = event.data?.data();
  const path = data?.storagePath as string | undefined;
  if (!data || !path || data.thumbUrl || !ALBUM.test(path)) return;
  const [meta] = await getStorage().bucket(BUCKET).file(path).getMetadata().catch(() => [null]);
  const custom = (meta?.metadata ?? {}) as Record<string, string>;
  if (!custom.thumbUrl) return; // onPhotoUpload hasn't finished; it will update this doc itself
  await event.data!.ref.update({
    thumbUrl: custom.thumbUrl,
    ...(Number(custom.width) ? { width: Number(custom.width) } : {}),
    ...(Number(custom.height) ? { height: Number(custom.height) } : {}),
  });
});
