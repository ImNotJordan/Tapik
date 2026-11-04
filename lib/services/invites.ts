"use client";

/**
 * Invites and client sign-in.
 * Firebase mode: tokens are made and checked by Functions (only their hash is
 * stored), the invite page asks getInvite, and accepting signs the client in
 * with one click (acceptInvite returns a sign-in token).
 */
import { useEffect, useMemo, useState } from "react";
import { bundleFromDB } from "@/lib/mock";
import * as portal from "@/lib/store/portal";
import { useDB } from "@/lib/store/db";
import type { CardBundle, Client, Invite } from "@/lib/types";
import { isFirebaseMode } from "./mode";
import type { Result } from "./types";

export { inviteStatus, inviteUrl, latestInvite, type SignInMethod } from "@/lib/store/portal";
export { requestSignInLink } from "./session";

type Issued = { token: string; sentAt: string; expiresAt: string };
const asInvite = (base: Partial<Invite> & { id: string }, i: Issued, channel: "email" | "link"): Invite =>
  ({ clientId: "", cardId: "", createdAt: i.sentAt, ...base, token: i.token, sentAt: i.sentAt, expiresAt: i.expiresAt, status: "sent", channel }) as Invite;

/** Send a draft by email, or make a shareable link. In Firebase mode a new link replaces any earlier one. */
export async function sendInvite(inviteId: string, opts: { subject: string; message: string; channel: "email" | "link" }): Promise<Result<Invite>> {
  if (!isFirebaseMode) return portal.sendInvite(inviteId, opts);
  const { call } = await import("./callable");
  const r = await call<Issued>("sendInvite", { inviteId, ...opts });
  return r.ok ? { ok: true, data: asInvite({ id: inviteId, subject: opts.subject, message: opts.message }, r.data, opts.channel) } : r;
}

/** "Send later": in Firebase mode the subject and message were saved when the card was created. */
export function saveInviteDraft(inviteId: string, subject: string, message: string) {
  if (!isFirebaseMode) portal.saveInviteDraft(inviteId, subject, message);
}

/** A fresh invite by email; every earlier link for this client stops working. */
export async function resendClientInvite(clientId: string, channel: "email" | "link" = "email"): Promise<Result<Invite>> {
  if (!isFirebaseMode) return portal.resendClientInvite(clientId);
  const { call } = await import("./callable");
  const r = await call<Issued & { inviteId: string }>("resendInvite", { clientId, channel });
  return r.ok ? { ok: true, data: asInvite({ id: r.data.inviteId, clientId }, r.data, channel) } : r;
}

/* ------------------------------------------------------- invite page */

export type InviteView =
  | { state: "loading" }
  | { state: "invalid" }
  | { state: "valid" | "expired" | "revoked" | "accepted"; invite: Pick<Invite, "expiresAt" | "acceptedAt">; client: Pick<Client, "name" | "email" | "cardId">; bundle?: CardBundle | null };

/** What the invite page shows for a token, from the store (mock) or the getInvite Function. */
export function useInvite(token: string): InviteView {
  const { db, hydrated } = useDB();
  const mock = useMemo<InviteView>(() => {
    if (isFirebaseMode) return { state: "loading" };
    if (!hydrated) return { state: "loading" };
    const f = portal.lookupInvite(db, token);
    if (f.state === "invalid") return f;
    return { state: f.state, invite: f.invite, client: f.client, bundle: bundleFromDB(db, f.client.cardId) };
  }, [db, hydrated, token]);
  const [remote, setRemote] = useState<InviteView>({ state: "loading" });
  useEffect(() => {
    if (!isFirebaseMode) return;
    let live = true;
    void import("./callable").then(({ call }) =>
      call<Exclude<InviteView, { state: "loading" }>>("getInvite", { token }).then((r) => live && setRemote(r.ok ? r.data : { state: "invalid" })),
    );
    return () => {
      live = false;
    };
  }, [token]);
  return isFirebaseMode ? remote : mock;
}

/** Mock only: the server marks the invite "opened" when getInvite runs. */
export function markInviteOpened(token: string) {
  if (!isFirebaseMode) portal.markInviteOpened(token);
}

/** Accept and sign in. Firebase mode: one click (the link proves the email), no password. */
export async function acceptClientInvite(token: string, method: portal.SignInMethod, password?: string): Promise<Result> {
  if (!isFirebaseMode) {
    const r = await portal.acceptClientInvite(token, method, password);
    return r.ok ? { ok: true, data: undefined } : r;
  }
  const { call } = await import("./callable");
  const r = await call<{ customToken: string }>("acceptInvite", { token });
  if (!r.ok) return r;
  const { signInWithInviteToken } = await import("./session");
  return signInWithInviteToken(r.data.customToken);
}
