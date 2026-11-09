"use client";

/**
 * QR payments for template requests (Firebase mode): the GoTyme Bank · InstaPay QR,
 * receipt uploads and the admin's Payment settings. Functions: functions/src/requests.ts.
 *
 * Privacy: the QR and receipts never get a public URL. Uploads skip download tokens;
 * images come back as data: URLs from authenticated Functions only.
 */
import { nanoid } from "nanoid";
import type { PaymentSettingsPublic } from "@/lib/types";
import { isFirebaseMode } from "./mode";
import type { Result } from "./types";

async function call<O>(name: string, data: unknown): Promise<Result<O>> {
  const { call } = await import("./callable");
  return call<O>(name, data);
}

const MOCK = { ok: false as const, error: "QR payments work with the Firebase backend only." };

/* --------------------------------------------------------------- images */

/** Decodes any image the browser can (HEIC: Safari) and re-encodes it, at most `maxEdge` px on the long side. */
async function normalize(file: File, type: "image/jpeg" | "image/png", maxEdge: number, quality = 0.85): Promise<Blob | null> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, maxEdge / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    const ctx = canvas.getContext("2d")!;
    if (type === "image/jpeg") {
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close();
    return await new Promise((resolve) => canvas.toBlob((b) => resolve(b), type, quality));
  } catch {
    return null;
  }
}

/** Uploads without a download token (nobody gets a public link), reporting progress. */
async function put(path: string, data: Blob, contentType: string, onProgress?: (pct: number) => void): Promise<Result<{ path: string }>> {
  const [{ firebaseStorage }, { ref, uploadBytesResumable }] = await Promise.all([import("@/lib/firebase/client"), import("firebase/storage")]);
  const task = uploadBytesResumable(ref(firebaseStorage(), path), data, { contentType, cacheControl: "private, max-age=0" });
  return new Promise((resolve) => {
    task.on(
      "state_changed",
      (s) => onProgress?.(Math.min(99, Math.round((s.bytesTransferred / Math.max(1, s.totalBytes)) * 100))),
      (e) => {
        const code = (e as { code?: string }).code ?? "";
        resolve({ ok: false, error: code === "storage/unauthorized" ? "That upload isn’t allowed. Try a JPG or PNG under 10 MB." : code === "storage/retry-limit-exceeded" ? "The connection dropped. Check it and try again." : "The upload didn’t finish. Try again." });
      },
      () => {
        onProgress?.(100);
        resolve({ ok: true, data: { path } });
      },
    );
  });
}

/* ------------------------------------------------------------------- QR */

export type PaymentQr = { dataUrl: string; version: string; settings: PaymentSettingsPublic };
let qrCache: PaymentQr | null = null;

/** The payment QR for a client with an open request (or an admin). Kept in memory per uploaded version. */
export async function getPaymentQr(opts: { path?: string; fresh?: boolean } = {}): Promise<Result<PaymentQr>> {
  if (!isFirebaseMode) return MOCK;
  if (qrCache && !opts.fresh && !opts.path) return { ok: true, data: qrCache };
  const r = await call<PaymentQr>("getPaymentQr", opts.path ? { path: opts.path } : {});
  if (r.ok && !opts.path) qrCache = r.data;
  return r;
}

/** Saves the QR to the phone: the share sheet (iOS "Save Image") where files can be shared, else a download. */
export async function saveQrImage(qr: PaymentQr, fileName = "tapik-instapay-qr"): Promise<"shared" | "downloaded" | "cancelled"> {
  const blob = await (await fetch(qr.dataUrl)).blob();
  const ext = blob.type === "image/png" ? "png" : "jpg";
  const file = new File([blob], `${fileName}.${ext}`, { type: blob.type });
  if (typeof navigator !== "undefined" && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "InstaPay QR" });
      return "shared";
    } catch (e) {
      if ((e as Error).name === "AbortError") return "cancelled";
    }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  return "downloaded";
}

