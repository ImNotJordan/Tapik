"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Ban, Check, CirclePause, CirclePlay, Ellipsis, ExternalLink, Link2, Mail, Pencil, Phone, Plus, RefreshCw, Search, Send, Users, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { MockDB } from "@/lib/mock";
import { formatPeso } from "@/lib/pricing";
import { approveCardReview, requestCardChanges, setCardPermissions } from "@/lib/services/cards";
import { revokeClientAccess, setClientDisabled } from "@/lib/services/clients";
import { isEmailEnabled } from "@/lib/services/mode";
import { useDB } from "@/lib/services/data";
import { inviteStatus, inviteUrl, latestInvite, resendClientInvite, sendInvite } from "@/lib/services/invites";
import { requestTemplateName, requestsForCard } from "@/lib/services/requests";
import { entitlementsFor, pricingOf } from "@/lib/services/templates";
import { isTemplateUnlocked, OPEN_REQUEST, templatePricing } from "@/lib/entitlements";
import type { Card, Client, Invite } from "@/lib/types";
import { bundleFromDB } from "@/lib/mock";
import { WORKSPACE } from "@/lib/mock/workspace";
import { cn, formatDate, formatRelative, initials, publicCardPath } from "@/lib/utils";
import { getTemplate } from "@/templates/registry";
import { Button, LinkButton } from "@/components/ui/button";
import { Badge, Skeleton, Toggle } from "@/components/ui/controls";
import { Dialog, Sheet } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Menu, type MenuItem } from "@/components/ui/menu";
import { StatusChip } from "@/components/ui/status-chip";
import { useToast } from "@/components/ui/toast";
import { ReviewBanner } from "@/components/portal/review-banner";
import { TemplateThumbnail } from "@/components/templates/template-thumbnail";
import { PageHeader } from "./studio-shell";

type Filter = "all" | "invited" | "active" | "pending";

const openCount = (db: MockDB, c: Client) => db.templateRequests.filter((r) => r.clientId === c.id && OPEN_REQUEST.includes(r.status)).length;

