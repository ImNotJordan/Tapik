import "./setup";
/**
 * Emails for template requests (sent by sendMail from mail/{id}):
 *   #1 request created          → every admin   "New template request: …"
 *   #2 payment submitted (each)  → every admin   "Payment submitted: …"
 *   #3 approved                  → the client    "… is now on your Tapik card"
 *   #4 payment rejected (each)   → the client    "Please check your payment for …"
 *   #5 declined                  → the client    "Your template request was declined"
 *
 * Idempotent: one transaction re-reads the request, checks it is still in the state the
 * email is about, creates each mail/{deterministic id} only if missing and stamps
 * notifications.*EmailAt. Client emails (#3–#5) wait until the studio's Undo window has
 * passed, then check the state again, so an undone action never emails the client.
 * Emails never carry the QR, account details or the receipt: only links into Tapik.
 */
import { createHash } from "node:crypto";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { BRAND, emailSentOnBehalf } from "@/lib/brand";
import { COL } from "@/lib/firebase/model";
import { formatPeso } from "@/lib/pricing";
import type { TemplateRequestStatus } from "@/lib/types";
import { getTemplate } from "@/templates/registry";
import { simpleHtml } from "./mail";
import { APP_BASE_URL, isEmulator } from "./params";
import type { RequestDoc } from "./requests";

const db = () => getFirestore();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const hash = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 12);
const base = () => APP_BASE_URL.value().replace(/\/$/, "");

type Kind = "requested" | "payment" | "approved" | "rejected" | "declined";
const FLAG: Record<Kind, string> = { requested: "requestedEmailAt", payment: "paymentEmailAt", approved: "resultEmailAt", rejected: "resultEmailAt", declined: "resultEmailAt" };
/** Still true when the email is queued (re-checked inside the transaction). */
const STILL: Record<Kind, (r: RequestDoc) => boolean> = {
  requested: () => true,
  payment: (r) => r.status === "payment_submitted",
  approved: (r) => r.status === "approved" || r.status === "paid",
  rejected: (r) => r.status === "payment_rejected",
  declined: (r) => r.status === "declined",
};

function kindFor(before: RequestDoc | undefined, after: RequestDoc): Kind | null {
  if (!before) return "requested";
  const statusChanged = before.status !== after.status;
  const newAttempt = (after.payment?.attempt ?? 0) !== (before.payment?.attempt ?? 0);
  if (after.status === "payment_submitted" && (statusChanged || newAttempt)) return "payment";
  if (!statusChanged) return null; // e.g. the email flags themselves, or an Undo record
  const to: Partial<Record<TemplateRequestStatus, Kind>> = { approved: "approved", paid: "approved", payment_rejected: "rejected", declined: "declined" };
  return to[after.status] ?? null;
}

async function adminRecipients(): Promise<string[]> {
  const admins = await db().collection(COL.admins).get();
  return admins.docs
    .filter((d) => typeof d.get("email") === "string" && d.get("notify.templateRequests") !== false)
    .map((d) => (d.get("email") as string).trim().toLowerCase())
    .filter((e, i, all) => e && all.indexOf(e) === i);
}

async function company(): Promise<string> {
  return ((await db().doc("settings/app").get()).get("company") as string | undefined) ?? BRAND.name;
}

const manila = (iso: string) => new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));

type Draft = { subject: string; lines: string[]; button?: { label: string; href: string } };

function draft(kind: Kind, id: string, r: RequestDoc, names: { client: string; card: string; slug?: string; company: string; published: boolean }): Draft {
  const t = getTemplate(r.templateId).name;
  const price = formatPeso(r.price);
  const studio = `${base()}/admin/template-requests?request=${id}`;
  switch (kind) {
    case "requested":
      return {
        subject: `New template request: ${t} from ${names.client}`,
        lines: [`${names.client} asked for the ${t} template for their card, ${names.card}.`, `Price: ${price}.${r.status === "pending_payment" ? " They can pay now with the InstaPay QR in their portal; you'll get another email when they submit a payment." : ""}`],
        button: { label: "Open in Tapik Studio", href: studio },
      };
    case "payment": {
      const p = r.payment!;
      const mismatch = Math.round(p.amountPaid) !== Math.round(r.price);
      return {
        subject: `Payment submitted: ${names.client} for ${t} (${price})`,
        lines: [
          `${names.client} says they paid for ${t}. Please verify the payment, then approve it in Tapik Studio.`,
          `Reference no.: ${p.referenceNo}`,
          `Amount paid: ${formatPeso(p.amountPaid)} (price ${price})${mismatch ? ". This doesn't match the price, so check it before approving." : "."}`,
          `Paid on: ${manila(p.paidAt)}`,
          "The receipt screenshot is in Tapik Studio.",
        ],
        button: { label: "Review in Tapik Studio", href: studio },
      };
    }
    case "approved":
      return {
        subject: `${t} is now on your ${BRAND.name} card`,
        lines: [`Good news: ${t} is unlocked and applied to your card${names.published ? ", and your live card shows it now" : ""}.`, `Not quite right? You can switch back to your previous template from your portal. ${t} stays unlocked.`],
        button: names.published && names.slug ? { label: "View your live card", href: `${base()}/c/${names.slug}` } : { label: "Open your card", href: `${base()}/portal` },
      };
    case "rejected":
      return {
        subject: `Please check your payment for ${t}`,
        lines: [`We couldn't confirm your payment for ${t} yet.`, `${names.company}: “${r.payment?.reviewNote ?? ""}”`, "Check the details and submit your payment again. Nothing else changes on your card."],
        button: { label: "Resubmit payment", href: `${base()}/portal?request=${id}` },
      };
    case "declined":
      return {
        subject: "Your template request was declined",
        lines: [
          `Your request for ${t} wasn't approved.`,
          `${names.company}: “${r.adminNote ?? ""}”`,
          ...((r.payment?.attempt ?? 0) > 0 ? [`If you already paid, ${names.company} will contact you about a refund.`] : []),
        ],
        button: { label: "Open your card", href: `${base()}/portal` },
      };
  }
}

