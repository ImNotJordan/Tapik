/**
 * zod schemas for every write. Shared by the client service layer and Cloud
 * Functions (functions/ bundles this file), so both validate the same way.
 * They mirror lib/types.ts; `satisfies`-style checks in lib/schemas/check.ts
 * keep the two from drifting.
 */
import { z } from "zod";

export const isoDate = z.string().refine((s) => !Number.isNaN(Date.parse(s)), "Must be an ISO date");
export const id = z.string().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/, "Letters, numbers, - and _ only");
export const slug = z.string().min(2).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters, numbers and single dashes");
const url = z.string().max(2048).refine((s) => /^(https?:\/\/|\/)/.test(s), "Must be a web address or a site path");
const text = (max: number) => z.string().max(max);
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const reorderableSection = z.enum(["quote", "about", "contact", "socials", "photos", "map", "orgChart"]);
export const headerElement = z.enum(["backgroundPhoto", "logo", "agentPhoto", "poweredBy"]);
export const messageChannel = z.enum(["sms", "whatsapp", "viber", "messenger"]);

export const themeTokens = z.object({
  background: hex, onBackground: hex, surface: hex, text: hex, primary: hex, onPrimary: hex, accent: hex,
});

export const cardReview = z.object({
  status: z.enum(["pending", "changes_requested", "approved"]),
  submittedAt: isoDate,
  resolvedAt: isoDate.optional(),
  note: text(1000).optional(),
});

export const cardPermissions = z.object({ clientCanPublish: z.boolean(), requireReview: z.boolean() });

export const orgChart = z.object({
  id,
  cardId: id,
  mode: z.enum(["upload", "tree"]),
  fileUrl: url.optional(),
  fileType: z.enum(["image", "pdf"]).optional(),
  fileName: text(200).optional(),
  fileAlt: text(300).optional(),
  created_at: isoDate,
});

/** Card content a client may edit (firestore.rules mirrors CLIENT_EDITABLE_CARD_FIELDS). */
export const cardContent = z.object({
  themeId: text(64),
  motion: z.boolean(),
  name: text(120).min(1),
  title: text(120).optional(),
  company: text(120).optional(),
  credential: text(120).optional(),
  quote: text(280).optional(),
  description: text(2000).optional(),
  phone: text(40).optional(),
  messageChannel,
  messageTarget: text(120).optional(),
  email: z.email().max(254).optional().or(z.literal("")),
  address: text(300).optional(),
  mapLat: z.number().min(-90).max(90).optional(),
  mapLng: z.number().min(-180).max(180).optional(),
  showDirections: z.boolean(),
  agentPhotoUrl: url.optional(),
  agentPhotoAlt: text(300).optional(),
  agentPhotoCrop: z.object({ zoom: z.number().min(1).max(3), x: z.number(), y: z.number() }).optional(),
  backgroundPhotoUrl: url.optional(),
  backgroundPhotoAlt: text(300).optional(),
  backgroundFocalPoint: z.object({ x: z.number(), y: z.number() }).optional(),
  overlayOpacity: z.number().min(0).max(1).optional(),
  logoUrl: url.optional(),
  logoDarkUrl: url.optional(),
  logoAlt: text(300).optional(),
  hours: z.array(z.object({ day: z.number().int().min(0).max(6), open: text(5), close: text(5), closed: z.boolean().optional() })).max(14).optional(),
  services: z.array(text(60)).max(30).optional(),
  serviceAreas: z.array(text(60)).max(30).optional(),
  bookingUrl: url.optional().or(z.literal("")),
  bookingLabel: text(32).optional(),
  bookingNote: text(40).optional(),
  expertiseChips: z.array(text(60)).max(20).optional(),
  tagline: text(40).optional(),
  eyebrow: text(40).optional(),
  department: text(120).optional(),
  employeeId: text(60).optional(),
  event: z.object({ title: text(120), startsAt: isoDate, endsAt: isoDate.optional(), venue: text(200).optional(), note: text(500).optional(), eyebrow: text(40).optional(), timeLabel: text(40).optional() }).optional(),
  statusChip: z.object({ label: text(32), tone: z.enum(["live", "neutral"]) }).optional(),
  translations: z.object({ fil: z.object({ title: text(120).optional(), quote: text(280).optional(), description: text(2000).optional(), chips: z.array(text(60)).max(30).optional() }).optional() }).optional(),
  stackRows: z.array(z.object({ label: text(24), value: text(120) })).max(8).optional(),
  githubUsername: z.string().trim().max(39).regex(/^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/, "Use the GitHub username only, like octocat.").optional().or(z.literal("")),
  promptDemo: z.object({ ask: text(200), replyLines: z.array(text(120)).max(6), resultLabel: text(60).optional() }).optional(),
  sectionOrder: z.array(reorderableSection).max(7),
  hiddenSections: z.array(z.union([reorderableSection, headerElement])).max(11),
});

