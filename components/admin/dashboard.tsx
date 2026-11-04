"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CopyPlus,
  Ellipsis,
  ExternalLink,
  Eye,
  LayoutGrid,
  Link2,
  List,
  Pencil,
  Plus,
  QrCode,
  Search,
  Send,
  X,
  CircleOff,
} from "lucide-react";
import { useMemo, useState } from "react";
import { getTemplate, TEMPLATES } from "@/templates/registry";
import { bundleFromDB } from "@/lib/mock";
import { hasUnpublishedChanges } from "@/lib/services/cards";
import { useDB } from "@/lib/services/data";
import type { Card, TemplateId } from "@/lib/types";
import { cn, formatRelative, publicCardPath } from "@/lib/utils";
import { Button, IconButton, LinkButton } from "@/components/ui/button";
import { Segmented, Skeleton, StatusBadge } from "@/components/ui/controls";
import { MiniPreview } from "@/components/ui/device-preview";
import { Input, Select } from "@/components/ui/field";
import { Menu, type MenuItem } from "@/components/ui/menu";
import { CardRenderer } from "@/components/card/card-renderer";
import { PageHeader } from "./studio-shell";
import { AttentionWidget } from "./attention-widget";
import { QrDialog, UnpublishDialog, useCardOps } from "./card-ops";

type StatusFilter = "all" | "published" | "draft";

