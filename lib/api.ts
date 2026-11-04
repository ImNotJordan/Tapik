/**
 * Backend boundary. Every function here is a stub that returns mock data or
 * mutates the local mock store, so the UI can be wired to Supabase later
 * without changing components. Search for `TODO(backend)`.
 */
import { BRAND } from "@/lib/brand";
import { createSeedDB, bundleFromDB } from "@/lib/mock";
import type { AlbumPhoto, Card, CardBundle, CardEvent, CardPermissions, Invite, PricingOverrides, TemplateRequest } from "@/lib/types";
import { phoneDigits } from "@/lib/validate";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type Result<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

/* ------------------------------------------------------------ Public card */

/** TODO(backend): select the published card by slug from Supabase (RLS: status = 'published'). */
export async function getCardBySlug(slug: string): Promise<CardBundle | null> {
  const db = createSeedDB();
  const card = db.cards.find((c) => c.slug === slug && c.status === "published");
  return card ? bundleFromDB(db, card.id) : null;
}

/** TODO(backend): list published slugs for static generation. */
export async function listPublishedSlugs(): Promise<string[]> {
  return createSeedDB()
    .cards.filter((c) => c.status === "published")
    .map((c) => c.slug);
}

/* ----------------------------------------------------------------- Studio */

/** TODO(backend): upsert the card row (and children) as a draft. */
export async function saveCardDraft(card: Card): Promise<Result<{ savedAt: string }>> {
  await wait(350);
  return { ok: true, data: { savedAt: card.updated_at } };
}

/** TODO(backend): copy draft to the published snapshot, set status = 'published'. */
export async function publishCard(cardId: string): Promise<Result<{ publishedAt: string }>> {
  await wait(600);
  void cardId;
  return { ok: true, data: { publishedAt: new Date().toISOString() } };
}

/** TODO(backend): set status = 'draft'; the public URL stops resolving. */
export async function unpublishCard(cardId: string): Promise<Result> {
  await wait(400);
  void cardId;
  return { ok: true, data: undefined };
}

/** TODO(backend): unique index on cards.slug; this only checks local data. */
export async function checkSlugAvailable(slug: string, taken: string[]): Promise<boolean> {
  await wait(250);
  return !taken.includes(slug);
}

/* ---------------------------------------------------------------- Uploads */

export type UploadKind = "agent-photo" | "background-photo" | "logo" | "logo-dark" | "album" | "org-chart" | "org-member";

export const MAX_BYTES = 15 * 1024 * 1024;
/** SVGs upload as they are (no resizing), so they get their own, smaller limit (storage.rules). */
export const MAX_SVG_BYTES = 2 * 1024 * 1024;
export const MAX_EDGE: Record<UploadKind, number> = {
  "agent-photo": 720,
  "background-photo": 1400,
  logo: 600,
  "logo-dark": 600,
  album: 1200,
  "org-chart": 1600,
  "org-member": 320,
};

/**
 * TODO(backend): upload to Supabase Storage and return the public URL.
 * Mock: downsizes in the browser and returns a data URL so it survives reloads.
 */
export async function uploadImage(
  file: File,
  kind: UploadKind,
  onProgress?: (pct: number) => void,
): Promise<Result<{ url: string }>> {
  if (file.size > MAX_BYTES) return { ok: false, error: `${file.name} is larger than 15 MB. Export a smaller version and try again.` };
  if (file.type === "image/svg+xml") {
    for (const p of [30, 70, 100]) {
      await wait(120);
      onProgress?.(p);
    }
    return { ok: true, data: { url: await readAsDataURL(file) } };
  }
  if (!file.type.startsWith("image/")) return { ok: false, error: `${file.name} isn’t an image. Use JPG, PNG, WebP or SVG.` };

  for (const p of [12, 34, 58, 81]) {
    await wait(140 + Math.random() * 160);
    onProgress?.(p);
  }
  try {
    const url = await downscale(file, MAX_EDGE[kind]);
    onProgress?.(100);
    return { ok: true, data: { url } };
  } catch {
    return { ok: false, error: `${file.name} couldn’t be read. Try saving it as JPG or PNG.` };
  }
}

