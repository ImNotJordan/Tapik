"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, BadgeCheck, CircleCheck, Gift, Inbox, Search, Send, X, XCircle } from "lucide-react";
import { memo, useCallback, useId, useMemo, useState, type ReactNode } from "react";
import { bundleFromDB } from "@/lib/mock";
import { formatPeso } from "@/lib/pricing";
import { useDB } from "@/lib/services/data";
import { type AdminResult, compRequest, declineRequest, markRequestPaid, paymentEmail, requestTemplateName, requestThemeName, sendPaymentDetailsFor } from "@/lib/services/requests";
import type { CardBundle, Client, TemplateRequest, TemplateRequestStatus } from "@/lib/types";
import { cn, formatDate, formatRelative, initials } from "@/lib/utils";
import { getTemplate, lookFor, TEMPLATES } from "@/templates/registry";
import { withLook } from "@/templates/preview-kit";
import { Button, LinkButton } from "@/components/ui/button";
import { Dialog, Sheet } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { StatusChip, REQUEST_CHIP } from "@/components/ui/status-chip";
import { useToast } from "@/components/ui/toast";
import { EmailPreview, PaymentEmailBody } from "@/components/email/email-preview";
import { TemplateThumbnail } from "@/components/templates/template-thumbnail";
import { PageHeader } from "./studio-shell";

type Filter = "pending" | "awaiting_payment" | "paid" | "approved" | "declined" | "all";
const FILTERS: { id: Filter; label: string }[] = [
  { id: "pending", label: "Pending" },
  { id: "awaiting_payment", label: "Awaiting payment" },
  { id: "paid", label: "Paid" },
  { id: "approved", label: "Approved" },
  { id: "declined", label: "Declined" },
  { id: "all", label: "All" },
];
const OPEN: TemplateRequestStatus[] = ["pending", "awaiting_payment"];

type Row = { r: TemplateRequest; client: Client | undefined; bundle: CardBundle | null };

