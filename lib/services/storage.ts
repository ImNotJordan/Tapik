"use client";

/**
 * Card media in Cloud Storage (Firebase mode). Every file lives under
 * cards/{cardId}/{kind}/ with a random name, so links in a published card
 * can't be guessed and storage.rules can check the owner by path.
 * Images are resized in the browser first (lib/api resizeImage); uploads are
 * resumable, report real progress, and stop when the signal aborts.
 */
import { nanoid } from "nanoid";
import { MAX_BYTES, MAX_SVG_BYTES, resizeImage, type Result, type UploadKind } from "@/lib/api";

/** UploadKind (UI) → folder name (storage.rules). */
const FOLDER: Record<UploadKind, string> = {
  "agent-photo": "agent",
  "background-photo": "cover",
  logo: "logo",
  "logo-dark": "logo-dark",
  album: "album",
  "org-chart": "orgchart",
  "org-member": "org-member",
};

export type Uploaded = { url: string; storagePath: string; width?: number; height?: number };

const CANCELLED = "Upload cancelled.";

async function put(path: string, data: Blob, contentType: string, onProgress?: (pct: number) => void, signal?: AbortSignal): Promise<Result<{ url: string }>> {
  const [{ firebaseStorage }, { ref, uploadBytesResumable, getDownloadURL }] = await Promise.all([import("@/lib/firebase/client"), import("firebase/storage")]);
  const objectRef = ref(firebaseStorage(), path);
  const task = uploadBytesResumable(objectRef, data, { contentType, cacheControl: "public, max-age=31536000, immutable" });
  if (signal?.aborted) task.cancel();
  signal?.addEventListener("abort", () => task.cancel(), { once: true });
  return new Promise((resolve) => {
    task.on(
      "state_changed",
      (s) => onProgress?.(Math.min(99, Math.round((s.bytesTransferred / Math.max(1, s.totalBytes)) * 100))),
      (e) => {
        const code = (e as { code?: string }).code ?? "";
        resolve({
          ok: false,
          error:
            code === "storage/canceled" ? CANCELLED
            : code === "storage/unauthorized" ? "You don’t have permission to upload to this card, or the file is too large."
            : code === "storage/retry-limit-exceeded" ? "The connection dropped. Check it and try again."
            : "The upload didn’t finish. Try again.",
        });
      },
      async () => {
        onProgress?.(100);
        resolve({ ok: true, data: { url: await getDownloadURL(objectRef) } });
      },
    );
  });
}

/** Uploads an image for a card: resized in the browser, then stored under the card's folder. */
export async function uploadCardImage(cardId: string | undefined, file: File, kind: UploadKind, onProgress?: (pct: number) => void, signal?: AbortSignal): Promise<Result<Uploaded>> {
  if (!cardId) return { ok: false, error: "Save the card first, then add photos." };
  if (file.size > MAX_BYTES) return { ok: false, error: `${file.name} is larger than 15 MB. Export a smaller version and try again.` };
  const folder = `cards/${cardId}/${FOLDER[kind]}`;
  if (file.type === "image/svg+xml") {
    if (!kind.startsWith("logo")) return { ok: false, error: "SVG works for logos only. Use JPG, PNG or WebP here." };
    if (file.size > MAX_SVG_BYTES) return { ok: false, error: `${file.name} is larger than 2 MB. Simplify the SVG or use a PNG.` };
    const storagePath = `${folder}/${nanoid(16)}.svg`;
    const r = await put(storagePath, file, "image/svg+xml", onProgress, signal);
    return r.ok ? { ok: true, data: { url: r.data.url, storagePath } } : r;
  }
  if (!file.type.startsWith("image/") && !/\.(heic|heif)$/i.test(file.name)) return { ok: false, error: `${file.name} isn’t an image. Use JPG, PNG, WebP or SVG.` };
  let img;
  try {
    img = await resizeImage(file, kind);
  } catch {
    return { ok: false, error: `${file.name} couldn’t be read. Try saving it as JPG or PNG.` };
  }
  onProgress?.(5);
  const storagePath = `${folder}/${nanoid(16)}.${img.ext}`;
  const r = await put(storagePath, img.blob, img.type, onProgress, signal);
  return r.ok ? { ok: true, data: { url: r.data.url, storagePath, width: img.width, height: img.height } } : r;
}

/** Org chart as an image or a PDF. */
export async function uploadCardOrgChart(cardId: string, file: File, onProgress?: (pct: number) => void, signal?: AbortSignal): Promise<Result<{ url: string; type: "image" | "pdf" }>> {
  if (file.type === "application/pdf") {
    if (file.size > MAX_BYTES) return { ok: false, error: "PDFs must be 15 MB or smaller." };
    const r = await put(`cards/${cardId}/orgchart/${nanoid(16)}.pdf`, file, "application/pdf", onProgress, signal);
    return r.ok ? { ok: true, data: { url: r.data.url, type: "pdf" } } : r;
  }
  const r = await uploadCardImage(cardId, file, "org-chart", onProgress, signal);
  return r.ok ? { ok: true, data: { url: r.data.url, type: "image" } } : r;
}
