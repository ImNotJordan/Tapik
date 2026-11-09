/**
 * The Firestore data model: collection paths and the converters between the
 * UI's types (lib/types.ts, ISO date strings, snake_case timestamps on cards)
 * and stored documents (Firestore Timestamps, camelCase createdAt/updatedAt).
 *
 * Plain TypeScript with no Firebase imports, so the app, scripts/seed.ts and
 * functions/ all share it. Both SDKs store a JS Date as a Timestamp and return
 * a Timestamp-like object with toDate(), which is all `decode` relies on.
 *
 * Collections (see DEPLOY.md and firestore.rules):
 *   admins/{uid}                      name, email, favoriteTemplates
 *   clients/{clientId}                Client + authUid
 *   cards/{cardId}                    Card draft (+ orgChart map, lastEditedBy)
 *     socials/{id} photos/{id} orgMembers/{id} changeLog/{id}
 *   publicCards/{slug}                published snapshot (CardBundle + publishedAt); get only
 *   slugs/{slug}                      { cardId } or { redirectTo } after a rename
 *   entitlements/{cardId}             { unlockedTemplateIds }
 *   templateRequests/{id}             TemplateRequest
 *   invites/{id}                      Invite without the token (tokenHash only)
 *   notifications/{id}                ClientNotification (keyed by clientId)
 *   settings/pricing                  { defaultTemplateId, overrides }
 *   settings/library                  { disabledTemplates, disabledThemes, savedTemplates }
 *   settings/app                      the admin company's public details
 *   settings/private                  payment instructions, sender (admin only)
 *   mail/{id}                         Trigger Email extension queue (functions only)
 *   nfcTags/{tagId} nfcBatches/{id}   NFC tags (phase 8)
 */

export const COL = {
  admins: "admins",
  clients: "clients",
  cards: "cards",
  socials: "socials",
  photos: "photos",
  orgMembers: "orgMembers",
  changeLog: "changeLog",
  publicCards: "publicCards",
  slugs: "slugs",
  entitlements: "entitlements",
  templateRequests: "templateRequests",
  /** templateRequestLocks/{cardId}__{templateId} { requestId }: at most one open request per card and template. Functions only. */
  templateRequestLocks: "templateRequestLocks",
  invites: "invites",
  notifications: "notifications",
  settings: "settings",
  mail: "mail",
  nfcTags: "nfcTags",
  nfcBatches: "nfcBatches",
} as const;

export const SETTINGS = { pricing: "pricing", library: "library", app: "app", private: "private", payment: "payment" } as const;

/** Card subcollections, in the order a bundle is assembled. */
export const CARD_SUBCOLLECTIONS = [COL.socials, COL.photos, COL.orgMembers, COL.changeLog] as const;

/** UI key → stored key. Everything else keeps its name. */
const RENAME: Record<string, string> = { created_at: "createdAt", updated_at: "updatedAt", published_at: "publishedAt" };
const UNRENAME: Record<string, string> = Object.fromEntries(Object.entries(RENAME).map(([a, b]) => [b, a]));

/** Keys whose ISO string values are stored as Timestamps. */
const DATE_KEYS = new Set([
  "created_at", "updated_at", "published_at", "createdAt", "updatedAt", "publishedAt",
  "submittedAt", "resolvedAt", "invitedAt", "lastActiveAt", "sentAt", "expiresAt", "openedAt", "acceptedAt", "revokedAt",
  "requestedAt", "paymentRequestedAt", "at", "programmedAt", "lockedAt", "lastTapAt", "assignedAt",
]);

type Plain = Record<string, unknown>;

function isPlainObject(v: unknown): v is Plain {
  return typeof v === "object" && v !== null && Object.getPrototypeOf(v) === Object.prototype;
}

/**
 * UI object → Firestore data. Drops `undefined` (Firestore rejects it), turns
 * ISO strings under date keys into Dates, renames snake_case card timestamps.
 * `renameTopLevel` is for Card-shaped objects only.
 */
export function encode<T extends object>(value: T, { renameTopLevel = false } = {}): Plain {
  const walk = (v: unknown, key?: string): unknown => {
    if (v === undefined) return undefined;
    if (typeof v === "string" && key && DATE_KEYS.has(key)) {
      const t = Date.parse(v);
      return Number.isNaN(t) ? v : new Date(t);
    }
    if (Array.isArray(v)) return v.map((x) => walk(x)).filter((x) => x !== undefined);
    if (isPlainObject(v)) {
      const out: Plain = {};
      for (const [k, x] of Object.entries(v)) {
        const w = walk(x, k);
        if (w !== undefined) out[k] = w;
      }
      return out;
    }
    return v;
  };
  const out = walk(value) as Plain;
  if (!renameTopLevel) return out;
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [RENAME[k] ?? k, v]));
}

/** Firestore data → UI object: Timestamps become ISO strings; stored card timestamps get their UI names back. */
export function decode<T>(data: Plain, { renameTopLevel = false } = {}): T {
  const walk = (v: unknown): unknown => {
    if (v && typeof v === "object" && typeof (v as { toDate?: unknown }).toDate === "function") {
      return (v as { toDate: () => Date }).toDate().toISOString();
    }
    if (v instanceof Date) return v.toISOString();
    if (Array.isArray(v)) return v.map(walk);
    if (isPlainObject(v)) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]));
    return v;
  };
  const out = walk(data) as Plain;
  if (!renameTopLevel) return out as T;
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [UNRENAME[k] ?? k, v])) as T;
}

/** SHA-256 hex of an invite token. Only the hash is stored; the token goes out once, in the email. */
export async function hashToken(token: string): Promise<string> {
  const bytes = new TextEncoder().encode(token);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}
