/**
 * Template prices, in one place. Components never hardcode a price: they read
 * TemplatePricing from lib/entitlements.ts, which starts from these values and
 * applies the admin's overrides from Settings > Templates & pricing.
 * Themes (color presets) are always free.
 * TODO(backend): move to a `template_pricing` table so prices change without a deploy.
 */
export const PRICING = {
  currency: "PHP" as const,
  /** Mock Default: the one free template. The admin can pick another in settings. */
  defaultTemplateId: "keepsake",
  /** Most paid templates. */
  standardPrice: 299,
  /** "Pro" templates: the ones with extra machinery (org chart tree, countdown, two languages, routes). */
  proPrice: 499,
  proTemplates: ["boardroom", "event-promo", "bilingual", "transit", "hyacinth-executive"] as string[],
  /** Invite links stop working after this many days. */
  inviteValidDays: 7,
};

/** The configured price for a paid template, before admin overrides. */
export function basePrice(templateId: string): number {
  return PRICING.proTemplates.includes(templateId) ? PRICING.proPrice : PRICING.standardPrice;
}

const PESO = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 });

/** "₱299". Whole pesos only; prices are set in whole pesos. */
export function formatPeso(amount: number): string {
  return PESO.format(amount);
}