/** TODO(backend): insert album_photos row after uploading to Storage. */
export async function uploadAlbumPhoto(
  cardId: string,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<Result<{ url: string }>> {
  void cardId;
  return uploadImage(file, "album", onProgress);
}

/** TODO(backend): delete the album_photos row and the Storage object. */
export async function deleteAlbumPhoto(photo: AlbumPhoto): Promise<Result> {
  void photo;
  return { ok: true, data: undefined };
}

/** TODO(backend): upload org chart image or PDF to Storage. Mock keeps PDFs in memory only. */
export async function uploadOrgChartFile(
  cardId: string,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<Result<{ url: string; type: "image" | "pdf" }>> {
  void cardId;
  if (file.type === "application/pdf") {
    if (file.size > MAX_BYTES) return { ok: false, error: "PDFs must be 15 MB or smaller." };
    for (const p of [25, 60, 100]) {
      await wait(200);
      onProgress?.(p);
    }
    return { ok: true, data: { url: URL.createObjectURL(file), type: "pdf" } };
  }
  const res = await uploadImage(file, "org-chart", onProgress);
  return res.ok ? { ok: true, data: { url: res.data.url, type: "image" } } : res;
}

function readAsDataURL(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

function drawScaled(bitmap: ImageBitmap, maxEdge: number) {
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
  return canvas;
}

async function downscale(file: File, maxEdge: number): Promise<string> {
  const canvas = drawScaled(await createImageBitmap(file), maxEdge);
  const type = file.type === "image/png" ? "image/png" : "image/jpeg";
  return canvas.toDataURL(type, 0.8);
}

/**
 * Resizes an image in the browser before upload: at most MAX_EDGE[kind] on the
 * long side, PNG kept as PNG (transparency), everything else as JPEG. HEIC
 * from an iPhone decodes in Safari; other browsers report it can't be read.
 */
export async function resizeImage(file: File, kind: UploadKind): Promise<{ blob: Blob; width: number; height: number; type: string; ext: string }> {
  const canvas = drawScaled(await createImageBitmap(file), MAX_EDGE[kind]);
  const type = file.type === "image/png" ? "image/png" : "image/jpeg";
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), type, 0.82));
  return { blob, width: canvas.width, height: canvas.height, type, ext: type === "image/png" ? "png" : "jpg" };
}

/* ------------------------------------------------------------ Map + vCard */

/** TODO(backend): return an embeddable map URL (needs a Maps API key). Null = styled placeholder. */
export function getMapEmbed(lat?: number, lng?: number): string | null {
  void lat;
  void lng;
  return null;
}

/** TODO(backend): geocode with a maps provider. Mock: stable fake coordinates near Metro Manila. */
export async function geocodeAddress(address: string): Promise<Result<{ lat: number; lng: number }>> {
  await wait(500);
  if (address.trim().length < 8) return { ok: false, error: "Add a street and city so the pin lands in the right place." };
  let h = 0;
  for (const ch of address) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return { ok: true, data: { lat: 14.55 + (h % 1000) / 10000, lng: 121.0 + ((h >> 10) % 1000) / 10000 } };
}

export function directionsUrl(card: Pick<Card, "address" | "mapLat" | "mapLng">): string {
  const dest = card.mapLat != null && card.mapLng != null ? `${card.mapLat},${card.mapLng}` : card.address ?? "";
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`;
}

function esc(v: string) {
  return v.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

/** TODO(backend): serve from /api/vcard/[slug] with the photo embedded. Mock: built in the browser. */
export function generateVCard(bundle: CardBundle, cardUrl: string): string {
  const { card } = bundle;
  const parts = card.name.trim().split(/\s+/);
  const last = parts.length > 1 ? parts[parts.length - 1] : "";
  const first = parts.length > 1 ? parts.slice(0, -1).join(" ") : parts[0];
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${esc(last)};${esc(first)};;;`,
    `FN:${esc(card.name)}`,
    card.company && `ORG:${esc(card.company)}`,
    card.title && `TITLE:${esc(card.title)}`,
    card.phone && `TEL;TYPE=CELL:${phoneDigits(card.phone)}`,
    card.email && `EMAIL;TYPE=INTERNET:${card.email}`,
    card.address && `ADR;TYPE=WORK:;;${esc(card.address)};;;;`,
    `URL:${cardUrl}`,
    ...bundle.socials.filter((s) => s.visible).map((s) => `URL:${s.url}`),
    "END:VCARD",
  ].filter(Boolean);
  return lines.join("\r\n");
}

/* -------------------------------------------------------------- NFC + QR */

/**
 * TODO(backend): Web NFC (`NDEFReader.write`) works only in Chrome on Android,
 * and production cards are usually encoded at print time. Mock: simulates a write.
 */
