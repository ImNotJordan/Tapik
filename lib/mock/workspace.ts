import { BRAND } from "@/lib/brand";

/**
 * The admin's business: the company that makes cards for its clients and
 * sends the invites. Shown in emails, the invite page and the Client Portal.
 * TODO(backend): a `workspaces` row edited in Settings.
 */
export const WORKSPACE = {
  // Clients deal with Tapik itself (owner's choice, 2026-11-03): no separate company name.
  company: BRAND.name,
  /** Short name for tight spots ("Sent to Tapik for review"). */
  shortName: BRAND.name,
  /** Monogram for the logo mark. */
  mark: "T",
  /** Brand color for the logo mark and email buttons: the studio green (white text passes AA). */
  brandColor: "#1D5C48",
  /** Placeholder until email sending is set up; the provider decides the real sender address. */
  senderEmail: `invites@${BRAND.domain}`,
  /** Placeholder (lib/brand.ts): set a real inbox before clients use it. */
  replyTo: BRAND.supportEmail,
  /** No phone line in emails or the portal (empty hides it). */
  phone: "",
  address: "",
  /** Mock persona for the demo change log; emails are signed by the company only. */
  adminName: "Rhea Manalastas",
  adminEmail: "admin@tapik.ph",
  /** Placeholder payment instructions for the "Send payment details" email. Never real accounts. */
  payment: [
    { method: "GCash", detail: "0917 000 0000 · TAPIK (placeholder)" },
    { method: "Maya", detail: "0918 000 0000 · TAPIK (placeholder)" },
    { method: "Bank transfer", detail: "BPI · Acct. no. 0000-0000-00 · Tapik (placeholder)" },
  ],
};

export const ADMIN_NAME = WORKSPACE.adminName;