export function Dashboard() {
  const { db, hydrated } = useDB();
  const router = useRouter();
  const ops = useCardOps();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [template, setTemplate] = useState<TemplateId | "all">("all");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [qrCard, setQrCard] = useState<Card | null>(null);
  const [unpubCard, setUnpubCard] = useState<Card | null>(null);

  const cards = useMemo(() => {
    const q = query.trim().toLowerCase();
    return db.cards
      .filter((c) => status === "all" || c.status === status)
      .filter((c) => template === "all" || c.templateId === template)
      .filter((c) => !q || [c.name, c.title, c.company, c.slug].some((v) => v?.toLowerCase().includes(q)))
      .sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at));
  }, [db.cards, query, status, template]);

  const counts = {
    all: db.cards.length,
    published: db.cards.filter((c) => c.status === "published").length,
    draft: db.cards.filter((c) => c.status === "draft").length,
  };

  const menuFor = (c: Card): MenuItem[] => [
    { label: "Preview", icon: <Eye />, onSelect: () => router.push(`/admin/cards/${c.id}/preview`) },
    c.status === "published"
      ? { label: "Open public page", icon: <ExternalLink />, onSelect: () => window.open(publicCardPath(c.slug), "_blank") }
      : { label: "Publish", icon: <Send />, onSelect: () => ops.publish(c) },
    { label: "Copy link", icon: <Link2 />, onSelect: () => ops.copyLink(c) },
    { label: "Show QR code", icon: <QrCode />, onSelect: () => setQrCard(c) },
    { label: "Duplicate", icon: <CopyPlus />, onSelect: () => ops.duplicate(c) },
    ...(c.status === "published"
      ? ([{ type: "separator" }, { label: "Unpublish", icon: <CircleOff />, danger: true, onSelect: () => setUnpubCard(c) }] as MenuItem[])
      : []),
  ];

  return (
    <div className="mx-auto flex max-w-[1240px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
      <PageHeader
        title="Cards"
        description={hydrated ? `${counts.all} cards, ${counts.published} published` : "Loading cards"}
        actions={
          <LinkButton href="/admin/cards/new" variant="primary" icon={<Plus aria-hidden className="size-4" />}>
            New card
          </LinkButton>
        }
      />

      {hydrated && <AttentionWidget />}

      {(!hydrated || db.cards.length > 0) && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1 sm:max-w-sm">
            <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-studio-ink-3" />
            <Input
              type="search"
              aria-label="Search cards"
              placeholder="Search by name, company or link"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Segmented<StatusFilter>
            label="Status"
            value={status}
            onChange={setStatus}
            options={[
              { value: "all", label: `All ${counts.all}` },
              { value: "published", label: `Published ${counts.published}` },
              { value: "draft", label: `Drafts ${counts.draft}` },
            ]}
          />
          <div className="w-44">
            <Select aria-label="Template" value={template} onChange={(e) => setTemplate(e.target.value as TemplateId | "all")}>
              <option value="all">All templates</option>
              {TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </div>
          <Segmented
            className="ml-auto"
            label="View"
            value={view}
            onChange={setView}
            options={[
              { value: "grid", label: <span className="sr-only">Grid</span>, icon: <LayoutGrid aria-hidden />, ariaLabel: "Grid view" },
              { value: "list", label: <span className="sr-only">List</span>, icon: <List aria-hidden />, ariaLabel: "List view" },
            ]}
          />
        </div>
      )}

      {!hydrated ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex flex-col gap-3 rounded-2xl border border-studio-line bg-studio-surface p-3">
              <Skeleton className="h-[220px] rounded-xl" />
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      ) : db.cards.length === 0 ? (
        <EmptyFirstCard />
      ) : cards.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-studio-line-strong px-6 py-10">
          <p className="text-base font-semibold">No cards match {query ? `“${query}”` : "these filters"}</p>
          <p className="text-sm text-studio-ink-3">Check the spelling, or clear the filters to see every card.</p>
          <Button
            icon={<X aria-hidden className="size-4" />}
            onClick={() => {
              setQuery("");
              setStatus("all");
              setTemplate("all");
            }}
          >
            Clear filters
          </Button>
        </div>
      ) : view === "grid" ? (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4" aria-label="Cards">
          {cards.map((c) => {
            const bundle = bundleFromDB(db, c.id)!;
            return (
              <li key={c.id} className="group relative flex flex-col overflow-hidden rounded-2xl border border-studio-line bg-studio-surface transition-colors hover:border-studio-line-strong">
                <div className="relative overflow-hidden border-b border-studio-line bg-studio-sunken">
                  <MiniPreview width={390} height={560} scale={0.6} className="mx-auto">
                    <CardRenderer bundle={bundle} mode="thumbnail" viewportHeight="560px" />
                  </MiniPreview>
                </div>
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <Link href={`/admin/cards/${c.id}`} className="truncate text-base font-semibold hover:underline hover:underline-offset-2 after:absolute after:inset-0 after:content-['']">
                        {c.name}
                      </Link>
                      <span className="truncate text-2xs text-studio-ink-3">/c/{c.slug}</span>
                    </div>
                    <div className="relative z-10 -mt-1 -mr-1">
                      <Menu trigger={<IconButton label={`More actions for ${c.name}`} icon={<Ellipsis aria-hidden />} size="sm" tooltip={false} />} items={menuFor(c)} />
                    </div>
                  </div>
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1">
                    <StatusBadge status={c.status} dirty={hasUnpublishedChanges(c)} />
                    <span className="text-2xs text-studio-ink-3">Edited {formatRelative(c.updated_at)}</span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-studio-line bg-studio-surface">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-studio-line text-2xs text-studio-ink-3">
              <tr>
                <th scope="col" className="py-3 pl-4 font-semibold">Card</th>
                <th scope="col" className="py-3 font-semibold">Status</th>
                <th scope="col" className="py-3 font-semibold">Template</th>
                <th scope="col" className="py-3 font-semibold">Last edited</th>
                <th scope="col" className="py-3 pr-4 text-right font-semibold"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {cards.map((c) => (
                <tr key={c.id} className="border-b border-studio-line last:border-b-0 hover:bg-studio-raised/50">
                  <td className="py-3 pl-4">
                    <div className="flex flex-col gap-0.5">
                      <Link href={`/admin/cards/${c.id}`} className="font-semibold hover:underline hover:underline-offset-2">
                        {c.name}
                      </Link>
                      <span className="text-2xs text-studio-ink-3">{[c.title, c.company].filter(Boolean).join(", ") || `/c/${c.slug}`}</span>
                    </div>
                  </td>
                  <td className="py-3"><StatusBadge status={c.status} dirty={hasUnpublishedChanges(c)} /></td>
                  <td className="py-3 text-studio-ink-2">{getTemplate(c.templateId).name}</td>
                  <td className="py-3 text-studio-ink-2 tabular-nums">{formatRelative(c.updated_at)}</td>
                  <td className="py-3 pr-4">
                    <div className="flex justify-end gap-1">
                      <LinkButton href={`/admin/cards/${c.id}`} size="sm" icon={<Pencil aria-hidden className="size-3.5" />}>
                        Edit
                      </LinkButton>
                      <Menu trigger={<IconButton label={`More actions for ${c.name}`} icon={<Ellipsis aria-hidden />} size="sm" tooltip={false} />} items={menuFor(c)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <QrDialog card={qrCard} open={!!qrCard} onOpenChange={(v) => !v && setQrCard(null)} />
      <UnpublishDialog
        card={unpubCard}
        open={!!unpubCard}
        onOpenChange={(v) => !v && setUnpubCard(null)}
        onConfirm={() => {
          if (unpubCard) ops.unpublish(unpubCard);
          setUnpubCard(null);
        }}
      />
    </div>
  );
}

function EmptyFirstCard() {
  return (
    <div className={cn("flex flex-col items-start gap-6 rounded-2xl border border-studio-line bg-studio-surface p-8 sm:flex-row sm:items-center sm:p-10")}>
      <div aria-hidden className="relative aspect-[1.586] w-56 shrink-0 rotate-[-4deg] rounded-[12px] border-[1.5px] border-dashed border-studio-line-strong" />
      <div className="flex flex-col items-start gap-3">
        <h2 className="text-xl font-semibold tracking-[-0.01em]">Create the first card</h2>
        <p className="max-w-md text-sm text-studio-ink-2">
          Pick a starting design, add a name and a phone number, and you’ll have a card ready to publish in a few minutes. Everything can be changed later.
        </p>
        <LinkButton href="/admin/cards/new" variant="primary" icon={<Plus aria-hidden className="size-4" />}>
          New card
        </LinkButton>
      </div>
    </div>
  );
}
