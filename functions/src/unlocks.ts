import "./setup";
/**
 * Template unlocks (entitlements/{cardId}) for client cards.
 *
 * Invariant: a client's card is always unlocked for the template it is on.
 * Only an admin or a Function can change a card's templateId (firestore.rules:
 * clients can't), so a paid template on a client card is the studio's choice,
 * which the product treats as a comp. Enforcing it here, on the server, keeps
 * the invariant whatever the browser did: an old tab, a failed call, a template
 * switched before unlocks were saved.
 *
 * Called by publish (publishCard, reviewDecision approve) and by onCardWritten
 * when an admin changes a client card's template.
 */
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { templatePricing, type PricingSettings } from "@/lib/entitlements";
import { COL } from "@/lib/firebase/model";
import { hasTemplate } from "@/templates/registry";

const db = () => getFirestore();

export async function pricing(): Promise<PricingSettings> {
  const d = (await db().doc("settings/pricing").get()).data() as Partial<PricingSettings> | undefined;
  return { defaultTemplateId: d?.defaultTemplateId ?? "keepsake", overrides: d?.overrides ?? {} };
}

/** Unlocks the card's current template if it's paid and not unlocked yet. Returns the template it unlocked, or null. */
export async function ensureCurrentTemplateUnlocked(cardId: string, card: { clientId?: string | null; templateId?: string }): Promise<string | null> {
  const templateId = card.templateId;
  if (!card.clientId || !templateId || !hasTemplate(templateId)) return null;
  if (templatePricing(templateId, await pricing()).tier !== "paid") return null;
  const ref = db().collection(COL.entitlements).doc(cardId);
  const comped = await db().runTransaction(async (tx) => {
    const unlocked = ((await tx.get(ref)).get("unlockedTemplateIds") as string[] | undefined) ?? [];
    if (unlocked.includes(templateId)) return null;
    tx.set(ref, { unlockedTemplateIds: FieldValue.arrayUnion(templateId), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return templateId;
  });
  if (comped) logger.info("template unlocked for client card (studio's choice)", { cardId, templateId });
  return comped;
}
