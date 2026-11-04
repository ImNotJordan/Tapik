"use client";

import { BRAND, emailSenderName, emailSentOnBehalf } from "@/lib/brand";
import { Monitor, Paperclip, Smartphone } from "lucide-react";
import { useState, type ReactNode } from "react";
import { WORKSPACE } from "@/lib/mock/workspace";
import { PRICING, formatPeso } from "@/lib/pricing";
import { cn, formatDate, greetingName } from "@/lib/utils";
import { Segmented } from "@/components/ui/controls";
import { WorkspaceLogo } from "@/components/brand/workspace-logo";
import { TapikLogo } from "@/components/brand/tapik-logo";

export type EmailDevice = "desktop" | "mobile";

/**
 * A mock email client showing an email exactly as the recipient would get it.
 * Used for invites and payment details. The email itself is always light, like
 * most inboxes, whatever the studio's theme.
 */
export function EmailPreview({
  from = { name: emailSenderName(WORKSPACE.company), email: WORKSPACE.senderEmail },
  to,
  subject,
  children,
  device: deviceProp,
  onDeviceChange,
  className,
}: {
  from?: { name: string; email: string };
  to: { name: string; email: string };
  subject: string;
  children: ReactNode;
  device?: EmailDevice;
  onDeviceChange?: (d: EmailDevice) => void;
  className?: string;
}) {
  const [own, setOwn] = useState<EmailDevice>("desktop");
  const device = deviceProp ?? own;
  const setDevice = onDeviceChange ?? setOwn;

  return (
    <figure aria-label={`Email preview: ${subject}`} className={cn("flex min-w-0 flex-col gap-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <figcaption className="text-2xs font-semibold text-studio-ink-3">How it looks in {to.name.split(" ")[0]}’s inbox</figcaption>
        <Segmented<EmailDevice>
          label="Email preview size"
          size="sm"
          value={device}
          onChange={setDevice}
          options={[
            { value: "desktop", label: "Desktop", icon: <Monitor aria-hidden /> },
            { value: "mobile", label: "Mobile", icon: <Smartphone aria-hidden /> },
          ]}
        />
      </div>

      <div className={cn("flex justify-center rounded-2xl bg-studio-sunken", device === "mobile" ? "px-3 py-5" : "p-3 sm:p-4")}>
        <div
          className={cn(
            "flex w-full min-w-0 flex-col overflow-hidden border border-[#d9dcd8] bg-white text-[#1d2220] shadow-[0_12px_32px_-16px_rgb(0_0_0/0.3)] [color-scheme:light]",
            device === "mobile" ? "max-w-[375px] rounded-[28px]" : "rounded-xl",
          )}
        >
          {/* Inbox chrome */}
          <dl className={cn("flex flex-col gap-1 border-b border-[#e6e8e5] bg-[#f7f8f6] text-[13px]", device === "mobile" ? "px-4 pt-5 pb-3" : "px-5 py-3.5")}>
            <p className="pb-1 text-[17px] leading-snug font-semibold [overflow-wrap:anywhere]">{subject || <span className="text-[#6a716d]">(no subject)</span>}</p>
            <div className="flex min-w-0 gap-1.5">
              <dt className="w-10 shrink-0 text-[#5f6662]">From</dt>
              <dd className="min-w-0 [overflow-wrap:anywhere]">
                <span className="font-semibold">{from.name}</span> <span className="text-[#5f6662]">&lt;{from.email}&gt;</span>
              </dd>
            </div>
            <div className="flex min-w-0 gap-1.5">
              <dt className="w-10 shrink-0 text-[#5f6662]">To</dt>
              <dd className="min-w-0 [overflow-wrap:anywhere]">
                {to.name} <span className="text-[#5f6662]">&lt;{to.email}&gt;</span>
              </dd>
            </div>
          </dl>
          <div className={cn("text-[15px] leading-relaxed", device === "mobile" ? "px-5 py-6" : "px-6 py-8 sm:px-10")}>
            <div className={cn("mx-auto flex flex-col gap-5", device === "desktop" && "max-w-[520px]")}>{children}</div>
          </div>
        </div>
      </div>
    </figure>
  );
}

/* ------------------------------------------------------------ Email parts */

function EmailButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      onClick={(e) => e.preventDefault()}
      className="inline-flex min-h-12 w-full items-center justify-center rounded-lg px-6 text-center text-base font-semibold text-white no-underline sm:w-auto"
      style={{ background: WORKSPACE.brandColor }}
    >
      {children}
    </a>
  );
}

