/**
 * Data shapes for the Digital Business Card product.
 * Flat, Supabase-friendly rows: every table has `id` and `created_at`,
 * foreign keys are plain `cardId` / `orgChartId` columns.
 */

/** Sections the admin can reorder on the public card. */
export type ReorderableSection =
  | "quote"
  | "about"
  | "contact"
  | "socials"
  | "photos"
  | "map"
  | "orgChart";

/** Header elements the admin can hide (they keep a fixed position). */
export type HeaderElement = "backgroundPhoto" | "logo" | "agentPhoto" | "poweredBy";

export type SectionKey = ReorderableSection | HeaderElement;

export type MessageChannel = "sms" | "whatsapp" | "viber" | "messenger";

export type ButtonShape = "pill" | "rounded" | "square";
export type ButtonFill = "solid" | "outline" | "soft";

/** The five brand colors from the spec, plus the text color for each surface. */
export type ThemeTokens = {
  /** Page ground behind everything. */
  background: string;
  /** Text and icons placed directly on the background. */
  onBackground: string;
  /** Sheets, cards and tiles. */
  surface: string;
  /** Text on the surface. */
  text: string;
  /** Main action buttons (Call, Message). */
  primary: string;
  /** Text and icons on primary buttons. */
  onPrimary: string;
  /** Small highlights: map pin, card mark, counters. */
  accent: string;
};

/** Template ids come from templates/registry.ts (e.g. "keepsake", "folio"). */
export type TemplateId = string;
/** A theme id from the card's template manifest, or "custom" for the admin's own colors. */
export type ThemeId = string;

export type TemplateCategory = "Real estate" | "Personal brand" | "Corporate" | "Local business" | "Creative" | "Professional";

/** One row of opening or clinic hours. `day` 0 = Sunday. Times are 24h "HH:MM". */
export type OpeningHours = { day: number; open: string; close: string; closed?: boolean };

/** A dated event or promo, shown by templates that support it (e.g. Event / Promo). */
export type CardEvent = {
  title: string;
  /** ISO date-time with offset, e.g. "2026-12-12T16:00:00+08:00". */
  startsAt: string;
  endsAt?: string;
  venue?: string;
  note?: string;
  /** Small line above the title, e.g. "GRAND OPENING" (Opening Night). */
  eyebrow?: string;
  /** How the time is shown, e.g. "4 PM till late" (Opening Night). */
  timeLabel?: string;
};

/** A small status pill, e.g. "On duty now" (Dispatch) or "Open to projects" (Commit). */
export type StatusChip = { label: string; tone: "live" | "neutral" };

/** The Filipino version of the card's own words (Dalawang Wika). UI labels come from the template. */
export type CardTranslations = { fil?: { title?: string; quote?: string; description?: string; chips?: string[] } };

/** One row of a tech stack table, e.g. Frontend → "Next.js · React · Tailwind" (Commit). */
export type StackRow = { label: string; value: string };

/** The chat in Prompt's hero: what the client asked, the builder's reply, and the result line. */
export type PromptDemo = { ask: string; replyLines: string[]; resultLabel?: string };

