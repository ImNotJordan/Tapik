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
  /**
   * How clients pay: the InstaPay QR from Payment settings (settings/payment), which
   * "Send payment details" embeds in the email. No account numbers are written here.
   */
  payment: [{ method: "InstaPay QR", detail: "scan the QR code below with GCash, Maya, GoTyme or any bank app" }],
};

export const ADMIN_NAME = WORKSPACE.adminName;