export async function writeNfcTag(url: string): Promise<Result<{ url: string }>> {
  await wait(2600);
  return { ok: true, data: { url } };
}

/** TODO(backend): log QR downloads and serve print-ready files. Mock: client-side download. */
export function downloadQrCode(svg: SVGSVGElement, fileName: string) {
  const xml = new XMLSerializer().serializeToString(svg);
  const blob = new Blob([xml], { type: "image/svg+xml" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${fileName}.svg`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function messageHref(card: Pick<Card, "messageChannel" | "messageTarget" | "phone">): string | null {
  const target = card.messageTarget || card.phone;
  if (!target) return null;
  const digits = phoneDigits(target);
  switch (card.messageChannel) {
    case "whatsapp":
      return `https://wa.me/${digits.replace(/^\+/, "")}`;
    case "viber":
      return `viber://chat?number=${encodeURIComponent(digits)}`;
    case "messenger":
      return card.messageTarget ? `https://m.me/${encodeURIComponent(card.messageTarget)}` : null;
    default:
      return `sms:${digits}`;
  }
}

export const MESSAGE_LABEL: Record<Card["messageChannel"], string> = {
  sms: "Message",
  whatsapp: "WhatsApp",
  viber: "Viber",
  messenger: "Messenger",
};

/* ------------------------------------------------------- Templates */

/**
 * TODO(backend): serve from /api/calendar/[slug].ics so the link works in any app.
 * Mock: built in the browser for the Event / Promo template's Add to calendar.
 */
export function generateCalendarFile(event: CardEvent, card: Pick<Card, "name" | "company" | "address" | "slug">, cardUrl: string): string {
  const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const end = event.endsAt ?? new Date(new Date(event.startsAt).getTime() + 4 * 3600_000).toISOString();
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${BRAND.name}//Event//EN`,
    "BEGIN:VEVENT",
    `UID:${card.slug}-${stamp(event.startsAt)}@${BRAND.domain}`,
    `DTSTAMP:${stamp(new Date().toISOString())}`,
    `DTSTART:${stamp(event.startsAt)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(event.title)}`,
    (event.venue || card.address) && `LOCATION:${esc(event.venue || card.address || "")}`,
    `DESCRIPTION:${esc([event.note, `Hosted by ${card.company || card.name}`, cardUrl].filter(Boolean).join("\n"))}`,
    `URL:${cardUrl}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
}

/**
 * TODO(backend): accept a template package (manifest + Card component) uploaded
 * by Tapik staff, validate it and add it to the registry. Templates are
 * code, so the demo can't install one from a file.
 */
export async function importTemplate(file: File): Promise<Result<{ id: string }>> {
  await new Promise((r) => setTimeout(r, 600));
  return { ok: false, error: `Importing templates isn’t connected yet. “${file.name}” was not installed.` };
}

/** TODO(backend): persist library settings (favorites per admin, availability per workspace, saved templates). */
export async function saveLibrarySettings(): Promise<Result> {
  return { ok: true, data: undefined };
}

/* ------------------------------------------------- Client invites + auth */

/**
 * TODO(backend): send the invite through a transactional email provider
 * (e.g. Resend) from the workspace's sender address, with the signed link.
 * Mock: nothing is sent.
 */
export async function sendInviteEmail(invite: Invite, to: string): Promise<Result<{ sentAt: string }>> {
  await wait(700);
  void invite;
  void to;
  return { ok: true, data: { sentAt: new Date().toISOString() } };
}

/** TODO(backend): issue a fresh token, invalidate the old one, email it again. */
export async function resendInvite(inviteId: string): Promise<Result<{ sentAt: string }>> {
  await wait(600);
  void inviteId;
  return { ok: true, data: { sentAt: new Date().toISOString() } };
}

/** TODO(backend): mark the token revoked so the link stops working; end the client's sessions. */
export async function revokeInvite(inviteId: string): Promise<Result> {
  await wait(400);
  void inviteId;
  return { ok: true, data: undefined };
}

/** TODO(backend): verify the token (signature, expiry, single use), create the client's auth user. */
export async function acceptInvite(token: string): Promise<Result<{ token: string }>> {
  await wait(500);
  return { ok: true, data: { token } };
}

/** TODO(backend): Supabase Auth `signInWithOtp` (magic link). Mock: nothing is sent. */
export async function requestSignInLink(email: string): Promise<Result<{ email: string }>> {
  await wait(700);
  return { ok: true, data: { email } };
}

/** TODO(backend): Supabase Auth `updateUser({ password })` during invite acceptance. */
export async function setClientPassword(clientId: string, password: string): Promise<Result> {
  await wait(500);
  void clientId;
  void password;
  return { ok: true, data: undefined };
}

/** TODO(backend): set clients.status = 'disabled' and revoke sessions (or re-enable). */
export async function setClientDisabled(clientId: string, disabled: boolean): Promise<Result> {
  await wait(400);
  void clientId;
  void disabled;
  return { ok: true, data: undefined };
}

/* --------------------------------------------------------- Paid templates */

/** TODO(backend): insert a template_requests row and notify the admin (email + studio badge). */
export async function createTemplateRequest(req: Omit<TemplateRequest, "id" | "status" | "requestedAt">): Promise<Result<{ requestedAt: string }>> {
  await wait(600);
  void req;
  return { ok: true, data: { requestedAt: new Date().toISOString() } };
}

/** TODO(backend): status = 'cancelled' (only while pending or awaiting payment). */
export async function cancelTemplateRequest(requestId: string): Promise<Result> {
  await wait(400);
  void requestId;
  return { ok: true, data: undefined };
}

/**
 * TODO(backend): email the amount and payment instructions; status = 'awaiting_payment'.
 * Payments are collected outside the app (GCash, Maya, bank transfer) for now.
 */
export async function sendPaymentDetails(requestId: string, to: string, subject: string, body: string): Promise<Result<{ sentAt: string }>> {
  await wait(700);
  void requestId;
  void to;
  void subject;
  void body;
  return { ok: true, data: { sentAt: new Date().toISOString() } };
}

/** TODO(backend): status = 'approved' without payment (comp); requires a reason, kept for the audit log. */
export async function approveTemplateRequest(requestId: string, reason: string): Promise<Result> {
  await wait(500);
  void requestId;
  void reason;
  return { ok: true, data: undefined };
}

/**
 * TODO(backend): record the payment (amount, reference) and set status = 'paid'.
 * Later: a payment provider webhook (PayMongo, Xendit) calls this instead of the admin.
 */
export async function markTemplateRequestPaid(requestId: string, amount: number, reference: string): Promise<Result> {
  await wait(500);
  void requestId;
  void amount;
  void reference;
  return { ok: true, data: undefined };
}

/** TODO(backend): status = 'declined' with the admin's note, which is emailed to the client. */
export async function declineTemplateRequest(requestId: string, note: string): Promise<Result> {
  await wait(500);
  void requestId;
  void note;
  return { ok: true, data: undefined };
}

/** TODO(backend): add the template id to card_entitlements.unlocked_template_ids. */
export async function unlockTemplate(cardId: string, templateId: string): Promise<Result> {
  await wait(300);
  void cardId;
  void templateId;
  return { ok: true, data: undefined };
}

/** TODO(backend): persist tier and price overrides (template_pricing table). */
export async function saveTemplatePricing(overrides: PricingOverrides): Promise<Result> {
  await wait(300);
  void overrides;
  return { ok: true, data: undefined };
}

/** TODO(backend): set the workspace's Default (free) template; unlock the old Default for cards already on it. */
export async function setDefaultTemplate(templateId: string): Promise<Result> {
  await wait(400);
  void templateId;
  return { ok: true, data: undefined };
}

/* ----------------------------------------------------------------- Review */

/** TODO(backend): mark the draft as submitted and notify the admin. */
export async function submitForReview(cardId: string): Promise<Result<{ submittedAt: string }>> {
  await wait(600);
  void cardId;
  return { ok: true, data: { submittedAt: new Date().toISOString() } };
}

/** TODO(backend): publish the reviewed draft and email the client. */
export async function approveReview(cardId: string): Promise<Result> {
  await wait(600);
  void cardId;
  return { ok: true, data: undefined };
}

/** TODO(backend): store the admin's note and email the client. */
export async function requestReviewChanges(cardId: string, note: string): Promise<Result> {
  await wait(500);
  void cardId;
  void note;
  return { ok: true, data: undefined };
}

/** TODO(backend): update cards.permissions (client may publish, or changes need review). */
export async function saveCardPermissions(cardId: string, permissions: CardPermissions): Promise<Result> {
  await wait(300);
  void cardId;
  void permissions;
  return { ok: true, data: undefined };
}

/** TODO(backend): mark the client's notifications read. */
export async function markNotificationsRead(clientId: string): Promise<Result> {
  void clientId;
  return { ok: true, data: undefined };
}