/** Admin queue of paid-template requests: filter, review side by side, act, undo. */
export function TemplateRequests() {
  const { db, hydrated } = useDB();
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>("pending");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [openId, setOpenId] = useState<string | null>(params.get("request"));
  const [announce, setAnnounce] = useState("");
  const [bulk, setBulk] = useState<"send" | "paid" | null>(null);
  const [tplFilter, setTplFilter] = useState("all");
  /** The last action, so the drawer can offer Undo inside the sheet (toasts sit outside its focus trap). */
  const [last, setLast] = useState<{ label: string; undo: () => void; requestIds: string[] } | null>(null);

  const rows = useMemo<Row[]>(
    () =>
      db.templateRequests
        .map((r) => ({ r, client: db.clients.find((c) => c.id === r.clientId), bundle: bundleFromDB(db, r.cardId) }))
        .sort((a, b) => Date.parse(b.r.requestedAt) - Date.parse(a.r.requestedAt)),
    [db],
  );
  // Which templates sell: every template that has requests, with its count.
  const byTemplate = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach(({ r }) => m.set(r.templateId, (m.get(r.templateId) ?? 0) + 1));
    return TEMPLATES.filter((t) => m.has(t.id))
      .map((t) => ({ id: t.id, name: t.name, n: m.get(t.id)! }))
      .sort((a, b) => b.n - a.n || a.name.localeCompare(b.name));
  }, [rows]);
  const inTemplate = rows.filter(({ r }) => tplFilter === "all" || r.templateId === tplFilter);
  const counts = useMemo(() => {
    const c: Record<Filter, number> = { pending: 0, awaiting_payment: 0, paid: 0, approved: 0, declined: 0, all: inTemplate.length };
    inTemplate.forEach(({ r }) => {
      if (r.status in c) c[r.status as Filter]++;
    });
    return c;
  }, [inTemplate]);

  const q = query.trim().toLowerCase();
  const shown = inTemplate.filter(({ r, client }) => (filter === "all" || r.status === filter) && (!q || [client?.name, client?.email, client?.company].some((v) => v?.toLowerCase().includes(q))));
  const selectable = shown.filter(({ r }) => OPEN.includes(r.status)).map(({ r }) => r.id);
  // Selection only counts requests that are still open and visible.
  const picked = selected.filter((id) => selectable.includes(id));
  const pickedRows = rows.filter(({ r }) => picked.includes(r.id));
  const pickedPending = pickedRows.filter(({ r }) => r.status === "pending");

  const open = useCallback(
    (id: string | null) => {
      setOpenId(id);
      const sp = new URLSearchParams(window.location.search);
      if (id) sp.set("request", id);
      else sp.delete("request");
      const qs = sp.toString();
      router.replace(`/admin/template-requests${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [router],
  );

  /** Run an admin action, then toast with Undo and announce the result. */
  const done = useCallback(
    (res: AdminResult, success: string, description?: string, requestIds: string[] = []) => {
      if (!res.ok) {
        toast.error("That didn’t go through", { description: res.error });
        setAnnounce(`Failed: ${res.error}`);
        return false;
      }
      let undone = false;
      const undo = () => {
        if (undone) return;
        undone = true;
        res.data.undo();
        setLast(null);
        setAnnounce(`Undone: ${success}`);
      };
      toast.success(success, { description, action: { label: "Undo", onClick: undo } });
      setLast({ label: success, undo, requestIds });
      setAnnounce(success);
      return true;
    },
    [toast],
  );

  const current = rows.find(({ r }) => r.id === openId) ?? null;

  return (
    <div className="mx-auto flex max-w-[1240px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
      <PageHeader
        title="Template requests"
        description="Clients who asked for a paid template. Nothing is charged in the app: send payment details, then mark it paid to unlock the template for their card."
        actions={
          <LinkButton href="/admin/settings/templates" variant="secondary">
            Templates & pricing
          </LinkButton>
        }
      />
      <p aria-live="polite" className="sr-only">
        {announce}
      </p>

      {!hydrated ? (
        <div aria-busy="true" aria-label="Loading requests" className="flex flex-col gap-2">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="skeleton h-[104px] rounded-xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-studio-line-strong bg-studio-surface px-6 py-10">
          <Inbox aria-hidden className="size-6 text-studio-ink-3" />
          <p className="text-base font-semibold">No template requests yet</p>
          <p className="max-w-[56ch] text-sm text-studio-ink-3">When a client previews a paid template in their portal and asks for it, the request lands here with their note and a preview of their own card in that template.</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              <label className="relative min-w-[220px] flex-1 sm:max-w-sm">
                <span className="sr-only">Search by client</span>
                <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-studio-ink-3" />
                <Input type="search" placeholder="Search by client name, email or company" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
              </label>
              <label className="w-full sm:w-60">
                <span className="sr-only">Filter by template</span>
                <Select value={tplFilter} onChange={(e) => setTplFilter(e.target.value)}>
                  <option value="all">All templates ({rows.length})</option>
                  {byTemplate.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.n} request{t.n === 1 ? "" : "s"})
                    </option>
                  ))}
                </Select>
              </label>
            </div>
            <div role="group" aria-label="Filter by status" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]">
              {FILTERS.map((f) => {
                const active = f.id === filter;
                return (
                  <button
                    key={f.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setFilter(f.id)}
                    className={cn(
                      "inline-flex h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors",
                      active ? "border-studio-ink bg-studio-ink text-studio-surface" : "border-studio-line-strong bg-studio-surface text-studio-ink-2 hover:border-studio-ink-3 hover:text-studio-ink",
                    )}
                  >
                    {f.label}
                    <span className={cn("tabular-nums", active ? "opacity-75" : "text-studio-ink-3")}>{counts[f.id]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {picked.length > 0 && (
            <div role="region" aria-label="Bulk actions" className="sticky top-2 z-20 flex flex-wrap items-center gap-2 rounded-xl border border-studio-line-strong bg-studio-surface px-3 py-2 shadow-[0_8px_24px_-12px_rgb(0_0_0/0.3)]">
              <p className="mr-auto pl-1 text-sm font-semibold">{picked.length} selected</p>
              <Button size="md" onClick={() => setBulk("send")} disabled={pickedPending.length === 0} icon={<Send aria-hidden className="size-4" />}>
                Send payment details{pickedPending.length && pickedPending.length !== picked.length ? ` (${pickedPending.length})` : ""}
              </Button>
              <Button size="md" variant="primary" onClick={() => setBulk("paid")} icon={<CircleCheck aria-hidden className="size-4" />}>
                Mark selected as paid
              </Button>
              <Button size="md" variant="ghost" onClick={() => setSelected([])}>
                Clear
              </Button>
            </div>
          )}

          {shown.length === 0 ? (
            <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-studio-line-strong bg-studio-surface px-6 py-10">
              <p className="text-base font-semibold">{q ? `No requests match “${query.trim()}”` : `No ${FILTERS.find((f) => f.id === filter)!.label.toLowerCase()} requests`}</p>
              <p className="text-sm text-studio-ink-3">{filter === "pending" && !q ? "You’re all caught up." : "Try another status or search."}</p>
              <Button
                size="sm"
                icon={<X aria-hidden className="size-4" />}
                onClick={() => {
                  setFilter("all");
                  setQuery("");
                  setTplFilter("all");
                }}
              >
                Clear filters
              </Button>
            </div>
          ) : (
            <div className="relative overflow-x-auto rounded-2xl border border-studio-line bg-studio-surface [scrollbar-width:thin]">
              <table className="w-full min-w-[1080px] border-collapse text-left text-sm">
                <caption className="sr-only">Template requests, {FILTERS.find((f) => f.id === filter)!.label}</caption>
                <thead>
                  <tr className="border-b border-studio-line text-2xs font-semibold text-studio-ink-3">
                    <th scope="col" className="w-12 py-2 pl-3">
                      {selectable.length > 0 && (
                        <label className="flex size-11 cursor-pointer items-center justify-center">
                          <span className="sr-only">Select all open requests shown</span>
                          <input
                            type="checkbox"
                            className="size-4 cursor-pointer accent-[var(--studio-action)]"
                            checked={picked.length > 0 && picked.length === selectable.length}
                            ref={(el) => {
                              if (el) el.indeterminate = picked.length > 0 && picked.length < selectable.length;
                            }}
                            onChange={(e) => setSelected(e.target.checked ? selectable : [])}
                          />
                        </label>
                      )}
                    </th>
                    <th scope="col" className="py-2 pr-3">Client</th>
                    <th scope="col" className="py-2 pr-3">Card</th>
                    <th scope="col" className="py-2 pr-3">Requested template</th>
                    <th scope="col" className="py-2 pr-3">Current template</th>
                    <th scope="col" className="py-2 pr-3 text-right">Price</th>
                    <th scope="col" className="py-2 pr-3">Client note</th>
                    <th scope="col" className="py-2 pr-3">Requested</th>
                    <th scope="col" className="py-2 pr-3">Status</th>
                    <th scope="col" className="py-2 pr-3">
                      <span className="sr-only">Open</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((row) => (
                    <RequestRow
                      key={row.r.id}
                      row={row}
                      checked={picked.includes(row.r.id)}
                      selectable={OPEN.includes(row.r.status)}
                      onCheck={(v) => setSelected((s) => (v ? [...s, row.r.id] : s.filter((x) => x !== row.r.id)))}
                      onOpen={() => open(row.r.id)}
                      active={row.r.id === openId}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <RequestDrawer row={current} onClose={() => open(null)} done={done} last={current && last?.requestIds.includes(current.r.id) ? last : null} />

      <BulkSendDialog
        open={bulk === "send"}
        onOpenChange={(v) => !v && setBulk(null)}
        rows={pickedPending}
        onDone={(undos, n) => {
          setBulk(null);
          setSelected([]);
          done({ ok: true, data: { undo: () => undos.forEach((u) => u()) } }, `Payment details sent to ${n} client${n === 1 ? "" : "s"}`, "Each request is now awaiting payment.", pickedPending.map(({ r }) => r.id));
        }}
      />
      <BulkPaidDialog
        open={bulk === "paid"}
        onOpenChange={(v) => !v && setBulk(null)}
        rows={pickedRows}
        onDone={(undos, n) => {
          setBulk(null);
          setSelected([]);
          done({ ok: true, data: { undo: () => undos.forEach((u) => u()) } }, `${n} template${n === 1 ? "" : "s"} marked paid and unlocked`, "Each client was notified.", pickedRows.map(({ r }) => r.id));
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------- Rows */

function Avatar({ name }: { name: string }) {
  return (
    <span aria-hidden className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-studio-raised text-2xs font-semibold text-studio-ink-2">
      {initials(name)}
    </span>
  );
}

/** Their own card, in the requested template and the theme they previewed it in. */
function requestedBundle(bundle: CardBundle, r: TemplateRequest): CardBundle {
  return withLook(bundle, lookFor(getTemplate(r.templateId), r.themeId));
}

const RequestRow = memo(function RequestRow({
  row,
  checked,
  selectable,
  onCheck,
  onOpen,
  active,
}: {
  row: Row;
  checked: boolean;
  selectable: boolean;
  onCheck: (v: boolean) => void;
  onOpen: () => void;
  active: boolean;
}) {
  const { r, client, bundle } = row;
  const thumb = useMemo(() => (bundle ? requestedBundle(bundle, r) : null), [bundle, r]);
  const name = requestTemplateName(r);
  const current = bundle ? getTemplate(bundle.card.templateId).name : "";
  const who = client?.name ?? "Removed client";
  return (
    <tr onClick={onOpen} className={cn("cursor-pointer border-b border-studio-line align-middle last:border-b-0 hover:bg-studio-raised/60", active && "bg-studio-action-soft/60")}>
      <td className="py-2 pl-3" onClick={(e) => e.stopPropagation()}>
        {selectable && (
          <label className="flex size-11 cursor-pointer items-center justify-center">
            <span className="sr-only">
              Select {who}’s request for {name}
            </span>
            <input type="checkbox" className="size-4 cursor-pointer accent-[var(--studio-action)]" checked={checked} onChange={(e) => onCheck(e.target.checked)} />
          </label>
        )}
      </td>
      <td className="py-2 pr-3">
        <span className="flex items-center gap-2.5">
          <Avatar name={who} />
          <span className="flex min-w-0 flex-col">
            <span className="max-w-[180px] truncate font-semibold">{who}</span>
            <span className="max-w-[180px] truncate text-2xs text-studio-ink-3">{client?.email}</span>
          </span>
        </span>
      </td>
      <td className="py-2 pr-3" onClick={(e) => e.stopPropagation()}>
        {bundle ? (
          <Link href={`/admin/cards/${bundle.card.id}`} className="inline-flex min-h-11 max-w-[170px] flex-col justify-center rounded-md underline-offset-2 hover:underline">
            <span className="truncate font-medium">{bundle.card.company || bundle.card.name}</span>
            <span className="truncate text-2xs text-studio-ink-3">Open in editor</span>
          </Link>
        ) : (
          <span className="text-studio-ink-3">Card removed</span>
        )}
      </td>
      <td className="py-2 pr-3">
        <span className="flex items-center gap-3">
          <span className="overflow-hidden rounded-md border border-studio-line">{thumb ? <TemplateThumbnail bundle={thumb} width={390} height={640} scale={0.14} /> : <span className="block h-[90px] w-[55px] bg-studio-raised" />}</span>
          <span className="flex flex-col">
            <span className="font-semibold">{name}</span>
            <span className="text-2xs text-studio-ink-3">{requestThemeName(r)} theme</span>
          </span>
        </span>
      </td>
      <td className="py-2 pr-3 text-studio-ink-2">{current || "—"}</td>
      <td className="py-2 pr-3 text-right font-semibold tabular-nums">{formatPeso(r.price)}</td>
      <td className="py-2 pr-3">{r.note ? <span className="line-clamp-2 max-w-[220px] text-studio-ink-2">“{r.note}”</span> : <span className="text-studio-ink-3">No note</span>}</td>
      <td className="py-2 pr-3 whitespace-nowrap text-studio-ink-2">
        <time dateTime={r.requestedAt} title={formatDate(r.requestedAt)}>
          {formatRelative(r.requestedAt)}
        </time>
      </td>
      <td className="py-2 pr-3">
        <StatusChip kind="request" status={r.status} />
      </td>
      <td className="py-2 pr-3" onClick={(e) => e.stopPropagation()}>
        <Button size="sm" variant="ghost" onClick={onOpen} aria-label={`Review ${who}’s request for ${name}`} className="h-11" icon={<ArrowRight aria-hidden className="size-4" />}>
          Review
        </Button>
      </td>
    </tr>
  );
});

/* ----------------------------------------------------------------- Drawer */

type Act = "send" | "paid" | "comp" | "decline" | null;

function RequestDrawer({
  row,
  onClose,
  done,
  last,
}: {
  row: Row | null;
  onClose: () => void;
  done: (res: AdminResult, success: string, description?: string, requestIds?: string[]) => boolean;
  last: { label: string; undo: () => void } | null;
}) {
  const [act, setAct] = useState<Act>(null);
  // Keep the last row while the sheet animates closed.
  const [lastRow, setLastRow] = useState<Row | null>(row);
  if (row && row !== lastRow) setLastRow(row);
  const shown = row ?? lastRow;
  if (!shown) return null;
  const { r, client, bundle } = shown;
  const name = requestTemplateName(r);
  const theme = requestThemeName(r);
  const isOpen = OPEN.includes(r.status);
  const who = client?.name ?? "this client";

  return (
    <>
      <Sheet
        open={!!row}
        onOpenChange={(v) => !v && onClose()}
        title={`${name} for ${client?.name ?? "a removed client"}`}
        description={`Previewed in ${theme} · ${formatPeso(r.price)}`}
        className="sm:w-[460px]"
        footer={
          isOpen && client ? (
            <div className="grid w-full grid-cols-2 gap-2">
              {r.status === "pending" ? (
                <Button variant="primary" className="col-span-2 h-11" icon={<Send aria-hidden className="size-4" />} onClick={() => setAct("send")}>
                  Send payment details
                </Button>
              ) : (
                <Button variant="primary" className="col-span-2 h-11" icon={<CircleCheck aria-hidden className="size-4" />} onClick={() => setAct("paid")}>
                  Mark as paid & unlock
                </Button>
              )}
              {r.status === "pending" ? (
                <Button className="col-span-2 h-11" icon={<CircleCheck aria-hidden className="size-4" />} onClick={() => setAct("paid")}>
                  Mark as paid & unlock
                </Button>
              ) : (
                <Button className="col-span-2 h-11" icon={<Send aria-hidden className="size-4" />} onClick={() => setAct("send")}>
                  Send payment details again
                </Button>
              )}
              <Button className="h-11" icon={<Gift aria-hidden className="size-4" />} onClick={() => setAct("comp")}>
                Approve free
              </Button>
              <Button variant="danger-ghost" className="h-11" icon={<XCircle aria-hidden className="size-4" />} onClick={() => setAct("decline")}>
                Decline
              </Button>
            </div>
          ) : undefined
        }
      >
        <div className="flex flex-col gap-5">
          {last && (
            <div role="status" className="flex items-center gap-3 rounded-lg border border-studio-success/30 bg-studio-success-soft py-1.5 pr-1.5 pl-3 text-sm text-studio-success">
              <CircleCheck aria-hidden className="size-4 shrink-0" />
              <span className="min-w-0 flex-1 font-medium">{last.label}</span>
              <Button size="sm" variant="ghost" className="h-11 text-studio-ink" onClick={last.undo}>
                Undo
              </Button>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3">
            {client && (
              <span className="flex min-w-0 flex-1 items-center gap-2.5">
                <Avatar name={client.name} />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-semibold">{client.company || client.name}</span>
                  <span className="truncate text-2xs text-studio-ink-3">{client.email}</span>
                </span>
              </span>
            )}
            <StatusChip kind="request" status={r.status} />
          </div>

          {bundle && <SideBySide bundle={bundle} r={r} name={name} />}
          {isOpen && (
            <p className="rounded-lg bg-studio-raised px-3 py-2 text-2xs text-studio-ink-2">
              Unlocking never switches {client ? `${client.name.split(" ")[0] === "Dr." ? client.name : client.name.split(" ")[0]}’s` : "the"} card. They get a notice and tap <span className="font-semibold">Apply now</span> in their portal when they’re ready.
            </p>
          )}

          {r.note && (
            <figure className="flex flex-col gap-1.5">
              <figcaption className="text-2xs font-semibold text-studio-ink-3">Note from {client ? client.name.split(" ")[0] : "the client"}</figcaption>
              <blockquote className="rounded-lg border-l-2 border-studio-line-strong bg-studio-raised px-3 py-2 text-sm whitespace-pre-line text-studio-ink-2">“{r.note}”</blockquote>
            </figure>
          )}

          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <Detail term="Template">{name}</Detail>
            <Detail term="Previewed in">{theme} theme</Detail>
            <Detail term="Price">{formatPeso(r.price)}</Detail>
            {r.paidAmount != null && <Detail term="Paid">{formatPeso(r.paidAmount)}</Detail>}
            {r.paymentRef && <Detail term="Reference">{r.paymentRef}</Detail>}
            {r.compReason && <Detail term="Approved free">{r.compReason}</Detail>}
            {r.adminNote && <Detail term={r.status === "declined" ? "Note to client" : "Your note"}>{r.adminNote}</Detail>}
            {bundle && (
              <Detail term="Card">
                <Link href={`/admin/cards/${bundle.card.id}?tab=design`} className="font-medium text-studio-action-ink underline-offset-2 hover:underline">
                  {bundle.card.name}, open Design
                </Link>
              </Detail>
            )}
          </dl>

          <section aria-labelledby="hist-h" className="flex flex-col gap-2">
            <h3 id="hist-h" className="text-sm font-semibold">
              History
            </h3>
            <ol className="flex flex-col gap-0">
              {history(r).map((h, i, all) => (
                <li key={h.label} className="relative flex gap-3 pb-3 last:pb-0">
                  {i < all.length - 1 && <span aria-hidden className="absolute top-3 left-[5px] h-full w-px bg-studio-line" />}
                  <span aria-hidden className={cn("relative mt-1.5 size-[11px] shrink-0 rounded-full border-2", i === all.length - 1 ? "border-studio-action bg-studio-action" : "border-studio-line-strong bg-studio-surface")} />
                  <span className="flex flex-col">
                    <span className="text-sm">{h.label}</span>
                    <time dateTime={h.at} className="text-2xs text-studio-ink-3">
                      {formatRelative(h.at)}
                    </time>
                  </span>
                </li>
              ))}
            </ol>
          </section>
          {!isOpen && <p className="text-2xs text-studio-ink-3">This request is closed. There’s nothing left to do.</p>}
        </div>
      </Sheet>

      {client && (
        <>
          <PaymentDialog key={`send-${r.id}-${act === "send"}`} open={act === "send"} onOpenChange={(v) => !v && setAct(null)} r={r} client={client} onDone={(res) => done(res, `Payment details sent to ${who}`, `${name} is now awaiting payment.`, [r.id]) && setAct(null)} />
          <PaidDialog key={`paid-${r.id}-${act === "paid"}`} open={act === "paid"} onOpenChange={(v) => !v && setAct(null)} r={r} name={name} who={who} onDone={(res) => done(res, `${name} unlocked for ${who}`, "Marked as paid. They were notified.", [r.id]) && setAct(null)} />
          <ReasonDialog
            key={`comp-${r.id}-${act === "comp"}`}
            open={act === "comp"}
            onOpenChange={(v) => !v && setAct(null)}
            title={`Approve ${name} without payment?`}
            description={`${who} gets ${name} free, and it unlocks right away. The reason is kept for your records; it isn’t shown to the client.`}
            label="Reason"
            placeholder="e.g. Launch promo, VIP client, or a fix for our mistake"
            confirm="Approve free"
            icon={<BadgeCheck aria-hidden className="size-4" />}
            onConfirm={async (reason) => done(await compRequest(r.id, reason), `${name} approved free for ${who}`, "They were notified.", [r.id]) && setAct(null)}
          />
          <ReasonDialog
            key={`decline-${r.id}-${act === "decline"}`}
            open={act === "decline"}
            onOpenChange={(v) => !v && setAct(null)}
            title={`Decline ${name}?`}
            description={`Your note is shown to ${who} in their portal and emailed to them, so explain why and what they could pick instead.`}
            label={`Note to ${who.split(" ")[0] === "Dr." ? who : who.split(" ")[0]}`}
            placeholder="e.g. Folio doesn’t have room for your three branches. Landmark does, and it’s free."
            confirm="Decline request"
            danger
            onConfirm={async (note) => done(await declineRequest(r.id, note), `Declined ${name} for ${who}`, "They’ll see your note.", [r.id]) && setAct(null)}
          />
        </>
      )}
    </>
  );
}

function Detail({ term, children }: { term: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-studio-ink-3">{term}</dt>
      <dd className="min-w-0 [overflow-wrap:anywhere]">{children}</dd>
    </>
  );
}

function history(r: TemplateRequest): { label: string; at: string }[] {
  const out = [{ label: r.byAdmin ? "Unlocked by you while creating the card" : "Requested by the client", at: r.requestedAt }];
  if (r.paymentRequestedAt) out.push({ label: "Payment details sent", at: r.paymentRequestedAt });
  if (r.resolvedAt) {
    const label = { paid: "Marked paid, template unlocked", approved: "Approved free, template unlocked", declined: "Declined", cancelled: "Cancelled by the client", pending: "", awaiting_payment: "" }[r.status] || REQUEST_CHIP[r.status].label;
    out.push({ label, at: r.resolvedAt });
  }
  return out.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}

function SideBySide({ bundle, r, name }: { bundle: CardBundle; r: TemplateRequest; name: string }) {
  const after = useMemo(() => requestedBundle(bundle, r), [bundle, r]);
  const currentName = getTemplate(bundle.card.templateId).name;
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-3 rounded-xl bg-studio-sunken p-3">
        <figure className="flex flex-col items-center gap-2">
          <div className="overflow-hidden rounded-[14px] border-2 border-studio-line">
            <TemplateThumbnail bundle={bundle} width={390} height={640} scale={0.38} eager />
          </div>
          <figcaption className="text-center text-2xs text-studio-ink-3">Now: {currentName}</figcaption>
        </figure>
        <figure className="flex flex-col items-center gap-2">
          <div className="overflow-hidden rounded-[14px] border-2 border-studio-action">
            <TemplateThumbnail bundle={after} width={390} height={640} scale={0.38} eager />
          </div>
          <figcaption className="text-center text-2xs font-semibold text-studio-ink">{name}</figcaption>
        </figure>
      </div>
      <p className="text-2xs text-studio-ink-3">Their own content in both, so you see exactly what they’d get.</p>
    </div>
  );
}

/* ---------------------------------------------------------------- Dialogs */

function PaymentDialog({ open, onOpenChange, r, client, onDone }: { open: boolean; onOpenChange: (v: boolean) => void; r: TemplateRequest; client: Client; onDone: (res: AdminResult) => void }) {
  const initial = useMemo(() => paymentEmail(r, client), [r, client]);
  const [subject, setSubject] = useState(initial.subject);
  const [body, setBody] = useState(initial.body);
  const [busy, setBusy] = useState(false);
  const [tried, setTried] = useState(false);
  const missing = !subject.trim() || !body.trim();
  const name = requestTemplateName(r);
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title="Send payment details"
      description={`Emails ${client.email} the amount and how to pay. The request moves to Awaiting payment.`}
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant="primary"
            loading={busy}
            icon={<Send aria-hidden className="size-4" />}
            onClick={async () => {
              setTried(true);
              if (missing) return;
              setBusy(true);
              const res = await sendPaymentDetailsFor(r.id, subject.trim(), body.trim());
              setBusy(false);
              onDone(res);
            }}
          >
            {busy ? "Sending" : "Send email"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Subject" error={tried && !subject.trim() ? "Add a subject." : null}>
          {(p) => <Input id={p.id} aria-describedby={p.describedBy} invalid={p.invalid} value={subject} onChange={(e) => setSubject(e.target.value)} />}
        </Field>
        <Field label="Message" error={tried && !body.trim() ? "Add the payment instructions." : null} hint="The amount is shown above your message automatically.">
          {(p) => <Textarea id={p.id} aria-describedby={p.describedBy} invalid={p.invalid} rows={8} value={body} onChange={(e) => setBody(e.target.value)} />}
        </Field>
        <EmailPreview to={{ name: client.name, email: client.email }} subject={subject}>
          <PaymentEmailBody templateName={name} amount={r.price} body={body} />
        </EmailPreview>
      </div>
    </Dialog>
  );
}

function PaidDialog({ open, onOpenChange, r, name, who, onDone }: { open: boolean; onOpenChange: (v: boolean) => void; r: TemplateRequest; name: string; who: string; onDone: (res: AdminResult) => void }) {
  const [amount, setAmount] = useState(String(r.price));
  const [ref, setRef] = useState("");
  const [busy, setBusy] = useState(false);
  const n = Number(amount);
  const amountOk = /^\d+$/.test(amount.trim()) && n >= 1;
  const [tried, setTried] = useState(false);
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      title={`Mark ${name} as paid?`}
      description={`This unlocks ${name} for ${who}’s card and tells them it’s ready. Their card doesn’t change until they apply it.`}
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant="primary"
            loading={busy}
            onClick={async () => {
              setTried(true);
              if (!amountOk) return;
              setBusy(true);
              const res = await markRequestPaid(r.id, n, ref);
              setBusy(false);
              onDone(res);
            }}
          >
            {busy ? "Unlocking" : "Mark paid & unlock"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Amount received (₱)" error={tried && !amountOk ? "Enter the amount in whole pesos, 1 or more." : null} hint={n !== r.price && amountOk ? `The price was ${formatPeso(r.price)}.` : undefined}>
          {(p) => <Input id={p.id} aria-describedby={p.describedBy} invalid={p.invalid} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))} className="tabular-nums" />}
        </Field>
        <Field label="Reference number" optional hint="From the GCash, Maya or bank receipt.">
          {(p) => <Input id={p.id} aria-describedby={p.describedBy} value={ref} onChange={(e) => setRef(e.target.value)} placeholder="e.g. GCash 7781 2203 9915" />}
        </Field>
      </div>
    </Dialog>
  );
}

function ReasonDialog({
  open,
  onOpenChange,
  title,
  description,
  label,
  placeholder,
  confirm,
  danger,
  icon,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description: string;
  label: string;
  placeholder: string;
  confirm: string;
  danger?: boolean;
  icon?: ReactNode;
  onConfirm: (text: string) => Promise<unknown>;
}) {
  const [text, setText] = useState("");
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const id = useId();
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      title={title}
      description={description}
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant={danger ? "danger" : "primary"}
            loading={busy}
            icon={icon}
            onClick={async () => {
              setTried(true);
              if (!text.trim()) return;
              setBusy(true);
              await onConfirm(text);
              setBusy(false);
            }}
          >
            {confirm}
          </Button>
        </>
      }
    >
      <Field id={id} label={label} error={tried && !text.trim() ? "This is required." : null}>
        {(p) => <Textarea id={p.id} aria-describedby={p.describedBy} invalid={p.invalid} rows={4} maxLength={500} autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} />}
      </Field>
    </Dialog>
  );
}

function BulkSendDialog({ open, onOpenChange, rows, onDone }: { open: boolean; onOpenChange: (v: boolean) => void; rows: Row[]; onDone: (undos: (() => void)[], n: number) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="md"
      title={`Send payment details to ${rows.length} client${rows.length === 1 ? "" : "s"}?`}
      description="Each client gets the standard payment email with their own template and amount. Open a request to edit the email first."
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant="primary"
            loading={busy}
            icon={<Send aria-hidden className="size-4" />}
            onClick={async () => {
              setBusy(true);
              setError(null);
              const undos: (() => void)[] = [];
              for (const { r, client } of rows) {
                if (!client) continue;
                const email = paymentEmail(r, client);
                const res = await sendPaymentDetailsFor(r.id, email.subject, email.body);
                if (res.ok) undos.push(res.data.undo);
                else setError(res.error);
              }
              setBusy(false);
              // Undo in reverse so each restore sees the state it saved.
              onDone(undos.reverse(), undos.length);
            }}
          >
            {busy ? "Sending" : `Send ${rows.length} email${rows.length === 1 ? "" : "s"}`}
          </Button>
        </>
      }
    >
      <BulkList rows={rows} />
      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-studio-danger-soft px-3 py-2 text-sm text-studio-danger-ink">
          {error}
        </p>
      )}
    </Dialog>
  );
}

function BulkPaidDialog({ open, onOpenChange, rows, onDone }: { open: boolean; onOpenChange: (v: boolean) => void; rows: Row[]; onDone: (undos: (() => void)[], n: number) => void }) {
  const [ref, setRef] = useState("");
  const [busy, setBusy] = useState(false);
  const total = rows.reduce((s, { r }) => s + r.price, 0);
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="md"
      title={`Mark ${rows.length} request${rows.length === 1 ? "" : "s"} as paid?`}
      description={`Each one is recorded at its own price (${formatPeso(total)} in total), unlocked, and the client is told it’s ready.`}
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant="primary"
            loading={busy}
            onClick={async () => {
              setBusy(true);
              const undos: (() => void)[] = [];
              for (const { r } of rows) {
                const res = await markRequestPaid(r.id, r.price, ref);
                if (res.ok) undos.push(res.data.undo);
              }
              setBusy(false);
              setRef("");
              onDone(undos.reverse(), undos.length);
            }}
          >
            {busy ? "Unlocking" : "Mark paid & unlock"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <BulkList rows={rows} />
        <Field label="Reference note" optional hint="Saved on every request, e.g. a batch deposit slip number.">
          {(p) => <Input id={p.id} aria-describedby={p.describedBy} value={ref} onChange={(e) => setRef(e.target.value)} placeholder="e.g. BPI deposit 11/02" />}
        </Field>
      </div>
    </Dialog>
  );
}

function BulkList({ rows }: { rows: Row[] }) {
  return (
    <ul className="flex flex-col divide-y divide-studio-line rounded-xl border border-studio-line">
      {rows.map(({ r, client }) => (
        <li key={r.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
          <span className="min-w-0">
            <span className="block truncate font-semibold">{client?.name}</span>
            <span className="block truncate text-2xs text-studio-ink-3">
              {requestTemplateName(r)} · {requestThemeName(r)} theme
            </span>
          </span>
          <span className="shrink-0 font-semibold tabular-nums">{formatPeso(r.price)}</span>
        </li>
      ))}
    </ul>
  );
}