export const onTemplateRequestWrite = onDocumentWritten({ document: "templateRequests/{id}", retry: true }, async (event) => {
  const before = event.data?.before.data() as RequestDoc | undefined;
  const after = event.data?.after.data() as RequestDoc | undefined;
  if (!after) return;
  const kind = kindFor(before, after);
  if (!kind) return;
  const id = event.params.id;
  const toClient = kind === "approved" || kind === "rejected" || kind === "declined";

  // Client emails wait out the studio's Undo window, then re-check (an undone action sends nothing).
  if (toClient && after.undo?.expiresAt) {
    const wait = after.undo.expiresAt + 2000 - Date.now();
    if (wait > 0) await sleep(Math.min(wait, 25_000));
  }

  const ref = db().collection(COL.templateRequests).doc(id);
  const fresh = (await ref.get()).data() as RequestDoc | undefined;
  if (!fresh || !STILL[kind](fresh)) return;
  const attempt = fresh.payment?.attempt ?? 0;
  if (kind === "payment" && attempt !== (after.payment?.attempt ?? 0)) return; // a newer submission has its own event

  const [clientDoc, cardDoc, from] = await Promise.all([
    db().collection(COL.clients).doc(fresh.clientId).get(),
    db().collection(COL.cards).doc(fresh.cardId).get(),
    company(),
  ]);
  const clientName = (clientDoc.get("name") as string | undefined) ?? "A client";
  const recipients = toClient ? [((clientDoc.get("email") as string | undefined) ?? "").trim().toLowerCase()].filter(Boolean) : await adminRecipients();
  if (!recipients.length) {
    logger.warn(toClient ? "template request email: the client has no email address" : "template request email: no admin has an email address with request emails on", { requestId: id, kind });
    return;
  }
  const slug = cardDoc.get("slug") as string | undefined;
  const published = slug ? (await db().collection(COL.publicCards).doc(slug).get()).exists : false;
  const d = draft(kind, id, fresh, { client: clientName, card: (cardDoc.get("name") as string | undefined) ?? "their card", slug, company: from, published });
  const footer = emailSentOnBehalf(from);

  const queued = await db().runTransaction(async (tx) => {
    const current = (await tx.get(ref)).data() as RequestDoc | undefined;
    if (!current || !STILL[kind](current) || (kind === "payment" && (current.payment?.attempt ?? 0) !== attempt)) return 0;
    const mails = recipients.map((to) => db().collection(COL.mail).doc(`tr_${id}_${kind}_${attempt}_${hash(to)}`));
    const existing = await Promise.all(mails.map((m) => tx.get(m)));
    let n = 0;
    mails.forEach((m, i) => {
      if (existing[i]!.exists) return;
      tx.set(m, {
        to: recipients[i],
        message: { subject: d.subject, text: [...d.lines, ...(d.button ? [`${d.button.label}: ${d.button.href}`] : []), footer].join("\n\n"), html: simpleHtml(d.lines, d.button, footer) },
        createdAt: FieldValue.serverTimestamp(),
      });
      n++;
    });
    tx.update(ref, { [`notifications.${FLAG[kind]}`]: FieldValue.serverTimestamp() });
    return n;
  });
  // Addresses and reference numbers stay out of the logs; the emulator prints the subject to help local testing.
  if (isEmulator) logger.info(`[mail] ${d.subject} → ${recipients.length} recipient(s)`);
  logger.info("template request email", { requestId: id, kind, queued });
});
