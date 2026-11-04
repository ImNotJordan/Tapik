/**
 * Shared callable plumbing: role checks, zod parsing and friendly errors.
 * Every callable goes through these, so the rules are the same everywhere.
 */
import { HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import type { z } from "zod";

export type AdminCaller = { uid: string; role: "admin" };
export type ClientCaller = { uid: string; role: "client"; clientId: string; cardId: string };
export type Caller = AdminCaller | ClientCaller;

export function caller(req: CallableRequest): Caller {
  const t = req.auth?.token;
  if (!req.auth || !t) throw new HttpsError("unauthenticated", "Please sign in again.");
  if (t.role === "admin") return { uid: req.auth.uid, role: "admin" };
  if (t.role === "client" && typeof t.clientId === "string" && typeof t.cardId === "string") {
    return { uid: req.auth.uid, role: "client", clientId: t.clientId, cardId: t.cardId };
  }
  throw new HttpsError("permission-denied", "This account doesn't have access.");
}

export function requireAdmin(req: CallableRequest): AdminCaller {
  const c = caller(req);
  if (c.role !== "admin") throw new HttpsError("permission-denied", "Only the studio admin can do this.");
  return c;
}

export function requireClient(req: CallableRequest): ClientCaller {
  const c = caller(req);
  if (c.role !== "client") throw new HttpsError("permission-denied", "Only the card's owner can do this.");
  return c;
}

/** Validates callable input; the first issue becomes the user-facing message. */
export function parse<S extends z.ZodType>(schema: S, data: unknown): z.infer<S> {
  const r = schema.safeParse(data);
  if (!r.success) {
    const i = r.error.issues[0];
    throw new HttpsError("invalid-argument", i ? `${i.path.join(".") || "input"}: ${i.message}` : "That request isn't valid.");
  }
  return r.data;
}