/** Fields only an admin (or a Function) sets. */
export const cardAdminFields = z.object({
  id,
  slug,
  status: z.enum(["draft", "published"]),
  templateId: text(64),
  customTokens: themeTokens.partial().optional(),
  fontPairingId: text(64),
  buttonShape: z.enum(["pill", "rounded", "square"]),
  buttonFill: z.enum(["solid", "outline", "soft"]),
  clientId: id.optional(),
  permissions: cardPermissions.optional(),
  review: cardReview.optional(),
  created_at: isoDate,
  updated_at: isoDate,
  published_at: isoDate.optional(),
});

export const card = cardContent.extend(cardAdminFields.shape);

export const socialLink = z.object({
  id, cardId: id,
  platform: z.enum(["facebook", "instagram", "tiktok", "linkedin", "x", "youtube", "whatsapp", "viber", "telegram", "website", "custom"]),
  url: z.string().min(1).max(2048),
  label: text(60).optional(),
  position: z.number().int().min(0),
  visible: z.boolean(),
  created_at: isoDate,
});

export const albumPhoto = z.object({
  id, cardId: id, url, caption: text(200).optional(), tag: text(40).optional(), alt: text(300).optional(),
  position: z.number().int().min(0), isCover: z.boolean(), created_at: isoDate,
  storagePath: z.string().max(512).optional(), thumbUrl: url.optional(), width: z.number().int().positive().optional(), height: z.number().int().positive().optional(),
});

export const orgMember = z.object({
  id, orgChartId: id, parentId: id.nullable(), name: text(120).min(1), role: text(120),
  photoUrl: url.optional(), position: z.number().int().min(0), created_at: isoDate,
});

export const cardBundle = z.object({
  card, socials: z.array(socialLink).max(30), photos: z.array(albumPhoto).max(60), orgChart: orgChart.optional(), orgMembers: z.array(orgMember).max(200),
});

export const client = z.object({
  id, name: text(120).min(1), email: z.email().max(254), phone: text(40).optional(), company: text(120).optional(),
  status: z.enum(["invited", "active", "disabled"]), invitedAt: isoDate, lastActiveAt: isoDate.optional(), cardId: id,
});

export const invite = z.object({
  id, clientId: id, cardId: id, tokenHash: z.string().regex(/^[0-9a-f]{64}$/),
  createdAt: isoDate, sentAt: isoDate.optional(), expiresAt: isoDate, openedAt: isoDate.optional(), acceptedAt: isoDate.optional(), revokedAt: isoDate.optional(),
  status: z.enum(["draft", "sent", "opened", "accepted", "expired", "revoked"]),
  channel: z.enum(["email", "link"]).optional(), subject: text(200).optional(), message: text(2000).optional(),
});

export const templateRequest = z.object({
  id, clientId: id, cardId: id, templateId: text(64), themeId: text(64).optional(),
  price: z.number().min(0), currency: z.literal("PHP"), note: text(500).optional(),
  status: z.enum(["pending", "awaiting_payment", "paid", "approved", "declined", "cancelled"]),
  requestedAt: isoDate, resolvedAt: isoDate.optional(), adminNote: text(1000).optional(),
  paidAmount: z.number().min(0).optional(), paymentRef: text(120).optional(), compReason: text(500).optional(),
  paymentRequestedAt: isoDate.optional(), byAdmin: z.boolean().optional(),
});

export const notification = z.object({
  id, clientId: id, cardId: id,
  kind: z.enum(["template_unlocked", "payment_requested", "request_declined", "review_approved", "review_changes"]),
  title: text(200), body: text(1000), at: isoDate, read: z.boolean(), requestId: id.optional(), emailed: z.boolean(),
});

export const pricingSettings = z.object({
  defaultTemplateId: text(64),
  overrides: z.record(z.string(), z.object({ tier: z.enum(["free", "paid"]), price: z.number().min(0).optional() })),
});

export const librarySettings = z.object({
  disabledTemplates: z.array(text(64)),
  disabledThemes: z.array(text(140)),
  savedTemplates: z.array(z.object({
    id, name: text(80), baseId: text(64), themeId: text(64), customTokens: themeTokens.partial().optional(),
    fontPairingId: text(64), buttonShape: z.enum(["pill", "rounded", "square"]), buttonFill: z.enum(["solid", "outline", "soft"]), created_at: isoDate,
  })),
});

/** Keys of `cardContent`: the only card fields a client's direct write may touch (plus updatedAt, lastEditedBy). */
export const CLIENT_EDITABLE_CARD_FIELDS = Object.keys(cardContent.shape) as (keyof z.infer<typeof cardContent>)[];

/** Stored card document fields a client may write: the content plus the embedded org chart map. */
export const CLIENT_EDITABLE_CARD_DOC_FIELDS = [...CLIENT_EDITABLE_CARD_FIELDS, "orgChart"] as const;
