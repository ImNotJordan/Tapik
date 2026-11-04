/**
 * The product's own brand: the single source of truth for its name and lines.
 * No component hardcodes the product name; read it from here.
 *
 * Not to be confused with WORKSPACE (lib/mock/workspace.ts), the admin's own
 * company that makes cards for its clients, or with client brands inside templates.
 */
export const BRAND = {
  name: "Tapik",
  tagline: "Your business card, one tap away.",
  poweredBy: "Powered by Tapik",
  domain: "tapik.ph", // placeholder: mock links and emails only
  supportEmail: "support@tapik.ph", // placeholder
  adminAppName: "Tapik Studio", // what the admin side is called
  clientAppName: "Tapik", // what clients see in their portal
} as const;

/** Placeholder production origin: "https://tapik.ph". */
export const BRAND_ORIGIN = `https://${BRAND.domain}`;

/**
 * A placeholder link on the product domain, for display in mock emails and
 * previews (`brandUrl("/invite/abc")` → "https://tapik.ph/invite/abc").
 * Links the demo has to open stay on the current origin (see publicCardUrl, inviteUrl).
 */
export function brandUrl(path = "/"): string {
  return `${BRAND_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
}

/** A company name that isn't just Tapik itself (when clients deal with Tapik directly, there's no "via"). */
function otherCompany(company?: string | null): string | null {
  const c = company?.trim();
  return c && c.toLowerCase() !== BRAND.name.toLowerCase() ? c : null;
}

/** Sender name in emails: "[Admin company] via Tapik", or just "Tapik". */
export function emailSenderName(company?: string | null): string {
  const c = otherCompany(company);
  return c ? `${c} via ${BRAND.name}` : BRAND.name;
}

/** Email footer line: "Sent by Tapik on behalf of [Admin company]." */
export function emailSentOnBehalf(company?: string | null): string {
  const c = otherCompany(company);
  return c ? `Sent by ${BRAND.name} on behalf of ${c}.` : `Sent by ${BRAND.name}.`;
}
