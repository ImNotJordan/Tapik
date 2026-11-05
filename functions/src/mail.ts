/**
 * Outgoing email: a document in mail/ is one email, sent by sendMail
 * (send-mail.ts, SMTP). Ids are deterministic so a retried call
 * never sends twice (create() fails on an existing id). On the emulators nothing
 * is sent: the email is printed to the Functions log instead.
 */
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { isEmulator } from "./params";

export type Mail = { to: string; subject: string; text: string; html: string; replyTo?: string };

export async function queueMail(id: string, mail: Mail): Promise<"queued" | "duplicate"> {
  try {
    await getFirestore().collection("mail").doc(id).create({
      to: mail.to,
      ...(mail.replyTo ? { replyTo: mail.replyTo } : {}),
      message: { subject: mail.subject, text: mail.text, html: mail.html },
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (e) {
    if ((e as { code?: number }).code === 6) return "duplicate"; // ALREADY_EXISTS
    throw e;
  }
  // Production logs carry no addresses, bodies or links. The emulator prints the email for local testing.
  if (isEmulator) logger.info(`[mail:${id}] to ${mail.to}: ${mail.subject}\n${mail.text}`);
  else logger.info("mail queued", { id });
  return "queued";
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Minimal HTML version of a plain-text email: paragraphs, and one button for the main link. */
export function simpleHtml(paragraphs: string[], button?: { label: string; href: string }, footer?: string): string {
  const p = paragraphs.map((t) => `<p style="margin:0 0 16px;font:16px/1.5 system-ui,sans-serif;color:#1d2220">${esc(t)}</p>`).join("");
  const b = button
    ? `<p style="margin:8px 0 24px"><a href="${esc(button.href)}" style="display:inline-block;padding:14px 24px;border-radius:8px;background:#1d5c48;color:#fff;font:600 16px system-ui,sans-serif;text-decoration:none">${esc(button.label)}</a></p>`
    : "";
  const f = footer ? `<p style="margin:24px 0 0;padding-top:16px;border-top:1px solid #e6e8e5;font:12.5px/1.5 system-ui,sans-serif;color:#5f6662">${esc(footer)}</p>` : "";
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#fff"><div style="max-width:520px;margin:0 auto">${p}${b}${f}</div></body></html>`;
}
