import type { SocialPlatform } from "@/lib/types";
import { normalizeUrl, validateUrl, type Validation } from "@/lib/validate";

export type PlatformDef = {
  id: SocialPlatform;
  label: string;
  /** Hostnames that belong to the platform; empty = any. */
  hosts: string[];
  /** Template turning a bare handle into a URL. */
  handleUrl?: (handle: string) => string;
  placeholder: string;
};

export const PLATFORMS: PlatformDef[] = [
  { id: "facebook", label: "Facebook", hosts: ["facebook.com", "fb.com", "fb.me"], handleUrl: (h) => `https://facebook.com/${h}`, placeholder: "facebook.com/yourpage or @yourpage" },
  { id: "instagram", label: "Instagram", hosts: ["instagram.com", "instagr.am"], handleUrl: (h) => `https://instagram.com/${h}`, placeholder: "@yourhandle" },
  { id: "tiktok", label: "TikTok", hosts: ["tiktok.com"], handleUrl: (h) => `https://tiktok.com/@${h}`, placeholder: "@yourhandle" },
  { id: "linkedin", label: "LinkedIn", hosts: ["linkedin.com", "lnkd.in"], handleUrl: (h) => `https://linkedin.com/in/${h}`, placeholder: "linkedin.com/in/yourname" },
  { id: "x", label: "X", hosts: ["x.com", "twitter.com"], handleUrl: (h) => `https://x.com/${h}`, placeholder: "@yourhandle" },
  { id: "youtube", label: "YouTube", hosts: ["youtube.com", "youtu.be"], handleUrl: (h) => `https://youtube.com/@${h}`, placeholder: "@yourchannel" },
  { id: "whatsapp", label: "WhatsApp", hosts: ["wa.me", "whatsapp.com"], handleUrl: (h) => `https://wa.me/${h.replace(/\D/g, "")}`, placeholder: "+63 917 555 0142 or wa.me link" },
  { id: "viber", label: "Viber", hosts: ["viber.com", "invite.viber.com"], placeholder: "Viber community or invite link" },
  { id: "telegram", label: "Telegram", hosts: ["t.me", "telegram.me"], handleUrl: (h) => `https://t.me/${h}`, placeholder: "@yourhandle or t.me link" },
  { id: "website", label: "Website", hosts: [], placeholder: "yourcompany.ph" },
  { id: "custom", label: "Custom link", hosts: [], placeholder: "Any link, e.g. a menu or a booking page" },
];

export function getPlatform(id: SocialPlatform): PlatformDef {
  return PLATFORMS.find((p) => p.id === id) ?? PLATFORMS[PLATFORMS.length - 1];
}

function hostMatches(host: string, hosts: string[]) {
  const h = host.replace(/^www\.|^m\./, "");
  return hosts.some((x) => h === x || h.endsWith(`.${x}`));
}

/** Accepts a URL or a handle; returns a full URL or a fix-it message. */
export function resolveSocialInput(platform: SocialPlatform, raw: string): Validation & { hint?: string } {
  const v = raw.trim();
  const def = getPlatform(platform);
  // "@name.with.dots" is always a handle; a bare word is a handle only if it doesn't end like a domain.
  const looksLikeHandle = /^@[\w.]+$/.test(v) || (/^[\w.]+$/.test(v) && !/\.(com|ph|net|org|io|co|me|app)$/i.test(v));
  if (v && looksLikeHandle && def.handleUrl) {
    return { ok: true, value: def.handleUrl(v.replace(/^@/, "")) };
  }
  const res = validateUrl(v);
  if (!res.ok) return res;
  if (def.hosts.length) {
    const host = new URL(normalizeUrl(res.value)).hostname;
    if (!hostMatches(host, def.hosts)) {
      const other = PLATFORMS.find((p) => p.hosts.length && hostMatches(host, p.hosts));
      return {
        ok: false,
        message: other
          ? `This is a ${other.label} link. Switch the platform to ${other.label}, or paste your ${def.label} link.`
          : `This doesn’t look like ${/^[AEIOU]/.test(def.label) ? "an" : "a"} ${def.label} link. It should start with ${def.hosts[0]}.`,
      };
    }
  }
  return res;
}

/** Short readable version of a social URL for list rows. */
export function displayHandle(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/$/, "");
    return `${u.hostname.replace(/^www\./, "")}${path}`;
  } catch {
    return url;
  }
}