export type Card = {
  id: string;
  slug: string;
  status: "draft" | "published";
  templateId: TemplateId;
  themeId: ThemeId;
  customTokens?: Partial<ThemeTokens>;
  fontPairingId: string;
  buttonShape: ButtonShape;
  buttonFill: ButtonFill;
  motion: boolean;

  name: string;
  title?: string;
  company?: string;
  /** Licence or registration line, e.g. "PRC REB No. 0004127". */
  credential?: string;
  quote?: string;
  description?: string;

  phone?: string;
  messageChannel: MessageChannel;
  /** Number or username for the message channel. Falls back to `phone`. */
  messageTarget?: string;
  email?: string;

  address?: string;
  mapLat?: number;
  mapLng?: number;
  showDirections: boolean;

  agentPhotoUrl?: string;
  agentPhotoAlt?: string;
  /** Crop applied to the agent photo: zoom 1–3, offset in % of overflow. */
  agentPhotoCrop?: { zoom: number; x: number; y: number };
  backgroundPhotoUrl?: string;
  backgroundPhotoAlt?: string;
  backgroundFocalPoint?: { x: number; y: number };
  /** 0–1, darkness of the overlay that keeps text legible on the photo. */
  overlayOpacity?: number;
  logoUrl?: string;
  logoDarkUrl?: string;
  logoAlt?: string;

  /*
   * Template-specific details. Stored on every card; templates that don't
   * support a field simply don't show it, so switching never loses it.
   */
  hours?: OpeningHours[];
  /** Services offered, shown as chips (Clinic Calm, Sunny Counter). */
  services?: string[];
  /** Places served (Transport & Logistics). */
  serviceAreas?: string[];
  /** Booking page for the booking button (Clinic Calm, Hyacinth Executive). */
  bookingUrl?: string;
  /** Booking button label. Hyacinth Executive defaults it to "Book a Strategy Call". */
  bookingLabel?: string;
  /** Small line under the booking label, e.g. "30 min · No commitment" (Hyacinth Executive). */
  bookingNote?: string;
  /** Industries and expertise, shown as chips (Hyacinth Executive). */
  expertiseChips?: string[];
  /** Company line under the logo, e.g. "Fractional Executive Services" (Hyacinth Executive). */
  tagline?: string;
  /** Short tag above the name, e.g. "Fractional Executive Support" (Hyacinth Executive). */
  eyebrow?: string;
  /** ID-card details (Boardroom). */
  department?: string;
  employeeId?: string;
  event?: CardEvent;
  /** Status pill (Dispatch, Commit). Each template has its own default label. */
  statusChip?: StatusChip;
  /** Filipino version of the title, quote, about and chips (Dalawang Wika). */
  translations?: CardTranslations;
  /** Tech stack rows (Commit). */
  stackRows?: StackRow[];
  /** GitHub username for the commit activity graph (Commit). No username, no graph: never fake activity. */
  githubUsername?: string;
  /** The chat shown in Prompt's hero. Empty: the cover photo shows instead. */
  promptDemo?: PromptDemo;

  sectionOrder: ReorderableSection[];
  hiddenSections: SectionKey[];

  /** The client who owns the card (Client Portal). Absent = studio-only card. */
  clientId?: string;
  permissions?: CardPermissions;
  review?: CardReview;

  created_at: string;
  updated_at: string;
  published_at?: string;
};

export type SocialPlatform =
  | "facebook"
  | "instagram"
  | "tiktok"
  | "linkedin"
  | "x"
  | "youtube"
  | "whatsapp"
  | "viber"
  | "telegram"
  | "website"
  | "custom";

export type SocialLink = {
  id: string;
  cardId: string;
  platform: SocialPlatform;
  url: string;
  /** Shown for custom links; optional elsewhere. */
  label?: string;
  position: number;
  visible: boolean;
  created_at: string;
};

export type AlbumPhoto = {
  id: string;
  cardId: string;
  url: string;
  caption?: string;
  /** Short label on a project plate, e.g. "P-024" or "Next.js · Supabase" (Mosaic, Blueprint, Prompt, Commit). */
  tag?: string;
  alt?: string;
  position: number;
  isCover: boolean;
  created_at: string;
  /** Storage object path (Firebase mode). Media never leaves cards/{cardId}/. */
  storagePath?: string;
  /** 400px WebP made by the onPhotoUpload function, used for album tiles. */
  thumbUrl?: string;
  width?: number;
  height?: number;
};

export type OrgChart = {
  id: string;
  cardId: string;
  mode: "upload" | "tree";
  fileUrl?: string;
  fileType?: "image" | "pdf";
  fileName?: string;
  fileAlt?: string;
  created_at: string;
};

export type OrgMember = {
  id: string;
  orgChartId: string;
  parentId: string | null;
  name: string;
  role: string;
  photoUrl?: string;
  position: number;
  created_at: string;
};

/** Everything needed to render one card. */
export type CardBundle = {
  card: Card;
  socials: SocialLink[];
  photos: AlbumPhoto[];
  orgChart?: OrgChart;
  orgMembers: OrgMember[];
};

