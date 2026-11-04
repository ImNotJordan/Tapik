/**
 * Clients and their cards.
 * Firebase mode: createClientCard is one server transaction (client, card, link,
 * unlocks, draft invite); disabling and revoking go through Functions too.
 */
import * as portal from "@/lib/store/portal";
import { patchCard } from "@/lib/store/actions";
import type { Card } from "@/lib/types";
import { isFirebaseMode } from "./mode";
import type { Result } from "./types";

export { touchClientActive } from "@/lib/store/portal";

export type CreateClientInput = portal.NewClientInput & {
  /** Card details the admin changed from the client's own (New card, step 3). */
  cardPatch?: Partial<Pick<Card, "name" | "phone" | "email" | "company">>;
  /** "Unlock now" for a paid template. */
  unlock?: { templateId: string; paid: boolean; reference?: string; reason?: string };
  invite?: { subject?: string; message?: string };
};

export type Created = { clientId: string; clientName: string; clientEmail: string; cardId: string; inviteId: string; unlockError?: string };

export async function createClientCard(input: CreateClientInput): Promise<Result<Created>> {
  if (!isFirebaseMode) {
    const res = portal.createClientCard(input);
    if (input.cardPatch && Object.keys(input.cardPatch).length) patchCard(res.card.id, input.cardPatch);
    let unlockError: string | undefined;
    if (input.unlock) {
      const u = await portal.unlockTemplateNow(res.card.id, input.unlock.templateId, input.unlock);
      if (!u.ok) unlockError = u.error;
    }
    if (input.invite) portal.saveInviteDraft(res.invite.id, input.invite.subject ?? "", input.invite.message ?? "");
    return { ok: true, data: { clientId: res.client.id, clientName: res.client.name, clientEmail: res.client.email, cardId: res.card.id, inviteId: res.invite.id, unlockError } };
  }
  const { call } = await import("./callable");
  const r = await call<{ clientId: string; cardId: string; inviteId: string | null }>("createClientCard", {
    cardId: input.cardId,
    client: input.client,
    look: { templateId: input.look.templateId, themeId: input.look.themeId, fontPairingId: input.look.fontPairingId, buttonShape: input.look.buttonShape, buttonFill: input.look.buttonFill },
    starter: input.starter,
    card: input.cardPatch ?? {},
    permissions: input.permissions,
    unlock: input.unlock ? { paid: input.unlock.paid, reference: input.unlock.reference, reason: input.unlock.reason } : undefined,
    invite: input.invite ?? {},
  });
  if (!r.ok) return r;
  if (!r.data.inviteId) return { ok: false, error: "The card was created, but its invite wasn’t. Send one from Clients." };
  return { ok: true, data: { clientId: r.data.clientId, clientName: input.client.name, clientEmail: input.client.email.trim().toLowerCase(), cardId: r.data.cardId, inviteId: r.data.inviteId } };
}

export async function setClientDisabled(clientId: string, disabled: boolean): Promise<Result> {
  if (!isFirebaseMode) return portal.setClientDisabled(clientId, disabled);
  const { call } = await import("./callable");
  const r = await call<{ status: string }>("setClientDisabled", { clientId, disabled });
  return r.ok ? { ok: true, data: undefined } : r;
}

/** Open invite links stop working; an active client is signed out and must be invited again. */
export async function revokeClientAccess(clientId: string): Promise<Result> {
  if (!isFirebaseMode) return portal.revokeClientAccess(clientId);
  const { call } = await import("./callable");
  const r = await call<{ ok: boolean }>("revokeInvite", { clientId });
  return r.ok ? { ok: true, data: undefined } : r;
}
