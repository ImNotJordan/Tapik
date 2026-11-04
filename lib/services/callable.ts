"use client";

/**
 * Calls a Cloud Function (Firebase mode). Server errors are written to be shown
 * as they are; network trouble gets one plain message.
 */
import type { Result } from "@/lib/api";

export async function call<O>(name: string, data: unknown): Promise<Result<O>> {
  const [{ firebaseFunctions }, { httpsCallable }] = await Promise.all([import("@/lib/firebase/client"), import("firebase/functions")]);
  try {
    // The callable protocol sends `undefined` as null; drop those fields so the server sees them as absent.
    const payload = data === undefined ? null : JSON.parse(JSON.stringify(data));
    const r = await httpsCallable<unknown, O>(firebaseFunctions(), name)(payload);
    return { ok: true, data: r.data };
  } catch (e) {
    const err = e as { code?: string; message?: string };
    const code = err.code ?? "";
    if (/unavailable|deadline-exceeded|internal/.test(code) && !navigator.onLine) return { ok: false, error: "You’re offline. Try again when you’re connected." };
    if (/internal|unknown/.test(code)) return { ok: false, error: "Something went wrong on our side. Try again in a moment." };
    return { ok: false, error: err.message || "That didn’t work. Try again." };
  }
}