/** A template saved from the library: a base template with its own name, theme and fonts. */
export type SavedTemplate = {
  id: string;
  name: string;
  baseId: TemplateId;
  themeId: ThemeId;
  customTokens?: Partial<ThemeTokens>;
  fontPairingId: string;
  buttonShape: ButtonShape;
  buttonFill: ButtonFill;
  created_at: string;
};

/** Admin-wide template settings (Template library). */
export type LibrarySettings = {
  defaultTemplateId: TemplateId;
  disabledTemplates: TemplateId[];
  /** `${templateId}:${themeId}` */
  disabledThemes: string[];
  /** TODO(backend): per-admin, not per-workspace. */
  favoriteTemplates: TemplateId[];
  savedTemplates: SavedTemplate[];
};

/* ---------------------------------------------- Clients, invites, paid templates */

/** Who is using the studio. Mock only: see lib/session.ts. TODO(backend): Supabase auth + a role claim. */
export type Role = "admin" | "client";

/** Per card: may the client publish their own edits, or does the admin review them first? */
export type CardPermissions = { clientCanPublish: boolean; requireReview: boolean };

export type ClientStatus = "invited" | "active" | "disabled";

export type Client = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  status: ClientStatus;
  invitedAt: string;
  lastActiveAt?: string;
  cardId: string;
};

export type InviteStatus = "draft" | "sent" | "opened" | "accepted" | "expired" | "revoked";

export type Invite = {
  id: string;
  clientId: string;
  cardId: string;
  /** Mock token. TODO(backend): signed, single-use, stored hashed. */
  token: string;
  createdAt: string;
  /** Empty for drafts ("Send later"). */
  sentAt?: string;
  expiresAt: string;
  openedAt?: string;
  acceptedAt?: string;
  revokedAt?: string;
  status: InviteStatus;
  /** "link" = the admin copied the link instead of emailing it. */
  channel?: "email" | "link";
  subject?: string;
  message?: string;
};

export type TemplateTier = "free" | "paid";

/**
 * A template's price for clients. Built from lib/pricing.ts plus the admin's
 * overrides; exactly one template is the Default, which is always free.
 */
export type TemplatePricing = { templateId: TemplateId; tier: TemplateTier; price?: number /* PHP */; isDefault: boolean };

export type TemplateRequestStatus = "pending" | "awaiting_payment" | "paid" | "approved" | "declined" | "cancelled";

export type TemplateRequest = {
  id: string;
  clientId: string;
  cardId: string;
  templateId: TemplateId;
  /** The theme the client was previewing; applied with "Apply now" after the unlock. */
  themeId?: ThemeId;
  price: number;
  currency: "PHP";
  /** Optional message from the client. */
  note?: string;
  status: TemplateRequestStatus;
  requestedAt: string;
  resolvedAt?: string;
  /** Shown to the client when declined; internal otherwise. */
  adminNote?: string;
  /** Set by "Mark as paid". */
  paidAmount?: number;
  paymentRef?: string;
  /** Set when approved without payment. */
  compReason?: string;
  paymentRequestedAt?: string;
  /** The admin unlocked it while creating the card (no client request). */
  byAdmin?: boolean;
};

/** Paid templates a card may use. The Default template is always implied. */
export type CardEntitlements = { cardId: string; unlockedTemplateIds: TemplateId[] };

export type ChangeLog = { id: string; cardId: string; actor: Role; actorName: string; field: string; at: string };

/** "Submit for review" state on a card whose client can't publish directly. */
export type CardReview = {
  status: "pending" | "changes_requested" | "approved";
  submittedAt: string;
  resolvedAt?: string;
  /** Admin's note when asking for changes. */
  note?: string;
};

export type ClientNotificationKind = "template_unlocked" | "payment_requested" | "request_declined" | "review_approved" | "review_changes";

export type ClientNotification = {
  id: string;
  clientId: string;
  cardId: string;
  kind: ClientNotificationKind;
  title: string;
  body: string;
  at: string;
  read: boolean;
  requestId?: string;
  /** Mock: an email went out too (TODO(backend): transactional email). */
  emailed: boolean;
};

/** Admin overrides on top of lib/pricing.ts, by template id. The Default is library.defaultTemplateId. */
export type PricingOverrides = Record<TemplateId, { tier: TemplateTier; price?: number }>;