/** Clients of the business: who's invited, who's active, who wants a paid template. */
export function Clients() {
  const { db, hydrated } = useDB();
  const router = useRouter();
  const params = useSearchParams();
  const openId = params.get("client");
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [confirm, setConfirm] = useState<{ kind: "revoke" | "disable"; client: Client } | null>(null);
  const ops = useClientOps();

  const counts: Record<Filter, number> = {
    all: db.clients.length,
    invited: db.clients.filter((c) => c.status === "invited").length,
    active: db.clients.filter((c) => c.status === "active").length,
    pending: db.clients.filter((c) => openCount(db, c) > 0).length,
  };

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return db.clients
      .filter((c) => (filter === "all" ? true : filter === "pending" ? openCount(db, c) > 0 : c.status === filter))
      .filter((c) => !q || [c.name, c.email, c.company].some((v) => v?.toLowerCase().includes(q)))
      .sort((a, b) => Date.parse(b.lastActiveAt ?? b.invitedAt) - Date.parse(a.lastActiveAt ?? a.invitedAt));
  }, [db, filter, query]);

  const setOpen = (id: string | null) => router.replace(id ? `/admin/clients?client=${id}` : "/admin/clients", { scroll: false });
  const openClient = hydrated && openId ? db.clients.find((c) => c.id === openId) ?? null : null;

  const menuFor = (c: Client): MenuItem[] => {
    const inv = latestInvite(db, c.id);
    const st = inv ? inviteStatus(inv) : null;
    const items: MenuItem[] = [{ label: "Open card", icon: <Pencil />, onSelect: () => router.push(`/admin/cards/${c.cardId}`) }];
    // Until email is set up, invites go out as links (Copy invite link / New invite link).
    if (isEmailEnabled && st === "draft") items.push({ label: "Send invite", icon: <Send />, onSelect: () => ops.sendDraft(c, inv!) });
    if (c.status !== "active" && c.status !== "disabled" && st !== "draft") {
      items.push(
        isEmailEnabled
          ? { label: "Resend invite", icon: <RefreshCw />, onSelect: () => ops.resend(c) }
          : { label: "Copy a new invite link", icon: <RefreshCw />, onSelect: () => ops.newLink(c) },
      );
    }
    if (inv && (st === "sent" || st === "opened" || st === "draft")) items.push({ label: "Copy invite link", icon: <Link2 />, onSelect: () => ops.copyLink(c, inv) });
    items.push({ type: "separator" });
    if (c.status !== "disabled") items.push({ label: "Revoke access", icon: <Ban />, danger: true, onSelect: () => setConfirm({ kind: "revoke", client: c }) });
    items.push(
      c.status === "disabled"
        ? { label: "Enable client", icon: <CirclePlay />, onSelect: () => ops.enable(c) }
        : { label: "Disable client", icon: <CirclePause />, danger: true, onSelect: () => setConfirm({ kind: "disable", client: c }) },
    );
    return items;
  };

  return (
    <div className="mx-auto flex max-w-[1240px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
      <PageHeader
        title="Clients"
        description={hydrated ? `${counts.all} clients, ${counts.active} active` : "Loading clients"}
        actions={
          <LinkButton href="/admin/cards/new" variant="primary" icon={<Plus aria-hidden className="size-4" />}>
            New card for a client
          </LinkButton>
        }
      />

      <p aria-live="polite" className="sr-only">
        {ops.announce}
      </p>

      {hydrated && db.clients.length === 0 ? (
        <div className="flex flex-col items-start gap-4 rounded-2xl border border-dashed border-studio-line-strong bg-studio-surface px-6 py-12">
          <span aria-hidden className="flex size-12 items-center justify-center rounded-full bg-studio-raised text-studio-ink-2">
            <Users className="size-6" strokeWidth={1.75} />
          </span>
          <div className="flex max-w-[52ch] flex-col gap-1">
            <p className="text-base font-semibold">No clients yet</p>
            <p className="text-sm text-studio-ink-3">Make a card for your first client and invite them by email. They finish it themselves from their phone, and you see every change here.</p>
          </div>
          <LinkButton href="/admin/cards/new" variant="primary" size="lg" icon={<Plus aria-hidden className="size-4" />}>
            New card for a client
          </LinkButton>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            <label className="relative max-w-sm">
              <span className="sr-only">Search clients</span>
              <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-studio-ink-3" />
              <Input type="search" placeholder="Search by name, email or company" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
            </label>
            <div role="group" aria-label="Filter clients" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]">
              {(
                [
                  ["all", "All"],
                  ["invited", "Invited"],
                  ["active", "Active"],
                  ["pending", "Has pending request"],
                ] as [Filter, string][]
              ).map(([f, label]) => {
                const active = f === filter;
                return (
                  <button
                    key={f}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setFilter(f)}
                    className={cn(
                      "inline-flex h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors",
                      active ? "border-studio-ink bg-studio-ink text-studio-surface" : "border-studio-line-strong bg-studio-surface text-studio-ink-2 hover:border-studio-ink-3 hover:text-studio-ink",
                    )}
                  >
                    {label}
                    <span className={cn("tabular-nums", active ? "opacity-75" : "text-studio-ink-3")}>{hydrated ? counts[f] : ""}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {!hydrated ? (
            <div aria-hidden className="flex flex-col gap-2 rounded-2xl border border-studio-line bg-studio-surface p-4">
              {Array.from({ length: 5 }, (_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-studio-line-strong bg-studio-surface px-6 py-10">
              <p className="text-base font-semibold">{query.trim() ? `No clients match “${query.trim()}”` : "No clients in this view"}</p>
              <Button
                size="sm"
                icon={<X aria-hidden className="size-4" />}
                onClick={() => {
                  setFilter("all");
                  setQuery("");
                }}
              >
                Clear filters
              </Button>
            </div>
          ) : (
            <div className="studio-scroll relative overflow-x-auto rounded-2xl border border-studio-line bg-studio-surface" role="region" aria-label="Clients table" tabIndex={0}>
              <table className="w-full min-w-[1000px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-studio-line text-2xs font-semibold text-studio-ink-3">
                    <th scope="col" className="py-3 pr-3 pl-4 font-semibold">Client</th>
                    <th scope="col" className="px-3 py-3 font-semibold">Card</th>
                    <th scope="col" className="px-3 py-3 font-semibold">Invite</th>
                    <th scope="col" className="px-3 py-3 font-semibold">Last active</th>
                    <th scope="col" className="px-3 py-3 font-semibold">Current template</th>
                    <th scope="col" className="px-3 py-3 font-semibold">Unlocked templates</th>
                    <th scope="col" className="px-3 py-3 font-semibold">Pending requests</th>
                    <th scope="col" className="py-3 pr-4 pl-3 text-right font-semibold">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => (
                    <ClientRow key={c.id} db={db} client={c} selected={c.id === openId} onOpen={() => setOpen(c.id)} menu={menuFor(c)} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <ClientDrawer client={openClient} onClose={() => setOpen(null)} menu={openClient ? menuFor(openClient) : []} />

      <Dialog
        open={!!confirm}
        onOpenChange={(v) => !v && setConfirm(null)}
        size="sm"
        title={confirm?.kind === "disable" ? `Disable ${confirm.client.name}?` : `Revoke ${confirm?.client.name ?? ""}’s access?`}
        description={
          confirm?.kind === "disable"
            ? "They can’t sign in to edit their card until you enable them again. The card stays online and nothing is deleted."
            : confirm?.client.status === "active"
              ? "They’re signed out and can’t sign in again until you send a new invite. The card stays online."
              : "The invite link stops working right away. You can send a new invite later."
        }
        footer={
          <>
            <Button onClick={() => setConfirm(null)}>Keep access</Button>
            <Button
              variant="danger"
              onClick={() => {
                if (!confirm) return;
                if (confirm.kind === "disable") ops.disable(confirm.client);
                else ops.revoke(confirm.client);
                setConfirm(null);
              }}
            >
              {confirm?.kind === "disable" ? "Disable client" : "Revoke access"}
            </Button>
          </>
        }
      />
    </div>
  );
}

/* --------------------------------------------------------------- Actions */

function useClientOps() {
  const toast = useToast();
  const [announce, setAnnounce] = useState("");
  const say = (m: string) => setAnnounce(m);

  return {
    announce,
    async sendDraft(c: Client, inv: Invite) {
      const res = await sendInvite(inv.id, { subject: inv.subject ?? "Your digital business card is ready to edit", message: inv.message ?? "", channel: "email" });
      if (!res.ok) return toast.error("The invite wasn’t sent", { description: res.error });
      say(`Invite sent to ${c.email}`);
      toast.success("Invite sent", { description: `To ${c.email}.` });
    },
    async resend(c: Client) {
      const res = await resendClientInvite(c.id);
      if (!res.ok) return toast.error("The invite wasn’t sent", { description: res.error });
      say(`New invite sent to ${c.email}`);
      toast.success("New invite sent", { description: `To ${c.email}. The old link no longer works.` });
    },
    /** A fresh link (earlier links stop working), copied to share by Viber, Messenger or text. */
    async newLink(c: Client) {
      const res = await resendClientInvite(c.id, "link");
      if (!res.ok) return toast.error("The link couldn’t be created", { description: res.error });
      try {
        await navigator.clipboard.writeText(inviteUrl(res.data.token));
        say("New invite link copied");
        toast.success("New invite link copied", { description: `Send it to ${c.name.split(" ")[0]} by Viber, Messenger or text. Earlier links no longer work.` });
      } catch {
        toast.error("Couldn’t copy the link", { description: inviteUrl(res.data.token) });
      }
    },
    async copyLink(c: Client, inv: Invite) {
      let token = inv.token;
      // Only a hash of a sent link is stored (Firebase mode), so copying makes a fresh link and the old one stops working.
      const replaced = !token && inv.status !== "draft";
      if (inv.status === "draft" || !token) {
        const res = await sendInvite(inv.id, { subject: inv.subject ?? "Your digital business card is ready to edit", message: inv.message ?? "", channel: "link" });
        if (!res.ok) return toast.error("The link couldn’t be created", { description: res.error });
        token = res.data.token;
      }
      try {
        await navigator.clipboard.writeText(inviteUrl(token));
        say("Invite link copied");
        toast.success("Invite link copied", { description: `Send it to ${c.name.split(" ")[0]} by Viber, Messenger or text.${replaced ? " Earlier links no longer work." : ""}` });
      } catch {
        toast.error("Couldn’t copy the link", { description: inviteUrl(token) });
      }
    },
    async revoke(c: Client) {
      const res = await revokeClientAccess(c.id);
      if (!res.ok) return toast.error("Access wasn’t revoked", { description: res.error });
      say(`Access revoked for ${c.name}`);
      toast.success("Access revoked", { description: "Send a new invite whenever they need it again." });
    },
    async disable(c: Client) {
      const res = await setClientDisabled(c.id, true);
      if (!res.ok) return toast.error("Couldn’t disable the client", { description: res.error });
      say(`${c.name} disabled`);
      toast.success(`${c.name} disabled`, { action: { label: "Undo", onClick: () => void setClientDisabled(c.id, false) } });
    },
    async enable(c: Client) {
      const res = await setClientDisabled(c.id, false);
      if (!res.ok) return toast.error("Couldn’t enable the client", { description: res.error });
      say(`${c.name} enabled`);
      toast.success(`${c.name} can sign in again`);
    },
  };
}

/* ------------------------------------------------------------------- Row */

/** The card's template, and why the client may use it: Default, Free (made free by the admin) or Unlocked. */
function templateSummary(db: MockDB, card: Card) {
  const pricing = templatePricing(card.templateId, pricingOf(db));
  const hint = pricing.isDefault ? "Default" : pricing.tier === "free" ? "Free" : isTemplateUnlocked(entitlementsFor(db, card.id), card.templateId) ? "Unlocked" : "Paid";
  return { name: getTemplate(card.templateId).name, hint };
}

function Avatar({ name, size = "md" }: { name: string; size?: "md" | "lg" }) {
  return (
    <span aria-hidden className={cn("inline-flex shrink-0 items-center justify-center rounded-full bg-studio-raised font-semibold text-studio-ink-2", size === "lg" ? "size-12 text-base" : "size-9 text-2xs")}>
      {initials(name)}
    </span>
  );
}

function ClientRow({ db, client, selected, onOpen, menu }: { db: MockDB; client: Client; selected: boolean; onOpen: () => void; menu: MenuItem[] }) {
  const card = db.cards.find((c) => c.id === client.cardId);
  const bundle = useMemo(() => bundleFromDB(db, client.cardId), [db, client.cardId]);
  const inv = latestInvite(db, client.id);
  const pending = openCount(db, client);
  const tpl = card ? templateSummary(db, card) : null;
  const unlockedCount = card ? entitlementsFor(db, card.id).unlockedTemplateIds.length : 0;

  return (
    <tr onClick={onOpen} className={cn("cursor-pointer border-b border-studio-line last:border-b-0 hover:bg-studio-raised/60", selected && "bg-studio-action-soft/60")}>
      <td className="py-3 pr-3 pl-4">
        <div className="flex items-center gap-3">
          <Avatar name={client.name} />
          <span className="flex min-w-0 flex-col">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpen();
              }}
              className="max-w-[220px] cursor-pointer truncate text-left font-semibold text-studio-ink hover:underline"
            >
              {client.name}
              <span className="sr-only">, open details</span>
            </button>
            <span className="max-w-[220px] truncate text-2xs text-studio-ink-3">{client.email}</span>
          </span>
        </div>
      </td>
      <td className="px-3 py-2">
        {card && bundle ? (
          // Overlay link: the thumbnail is a whole card with its own links, so it can't sit inside one.
          <div className="group relative inline-flex min-h-11 items-center gap-2.5 rounded-lg pr-2">
            <span className="overflow-hidden rounded-[6px] border border-studio-line">
              <TemplateThumbnail bundle={bundle} width={390} height={640} scale={0.1} />
            </span>
            <span aria-hidden className="flex flex-col">
              <span className="text-2xs font-semibold text-studio-action-ink group-hover:underline">Open card</span>
              <span className="text-2xs text-studio-ink-3">{card.status === "published" ? "Published" : "Draft"}</span>
            </span>
            <Link href={`/admin/cards/${card.id}`} onClick={(e) => e.stopPropagation()} aria-label={`Open ${client.name}’s card, ${getTemplate(card.templateId).name} template`} className="absolute inset-0 rounded-lg" />
          </div>
        ) : (
          <span className="text-2xs text-studio-ink-3">No card</span>
        )}
      </td>
      <td className="px-3 py-3">{inv ? <StatusChip kind="invite" status={inviteStatus(inv)} size="sm" /> : <span className="text-2xs text-studio-ink-3">None</span>}</td>
      <td className="px-3 py-3 text-2xs whitespace-nowrap text-studio-ink-2">{client.status === "disabled" ? <StatusChip kind="client" status="disabled" size="sm" /> : client.lastActiveAt ? formatRelative(client.lastActiveAt) : "Never"}</td>
      <td className="px-3 py-3">
        {tpl && (
          <span className="flex flex-col">
            <span className="text-2xs font-semibold">{tpl.name}</span>
            <span className="text-2xs text-studio-ink-3">{tpl.hint}</span>
          </span>
        )}
      </td>
      <td className="px-3 py-3 text-2xs tabular-nums">
        {unlockedCount > 0 ? <span className="font-semibold text-studio-ink">{unlockedCount}</span> : <span className="text-studio-ink-3">0</span>}
        <span className="sr-only"> unlocked</span>
      </td>
      <td className="px-3 py-3">
        {pending > 0 ? (
          <Link href={`/admin/template-requests?client=${client.id}`} onClick={(e) => e.stopPropagation()} className="inline-flex min-h-11 items-center gap-1.5 text-2xs font-semibold text-studio-action-ink hover:underline">
            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-studio-warn-soft px-1.5 text-studio-warn-ink tabular-nums">{pending}</span>
            {pending === 1 ? "request" : "requests"}
          </Link>
        ) : (
          <span className="text-2xs text-studio-ink-3">
            0<span className="sr-only"> requests</span>
          </span>
        )}
      </td>
      <td className="py-2 pr-4 pl-3 text-right" onClick={(e) => e.stopPropagation()}>
        <Menu
          items={menu}
          trigger={
            <button type="button" aria-label={`Actions for ${client.name}`} className="inline-flex size-11 cursor-pointer items-center justify-center rounded-lg text-studio-ink-2 hover:bg-studio-raised hover:text-studio-ink">
              <Ellipsis aria-hidden className="size-5" />
            </button>
          }
        />
      </td>
    </tr>
  );
}

/* ---------------------------------------------------------------- Drawer */

type TimelineEvent = { at: string; label: string; detail?: string; tone: "done" | "bad" | "neutral" };

function inviteEvents(invites: Invite[]): TimelineEvent[] {
  const ev: TimelineEvent[] = [];
  for (const i of invites) {
    if (i.status === "draft") ev.push({ at: i.createdAt, label: "Invite saved as a draft", tone: "neutral" });
    if (i.sentAt) ev.push({ at: i.sentAt, label: i.channel === "link" ? "Invite link shared" : "Invite sent", detail: i.channel === "link" ? "Copied by you" : "By email", tone: "done" });
    if (i.openedAt) ev.push({ at: i.openedAt, label: "Invite opened", tone: "done" });
    if (i.acceptedAt) ev.push({ at: i.acceptedAt, label: "Invite accepted", detail: "Signed in to the portal", tone: "done" });
    if (i.status === "revoked") ev.push({ at: i.revokedAt ?? i.expiresAt, label: "Link revoked", tone: "bad" });
    else if (inviteStatus(i) === "expired") ev.push({ at: i.expiresAt, label: "Link expired", detail: "Not used in time", tone: "bad" });
  }
  return ev.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}

function ClientDrawer({ client, onClose, menu }: { client: Client | null; onClose: () => void; menu: MenuItem[] }) {
  const { db } = useDB();
  const toast = useToast();
  const [showAll, setShowAll] = useState(false);
  const [changesOpen, setChangesOpen] = useState(false);
  const [note, setNote] = useState("");
  const [noteTried, setNoteTried] = useState(false);
  const [busy, setBusy] = useState<null | "approve" | "changes">(null);

  const card = client ? db.cards.find((c) => c.id === client.cardId) : undefined;
  const invites = client ? db.invites.filter((i) => i.clientId === client.id) : [];
  const timeline = inviteEvents(invites);
  const log = card ? db.changeLog.filter((l) => l.cardId === card.id).sort((a, b) => Date.parse(b.at) - Date.parse(a.at)) : [];
  const shownLog = showAll ? log : log.slice(0, 12);
  const unlocked = card ? entitlementsFor(db, card.id).unlockedTemplateIds : [];
  const requests = card ? requestsForCard(db, card.id) : [];
  const tpl = card ? templateSummary(db, card) : null;

  const approve = async () => {
    if (!card) return;
    setBusy("approve");
    const res = await approveCardReview(card.id);
    setBusy(null);
    if (res.ok) toast.success("Approved and published", { description: `${client?.name} is told their changes are live.` });
    else toast.error("Couldn’t approve", { description: res.error });
  };
  const askChanges = async () => {
    setNoteTried(true);
    if (!card || !note.trim()) return;
    setBusy("changes");
    const res = await requestCardChanges(card.id, note);
    setBusy(null);
    if (!res.ok) return toast.error("Couldn’t send", { description: res.error });
    setChangesOpen(false);
    setNote("");
    setNoteTried(false);
    toast.success("Changes requested", { description: `${client?.name} sees your note in their portal and by email.` });
  };

  return (
    <Sheet
      open={!!client}
      onOpenChange={(v) => !v && onClose()}
      title={client?.name ?? "Client"}
      description={client ? [client.company, client.status === "active" ? "Active" : client.status === "invited" ? "Invited" : "Disabled"].filter(Boolean).join(" · ") : undefined}
      className="sm:w-[480px]"
    >
      {client && card && (
        <div className="flex flex-col gap-7 pt-1">
          <div className="flex items-center gap-3">
            <Avatar name={client.name} size="lg" />
            <div className="flex flex-wrap gap-1.5">
              <StatusChip kind="client" status={client.status} />
              {invites.length > 0 && <StatusChip kind="invite" status={inviteStatus(latestInvite(db, client.id)!)} />}
            </div>
            <div className="ml-auto">
              <Menu
                items={menu.filter((m) => !("label" in m) || m.label !== "Open card")}
                trigger={
                  <button type="button" aria-label={`More actions for ${client.name}`} className="inline-flex size-11 cursor-pointer items-center justify-center rounded-lg border border-studio-line-strong text-studio-ink-2 hover:bg-studio-raised">
                    <Ellipsis aria-hidden className="size-5" />
                  </button>
                }
              />
            </div>
          </div>

          {card.review?.status === "pending" && (
            <ReviewBanner
              review={card.review}
              audience="admin"
              company={WORKSPACE.company}
              clientName={client.name}
              actions={
                <>
                  <Button size="sm" variant="primary" loading={busy === "approve"} onClick={approve} icon={<Check aria-hidden className="size-4" />} className="h-11">
                    Approve &amp; publish
                  </Button>
                  <Button size="sm" onClick={() => setChangesOpen(true)} className="h-11">
                    Request changes
                  </Button>
                </>
              }
            />
          )}
          {card.review?.status === "changes_requested" && <ReviewBanner review={card.review} audience="admin" company={WORKSPACE.company} clientName={client.name} />}

          <Section title="Contact">
            <ul className="flex flex-col gap-1 text-sm">
              <li>
                <a href={`mailto:${client.email}`} className="inline-flex min-h-11 items-center gap-2.5 [overflow-wrap:anywhere] text-studio-ink hover:underline">
                  <Mail aria-hidden className="size-4 shrink-0 text-studio-ink-3" />
                  {client.email}
                </a>
              </li>
              {client.phone && (
                <li>
                  <a href={`tel:${client.phone.replace(/\s/g, "")}`} className="inline-flex min-h-11 items-center gap-2.5 text-studio-ink tabular-nums hover:underline">
                    <Phone aria-hidden className="size-4 shrink-0 text-studio-ink-3" />
                    {client.phone}
                  </a>
                </li>
              )}
            </ul>
            <div className="flex flex-wrap gap-2 pt-1">
              <LinkButton href={`/admin/cards/${card.id}`} icon={<Pencil aria-hidden className="size-4" />} className="h-11">
                Open card
              </LinkButton>
              {card.status === "published" && (
                <LinkButton href={publicCardPath(card.slug)} target="_blank" icon={<ExternalLink aria-hidden className="size-4" />} className="h-11">
                  View live card
                </LinkButton>
              )}
            </div>
          </Section>

          <Section title="Publishing">
            <Toggle
              label="Changes need my review"
              description={card.permissions?.requireReview ? "The client submits edits; you approve them before they go live." : "The client publishes their own edits."}
              checked={!!card.permissions?.requireReview}
              onCheckedChange={async (v) => {
                const res = await setCardPermissions(card.id, { clientCanPublish: !v, requireReview: v });
                if (res.ok) toast.success(v ? "Changes now need your review" : `${client.name.split(" ")[0]} can publish directly`);
                else toast.error("Not saved", { description: res.error });
              }}
            />
          </Section>

          <Section title="Invite">
            {timeline.length === 0 ? (
              <p className="text-sm text-studio-ink-3">No invite yet.</p>
            ) : (
              <ol className="flex flex-col">
                {timeline.map((e, i) => (
                  <li key={i} className="relative flex gap-3 pb-4 last:pb-0">
                    {i < timeline.length - 1 && <span aria-hidden className="absolute top-5 bottom-0 left-[7px] w-px bg-studio-line" />}
                    <span aria-hidden className={cn("relative mt-1 size-[15px] shrink-0 rounded-full border-2", e.tone === "done" ? "border-studio-success bg-studio-success-soft" : e.tone === "bad" ? "border-studio-danger-ink bg-studio-danger-soft" : "border-studio-line-strong bg-studio-surface")} />
                    <span className="flex flex-col">
                      <span className="text-sm font-semibold">{e.label}</span>
                      <span className="text-2xs text-studio-ink-3">
                        {formatDate(e.at)} · {formatRelative(e.at)}
                        {e.detail ? ` · ${e.detail}` : ""}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </Section>

          <Section title="Template">
            {tpl && (
              <p className="text-sm">
                <span className="font-semibold">{tpl.name}</span> <span className="text-studio-ink-3">· {tpl.hint}</span>
              </p>
            )}
            <p className="text-2xs font-semibold text-studio-ink-3">Unlocked paid templates</p>
            {unlocked.length ? (
              <ul className="flex flex-wrap gap-1.5">
                {unlocked.map((id) => (
                  <li key={id}>
                    <Badge tone="success">{getTemplate(id).name}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-studio-ink-3">None yet. The card can use the Default and any free template.</p>
            )}
          </Section>

          <Section title="Template requests">
            {requests.length === 0 ? (
              <p className="text-sm text-studio-ink-3">No requests yet.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-studio-line">
                {requests.map((r) => (
                  <li key={r.id}>
                    <Link href={`/admin/template-requests?request=${r.id}`} className="flex min-h-12 items-center gap-3 py-2 hover:bg-studio-raised/60">
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-sm font-semibold">{requestTemplateName(r)}</span>
                        <span className="text-2xs text-studio-ink-3 tabular-nums">
                          {formatPeso(r.price)} · {formatRelative(r.requestedAt)}
                        </span>
                      </span>
                      <StatusChip kind="request" status={r.status} size="sm" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Change log">
            {log.length === 0 ? (
              <p className="text-sm text-studio-ink-3">No edits yet.</p>
            ) : (
              <>
                <ul className="flex flex-col gap-2.5">
                  {shownLog.map((l) => (
                    <li key={l.id} className="flex items-start gap-2.5 text-sm">
                      <Badge tone={l.actor === "client" ? "action" : "neutral"} className="mt-px w-14 justify-center">
                        {l.actor === "client" ? "Client" : "Admin"}
                      </Badge>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span>
                          <span className="font-semibold">{l.field}</span>
                          <span className="text-studio-ink-3"> · {l.actorName}</span>
                        </span>
                        <span className="text-2xs text-studio-ink-3">{formatRelative(l.at)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
                {log.length > 12 && (
                  <Button size="sm" variant="ghost" onClick={() => setShowAll((v) => !v)} className="h-11 self-start">
                    {showAll ? "Show fewer" : `Show all ${log.length}`}
                  </Button>
                )}
              </>
            )}
          </Section>
        </div>
      )}

      <Dialog
        open={changesOpen}
        onOpenChange={setChangesOpen}
        title="Request changes"
        description={`${client?.name ?? "The client"} sees this note in their portal and by email. The live card doesn’t change.`}
        footer={
          <>
            <Button onClick={() => setChangesOpen(false)}>Cancel</Button>
            <Button variant="primary" loading={busy === "changes"} onClick={askChanges}>
              Send note
            </Button>
          </>
        }
      >
        <Field label="What should they change?" error={noteTried && !note.trim() ? "Add a note so they know what to fix." : null}>
          {(p) => <Textarea id={p.id} aria-describedby={p.describedBy} invalid={p.invalid} rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Please use the new licence number before this goes live." autoFocus />}
        </Field>
      </Dialog>
    </Sheet>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-t border-studio-line pt-5 first:border-t-0 first:pt-0">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}
