/** Inline validation with messages that say how to fix the value. */

export type Validation = { ok: true; value: string } | { ok: false; message: string };

const ok = (value: string): Validation => ({ ok: true, value });
const fail = (message: string): Validation => ({ ok: false, message });

/** Philippine mobile and landline numbers; returns a readable +63 format. */
export function validatePhone(raw: string): Validation {
  const v = raw.trim();
  if (!v) return ok("");
  if (/[a-z]/i.test(v)) return fail("Use digits only, like +63 917 555 0142.");
  const digits = v.replace(/[^\d+]/g, "");
  let national = digits;
  if (national.startsWith("+63")) national = national.slice(3);
  else if (national.startsWith("63") && national.length >= 12) national = national.slice(2);
  else if (national.startsWith("0")) national = national.slice(1);
  else if (national.startsWith("+")) {
    // International number outside PH: accept 8–15 digits.
    const n = national.slice(1);
    return n.length >= 8 && n.length <= 15 ? ok(v) : fail("International numbers need 8 to 15 digits after the +.");
  }
  if (/^9\d{9}$/.test(national)) {
    return ok(`+63 ${national.slice(0, 3)} ${national.slice(3, 6)} ${national.slice(6)}`);
  }
  if (/^2\d{8}$/.test(national)) {
    return ok(`+63 2 ${national.slice(1, 5)} ${national.slice(5)}`);
  }
  if (/^9\d{0,8}$/.test(national)) return fail("Mobile numbers have 10 digits after +63, like 917 555 0142.");
  if (/^\d{9,10}$/.test(national)) return ok(`+63 ${national}`);
  return fail("Enter a number like +63 917 555 0142 or 0917 555 0142.");
}

/** E.164 digits for tel:, sms: and WhatsApp links. */
export function phoneDigits(formatted: string): string {
  const d = formatted.replace(/[^\d+]/g, "");
  if (d.startsWith("+")) return d;
  if (d.startsWith("0")) return `+63${d.slice(1)}`;
  return `+${d}`;
}

export function validateEmail(raw: string): Validation {
  const v = raw.trim();
  if (!v) return ok("");
  if (/\s/.test(v)) return fail("Remove the spaces from the email address.");
  if (!v.includes("@")) return fail("Add the @ and the domain, like name@company.ph.");
  const [local, domain = ""] = v.split("@");
  if (!local) return fail("Add the name before the @.");
  if (!domain) return fail("Add the domain after the @, like company.ph.");
  if (!domain.includes(".")) return fail("Add the ending after the dot, like .ph or .com.");
  if (/\.$/.test(domain) || /\.\./.test(domain)) return fail("Check the part after the @; it has an extra dot.");
  return ok(v);
}

export function normalizeUrl(raw: string): string {
  const v = raw.trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  return `https://${v.replace(/^\/+/, "")}`;
}

export function validateUrl(raw: string): Validation {
  const v = raw.trim();
  if (!v) return fail("Paste a link or a handle.");
  if (/\s/.test(v)) return fail("Links can’t contain spaces.");
  try {
    const url = new URL(normalizeUrl(v));
    if (!url.hostname.includes(".")) return fail("Add the full address, like example.ph/page.");
    return ok(url.toString().replace(/\/$/, ""));
  } catch {
    return fail("That doesn’t look like a link. Try pasting it again.");
  }
}

export function validateSlug(raw: string, taken: string[]): Validation {
  const v = raw.trim();
  if (!v) return fail("The link needs at least 3 characters.");
  if (v.length < 3) return fail("Use at least 3 characters.");
  if (v.length > 60) return fail("Keep it under 60 characters.");
  if (/[A-Z]/.test(v)) return fail("Use lowercase letters only.");
  if (!/^[a-z0-9-]+$/.test(v)) return fail("Use letters, numbers and hyphens only.");
  if (/^-|-$/.test(v)) return fail("Start and end with a letter or number.");
  if (taken.includes(v)) return fail("Another card already uses this link.");
  return ok(v);
}

export function validateRequired(raw: string, label: string): Validation {
  return raw.trim() ? ok(raw.trim()) : fail(`${label} can’t be empty.`);
}
