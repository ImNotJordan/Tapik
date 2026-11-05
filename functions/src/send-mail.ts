import "./setup";
/**
 * Sends the emails queued in mail/{id} (queueMail) over SMTP. Our own
 * replacement for the "Trigger Email" extension (Firebase Extensions shut
 * down on 31 March 2027); same document shape, so the rest of the code is unchanged.
 *
 * Settings (functions/.env.<project>):
 *   MAIL_ENABLED=true           the switch; without it, mail stays queued and nothing is sent
 *   SMTP_HOST, SMTP_PORT        smtp.gmail.com / 465 (Gmail), smtp.resend.com / 465 (Resend)
 *   SMTP_USER                   the Gmail address, or "resend"
 *   MAIL_FROM                   e.g. Tapik <tapik.cards@gmail.com>; Gmail only sends as its own address
 * Secret (never in git):  firebase functions:secrets:set SMTP_PASSWORD
 *   a Gmail App Password, or a Resend API key.
 *
 * Each document records what happened in `delivery` (PROCESSING → SUCCESS / ERROR),
 * and a document is only ever claimed once, so a retried trigger never sends twice.
 */
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { defineSecret, defineString } from "firebase-functions/params";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import nodemailer, { type Transporter } from "nodemailer";
import { isEmulator } from "./params";

const SMTP_PASSWORD = defineSecret("SMTP_PASSWORD");
const SMTP_HOST = defineString("SMTP_HOST", { default: "smtp.gmail.com" });
const SMTP_PORT = defineString("SMTP_PORT", { default: "465" });
const SMTP_USER = defineString("SMTP_USER", { default: "" });
const MAIL_FROM = defineString("MAIL_FROM", { default: "" });

type MailDoc = { to: string; replyTo?: string; message: { subject: string; text: string; html: string }; delivery?: { state: string } };

let transport: Transporter | null = null;
function smtp(): Transporter {
  const port = Number(SMTP_PORT.value()) || 465;
  transport ??= nodemailer.createTransport({
    host: SMTP_HOST.value(),
    port,
    secure: port === 465,
    auth: { user: SMTP_USER.value(), pass: SMTP_PASSWORD.value() },
  });
  return transport;
}

export const sendMail = onDocumentCreated({ document: "mail/{id}", secrets: [SMTP_PASSWORD], retry: false }, async (event) => {
  // The emulators print queued mail to the log instead (queueMail).
  if (isEmulator || process.env.MAIL_ENABLED !== "true") return;
  const ref = event.data?.ref;
  if (!ref) return;

  // Claim it: only one run ever sends a given document.
  const mail = await getFirestore().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const d = snap.data() as MailDoc | undefined;
    if (!d || d.delivery) return null;
    tx.update(ref, { delivery: { state: "PROCESSING", startTime: new Date(), attempts: 1 } });
    return d;
  });
  if (!mail) return;

  try {
    const info = await smtp().sendMail({
      from: MAIL_FROM.value() || SMTP_USER.value(),
      to: mail.to,
      replyTo: mail.replyTo,
      subject: mail.message.subject,
      text: mail.message.text,
      html: mail.message.html,
    });
    await ref.update({ "delivery.state": "SUCCESS", "delivery.endTime": new Date(), "delivery.messageId": info.messageId ?? null });
    logger.info("mail sent", { id: event.params.id });
  } catch (e) {
    // Logs carry no address, body or link: the error message only.
    const error = e instanceof Error ? e.message : String(e);
    await ref.update({ "delivery.state": "ERROR", "delivery.endTime": new Date(), "delivery.error": error.slice(0, 500) });
    logger.error("mail failed", { id: event.params.id, error });
  }
});
