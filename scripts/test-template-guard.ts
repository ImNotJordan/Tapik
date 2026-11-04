/**
 * Tests for the paid-template guard. Run: npm run test:guards
 * 1. canApplyTemplate over every role × tier × unlock combination.
 * 2. Pricing: one Default, always free; config and admin overrides.
 * 3. The seed data has no client card saved on a locked template.
 */
import assert from "node:assert/strict";
import { createSeedDB } from "../lib/mock";
import { PRICING, basePrice } from "../lib/pricing";
import { allTemplatePricing, canApplyTemplate, lockViolations, templateAccess, templatePricing, type PricingSettings } from "../lib/entitlements";
import type { CardEntitlements, TemplateRequest } from "../lib/types";
import { TEMPLATES } from "../templates/registry";

let passed = 0;
function test(name: string, fn: () => void) {
  fn();
  passed++;
  console.log(`  ok  ${name}`);
}

const pricing: PricingSettings = { defaultTemplateId: "keepsake", overrides: {} };
const none: CardEntitlements = { cardId: "c", unlockedTemplateIds: [] };
const folio: CardEntitlements = { cardId: "c", unlockedTemplateIds: ["folio"] };

console.log("canApplyTemplate");
test("admin may apply the Default", () => assert.equal(canApplyTemplate("admin", none, pricing, "keepsake"), true));
test("admin may apply a locked paid template (a comp)", () => assert.equal(canApplyTemplate("admin", none, pricing, "folio"), true));
test("client may apply the Default", () => assert.equal(canApplyTemplate("client", none, pricing, "keepsake"), true));
test("client may not apply a locked paid template", () => assert.equal(canApplyTemplate("client", none, pricing, "folio"), false));
test("client may not apply a paid template with no entitlements row", () => assert.equal(canApplyTemplate("client", undefined, pricing, "folio"), false));
test("client may apply a paid template once unlocked", () => assert.equal(canApplyTemplate("client", folio, pricing, "folio"), true));
test("an unlock is per template", () => assert.equal(canApplyTemplate("client", folio, pricing, "reel"), false));
test("a template the admin made free is free for clients", () => {
  const p = { ...pricing, overrides: { folio: { tier: "free" as const } } };
  assert.equal(canApplyTemplate("client", none, p, "folio"), true);
});
test("changing the Default frees the new one and locks the old one", () => {
  const p = { ...pricing, defaultTemplateId: "folio" };
  assert.equal(canApplyTemplate("client", none, p, "folio"), true);
  assert.equal(canApplyTemplate("client", none, p, "keepsake"), false);
});
test("tile states: free, unlocked, requested, locked", () => {
  const open = { status: "pending" } as TemplateRequest;
  assert.equal(templateAccess("client", none, pricing, "keepsake"), "free");
  assert.equal(templateAccess("client", folio, pricing, "folio"), "unlocked");
  assert.equal(templateAccess("client", none, pricing, "folio", open), "requested");
  assert.equal(templateAccess("client", none, pricing, "folio"), "locked");
});

console.log("Pricing");
test("exactly one template is the Default, and it is free", () => {
  const all = allTemplatePricing(pricing);
  assert.equal(all.length, TEMPLATES.length);
  assert.equal(all.filter((p) => p.isDefault).length, 1);
  assert.deepEqual(all.find((p) => p.isDefault), { templateId: "keepsake", tier: "free", isDefault: true });
});
test("the Default stays free even with a paid override", () => {
  const p = { ...pricing, overrides: { keepsake: { tier: "paid" as const, price: 999 } } };
  assert.equal(templatePricing("keepsake", p).tier, "free");
});
test("every other template is paid at the configured standard or Pro price", () => {
  for (const t of allTemplatePricing(pricing).filter((p) => !p.isDefault)) {
    assert.equal(t.tier, "paid");
    assert.equal(t.price, PRICING.proTemplates.includes(t.templateId) ? PRICING.proPrice : PRICING.standardPrice);
    assert.equal(t.price, basePrice(t.templateId));
  }
});
test("an admin price override wins over the config", () => {
  assert.equal(templatePricing("folio", { ...pricing, overrides: { folio: { tier: "paid", price: 349 } } }).price, 349);
});

console.log("Seed data");
const db = createSeedDB();
const seedPricing = { defaultTemplateId: db.library.defaultTemplateId, overrides: db.pricing };
test("no client card is saved on a locked template", () => assert.deepEqual(lockViolations(db.cards, db.entitlements, seedPricing), []));
test("the guard catches a card on a locked template", () => {
  const cards = db.cards.map((c) => (c.id === "card_carmela" ? { ...c, templateId: "folio" } : c));
  assert.equal(lockViolations(cards, db.entitlements, seedPricing).length, 1);
});
test("8 requests cover every status", () => {
  const statuses = new Set(db.templateRequests.map((r) => r.status));
  assert.equal(db.templateRequests.length, 8);
  for (const s of ["pending", "awaiting_payment", "paid", "approved", "declined", "cancelled"]) assert.ok(statuses.has(s as never), s);
});

console.log(`\n${passed} passed`);
