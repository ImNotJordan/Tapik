import type { CardEntitlements, PricingOverrides, Role, TemplateId, TemplatePricing, TemplateRequest } from "@/lib/types";
import { TEMPLATES } from "@/templates/registry";
import { basePrice } from "./pricing";

/**
 * Paid templates. Exactly one template is the Default and is free; every other
 * template is paid unless the admin made it free. Themes are always free.
 */

/** What the guard needs to know about prices: the Default and the admin's overrides. */
export type PricingSettings = { defaultTemplateId: TemplateId; overrides: PricingOverrides };

export function templatePricing(templateId: TemplateId, settings: PricingSettings): TemplatePricing {
  if (templateId === settings.defaultTemplateId) return { templateId, tier: "free", isDefault: true };
  const o = settings.overrides[templateId];
  const tier = o?.tier ?? "paid";
  return { templateId, tier, price: tier === "paid" ? o?.price ?? basePrice(templateId) : undefined, isDefault: false };
}

export function allTemplatePricing(settings: PricingSettings): TemplatePricing[] {
  return TEMPLATES.map((t) => templatePricing(t.id, settings));
}

/** Unlocked for this card (the Default and free templates need no unlock). */
export function isTemplateUnlocked(entitlements: CardEntitlements | undefined, templateId: TemplateId): boolean {
  return !!entitlements?.unlockedTemplateIds.includes(templateId);
}

/**
 * The one rule for paid templates, used everywhere a template is saved to a
 * card: the editor, the gallery, the apply dialog and publishing.
 * Admins may apply any template (on a client card that unlocks it, a comp).
 * Clients may apply the Default and free templates, and paid ones only once
 * unlocked (approved or paid). Previewing never goes through here.
 */
export function canApplyTemplate(role: Role, entitlements: CardEntitlements | undefined, pricing: PricingSettings, templateId: TemplateId): boolean {
  if (role === "admin") return true;
  if (templatePricing(templateId, pricing).tier === "free") return true;
  return isTemplateUnlocked(entitlements, templateId);
}

/** How a template tile looks to the person picking it. */
export type TemplateAccess = "free" | "unlocked" | "requested" | "locked";

/** Still open: one per card and template. */
export const OPEN_REQUEST: TemplateRequest["status"][] = ["pending_payment", "payment_submitted", "payment_rejected", "pending", "awaiting_payment"];
/** Waiting for the client to pay (or pay again). They may still cancel only before a payment is submitted. */
export const NEEDS_PAYMENT: TemplateRequest["status"][] = ["pending_payment", "payment_rejected"];

export function openRequestFor(requests: TemplateRequest[], cardId: string, templateId: TemplateId): TemplateRequest | undefined {
  return requests.find((r) => r.cardId === cardId && r.templateId === templateId && OPEN_REQUEST.includes(r.status));
}

export function templateAccess(role: Role, entitlements: CardEntitlements | undefined, pricing: PricingSettings, templateId: TemplateId, openRequest?: TemplateRequest): TemplateAccess {
  if (templatePricing(templateId, pricing).tier === "free") return "free";
  if (isTemplateUnlocked(entitlements, templateId)) return "unlocked";
  if (role === "admin") return "locked";
  return openRequest ? "requested" : "locked";
}

/**
 * Honest locks, checked over data: every client card's saved template must be
 * free or unlocked for that card. Used by the guard tests, publishing, and a
 * dev-only warning in the store.
 */
export function lockViolations(
  cards: { id: string; clientId?: string; templateId: string }[],
  entitlements: CardEntitlements[],
  pricing: PricingSettings,
): string[] {
  return cards
    .filter((c) => c.clientId && !canApplyTemplate("client", entitlements.find((e) => e.cardId === c.id), pricing, c.templateId))
    .map((c) => `${c.id} is saved on ${c.templateId} without an unlock`);
}
