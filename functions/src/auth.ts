/**
 * Sign-in and account callables.
 *   sendSignInLink     anyone (App Check): emails a portal sign-in link, but only to an active client
 *   setClientDisabled  admin: turn a client's access off or back on
 */
import "./setup";
import { createHash } from "node:crypto";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { z } from "zod";
import { BRAND, emailSentOnBehalf } from "@/lib/brand";
import { id } from "@/lib/schemas";
import { parse, requireAdmin } from "./guards";
import { queueMail, simpleHtml } from "./mail";
import { appOrigin, enforceAppCheck, isEmulator } from "./params";

const THROTTLE_MS = 30_000;
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

/**
 * The response is identical whether or not the email belongs to a client, so
 * the sign-in screen can't be used to find out who is one. A 30-second
 * throttle per address applies to everyone, for the same reason.
 */
export const sendSignInLink = onCall({ enforceAppCheck }, async (req) => {
  const { email } = parse(z.object({ email: z.email().max(254) }), req.data);
  const address = email.trim().toLowerCase();
  const db = getFirestore();

  const throttle = db.collection("signInThrottle").doc(sha256(address));
  const allowed = await db.runTransaction(async (tx) => {
    const snap = await tx.get(throttle);
    const last = (snap.get("lastSentAt") as { toMillis(): number } | undefined)?.toMillis() ?? 0;
    if (Date.now() - last < THROTTLE_MS) return false;
    // expireAt: a Firestore TTL policy on signInThrottle deletes old rows (DEPLOY.md).
    tx.set(throttle, { lastSentAt: new Date(), expireAt: new Date(Date.now() + 24 * 3600_000) });
    return true;
  });
  if (!allowed) throw new HttpsError("resource-exhausted", "A link was just sent. Wait a moment before asking again.");

  const found = await db.collection("clients").where("email", "==", address).limit(1).get();
  const client = found.docs[0]?.data() as { name?: string; status?: string; authUid?: string | null } | undefined;
  if (!client || client.status !== "active" || !client.authUid) return {};

  const origin = appOrigin(req.rawRequest.headers.origin);
  const link = await getAuth().generateSignInWithEmailLink(address, { url: `${origin}/portal/sign-in/finish`, handleCodeInApp: true });
  const app = (await db.doc("settings/app").get()).data() as { company?: string; replyTo?: string } | undefined;
  const company = app?.company ?? BRAND.name;
  const first = (client.name ?? "").trim().split(/\s+/)[0] || "there";
  const lines = [`Hi ${first},`, "Here's your link to sign in and edit your digital business card. It works once and expires after a few hours.", "Didn't ask for it? You can ignore this email; nothing changes."];
  await queueMail(`signin_${sha256(address).slice(0, 16)}_${Date.now()}`, {
    to: address,
    replyTo: app?.replyTo,
    subject: `Your sign-in link for ${company}`,
    text: `${lines[0]}\n\n${lines[1]}\n\n${link}\n\n${lines[2]}\n\n${emailSentOnBehalf(company)}`,
    html: simpleHtml(lines, { label: "Sign in to edit my card", href: link }, emailSentOnBehalf(company)),
  });
  return isEmulator ? { devLink: link } : {};
});

export const setClientDisabled = onCall({ enforceAppCheck }, async (req) => {
  requireAdmin(req);
  const { clientId, disabled } = parse(z.object({ clientId: id, disabled: z.boolean() }), req.data);
  const ref = getFirestore().collection("clients").doc(clientId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "That client doesn't exist anymore.");
  const authUid = snap.get("authUid") as string | null | undefined;
  const status = disabled ? "disabled" : authUid ? "active" : "invited";
  await ref.update({ status, updatedAt: new Date() });
  if (authUid) {
    await getAuth().updateUser(authUid, { disabled });
    // Ends every session now; rules also check the status for the up-to-an-hour an ID token can outlive this.
    if (disabled) await getAuth().revokeRefreshTokens(authUid);
  }
  return { status };
});