/** Signed by the company only (no person), with the phone when there is one. */
function Signoff() {
  return (
    <p>
      {WORKSPACE.company}
      {WORKSPACE.phone && <span className="text-[#5f6662]"> · {WORKSPACE.phone}</span>}
    </p>
  );
}

/** The email header: the company's logo, or the Tapik wordmark when clients deal with Tapik itself. */
function EmailLogo() {
  return WORKSPACE.company === BRAND.name ? <TapikLogo className="text-[#1d2220]" /> : <WorkspaceLogo />;
}

/** Every email ends with who sent it: "Sent by Tapik on behalf of [Admin company]." */
function Footer({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 border-t border-[#e6e8e5] pt-4 text-[12.5px] leading-relaxed text-[#5f6662]">
      <p>{children}</p>
      <p>{emailSentOnBehalf(WORKSPACE.company)}</p>
    </div>
  );
}

/** The invite: greeting, what this is, the button, the link written out, expiry, sign-off, plain fallback. */
export function InviteEmailBody({ clientName, message, link, expiresAt }: { clientName: string; message?: string; link: string; expiresAt?: string }) {
  return (
    <>
      <EmailLogo />
      <p className="text-[17px] font-semibold">Hi {greetingName(clientName)},</p>
      <p>We made you a digital business card. It opens with a tap of your NFC card, a QR code or a link, and you can edit it yourself any time: your photo, socials, album and anything else people should see.</p>
      {message?.trim() && <p className="border-l-[3px] border-[#e1d3cd] pl-3.5 whitespace-pre-line text-[#3c4340]">{message.trim()}</p>}
      <div className="flex flex-col gap-2 py-1">
        <EmailButton href={link}>Open my card editor</EmailButton>
        <p className="text-[13px] [overflow-wrap:anywhere] text-[#5f6662]">
          Or copy this link: <span className="font-medium text-[#1d2220] underline">{link}</span>
        </p>
      </div>
      <p className="text-[14px] text-[#3c4340]">
        This link works for {PRICING.inviteValidDays} days{expiresAt ? `, until ${formatDate(expiresAt)}` : ""}. After that, just reply and we’ll send a new one.
      </p>
      <Signoff />
      <Footer>
        If the button doesn’t work, paste the link above into your browser. You’re getting this because {WORKSPACE.company} set up a card for you. Not expecting it? You can ignore this email.
      </Footer>
    </>
  );
}

/** Payment details for a template request. `body` is the admin's editable text; amounts come from the request. */
export function PaymentEmailBody({ templateName, amount, body }: { templateName: string; amount: number; body: string }) {
  return (
    <>
      <EmailLogo />
      <div className="flex items-baseline justify-between gap-3 rounded-lg bg-[#f5efec] px-4 py-3">
        <span className="text-[14px] text-[#3c4340]">{templateName} template, one-time unlock</span>
        <span className="text-[20px] font-semibold tabular-nums">{formatPeso(amount)}</span>
      </div>
      <div className="flex flex-col gap-4 whitespace-pre-line [overflow-wrap:anywhere]">{body}</div>
      <p className="inline-flex items-center gap-1.5 text-[12.5px] text-[#5f6662]">
        <Paperclip aria-hidden className="size-3.5" />
        Placeholder payment details. Real account numbers are added when payments are connected.
      </p>
      <Footer>Reply to this email with your reference number{WORKSPACE.phone ? `, or call ${WORKSPACE.phone}` : ""}.</Footer>
    </>
  );
}