/* -------------------------------------------------------------- receipts */

export const RECEIPT_TYPES = "image/jpeg,image/png,image/webp,image/heic,image/heif";

/**
 * The client's "I've paid": receipt (converted to JPEG, ≤2000 px) uploaded to their own
 * folder, then submitTemplatePayment with the reference number, amount and time.
 */
export async function submitPayment(
  input: { requestId: string; clientId: string; referenceNo: string; amountPaid: number; paidAt: string; receipt?: File; existingProofPath?: string },
  onProgress?: (pct: number) => void,
): Promise<Result> {
  if (!isFirebaseMode) return MOCK;
  let proofPath = input.existingProofPath;
  if (input.receipt) {
    if (input.receipt.size > 10 * 1024 * 1024) return { ok: false, error: "The receipt is larger than 10 MB. Take a screenshot instead." };
    const jpeg = await normalize(input.receipt, "image/jpeg", 2000);
    if (!jpeg) return { ok: false, error: "This browser can’t read that image. Use a JPG or PNG screenshot of the receipt." };
    const up = await put(`paymentProofs/${input.clientId}/${input.requestId}/${nanoid(12)}.jpg`, jpeg, "image/jpeg", onProgress);
    if (!up.ok) return up;
    proofPath = up.data.path;
  }
  if (!proofPath) return { ok: false, error: "Add a screenshot of the receipt." };
  const r = await call<{ ok: true }>("submitTemplatePayment", {
    requestId: input.requestId, proofPath, referenceNo: input.referenceNo.trim(), amountPaid: input.amountPaid, paidAt: input.paidAt,
  });
  return r.ok ? { ok: true, data: undefined } : r;
}

/** A receipt (the client's own, or any for admins) as a data: URL. */
export async function getPaymentProof(requestId: string): Promise<Result<{ dataUrl: string }>> {
  if (!isFirebaseMode) return MOCK;
  return call<{ dataUrl: string }>("getPaymentProof", { requestId });
}

/** The client switches back to the template they had before an approved request was applied. */
export async function undoTemplateApply(cardId: string): Promise<Result<{ slug: string | null }>> {
  if (!isFirebaseMode) return MOCK;
  const r = await call<{ slug: string | null }>("undoTemplateApply", { cardId });
  if (r.ok && r.data.slug) {
    const { refreshPublicPages } = await import("./cards");
    await refreshPublicPages([r.data.slug]);
  }
  return r;
}

/* ------------------------------------------------------- admin settings */

export type PaymentSettingsAdmin = PaymentSettingsPublic & { qrStoragePath: string | null; previousQrStoragePath: string | null };

export async function getPaymentSettings(): Promise<Result<PaymentSettingsAdmin>> {
  if (!isFirebaseMode) return MOCK;
  return call<PaymentSettingsAdmin>("getPaymentSettings", {});
}

export async function savePaymentSettings(input: PaymentSettingsPublic & { qrStoragePath?: string }): Promise<Result> {
  if (!isFirebaseMode) return MOCK;
  const r = await call<{ ok: true }>("savePaymentSettings", input);
  if (r.ok) qrCache = null;
  return r.ok ? { ok: true, data: undefined } : r;
}

/** Uploads a new QR (PNG, ≤1000 px, from jpg/png/webp ≤5 MB). Saving the settings makes it live; the old one is kept for Undo. */
export async function uploadPaymentQr(file: File, onProgress?: (pct: number) => void): Promise<Result<{ path: string }>> {
  if (!isFirebaseMode) return MOCK;
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return { ok: false, error: "Use a JPG, PNG or WebP image of the QR code." };
  if (file.size > 5 * 1024 * 1024) return { ok: false, error: "The QR image is larger than 5 MB." };
  const png = await normalize(file, "image/png", 1000);
  if (!png) return { ok: false, error: "That image couldn’t be read. Try another file." };
  return put(`settings/payment/qr-${Date.now()}.png`, png, "image/png", onProgress);
}
