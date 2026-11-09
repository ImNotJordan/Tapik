"use client";

import { BRAND } from "@/lib/brand";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Ellipsis,
  Hourglass,
  Send,
  ListPlus,
  AtSign,
  ChevronLeft,
  CircleAlert,
  Eye,
  Images,
  Image as ImageIcon,
  LoaderCircle,
  MapPin,
  Monitor,
  Network,
  Palette,
  Rows3,
  Share2,
  Smartphone,
  Tablet,
  Type,
  Check,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { WORKSPACE } from "@/lib/mock/workspace";
import { approveCardReview, hasUnpublishedChanges, portalCardState, requestCardChanges, submitCardForReview } from "@/lib/services/cards";
import type { CardBundle, Client, Role } from "@/lib/types";
import { getTemplate } from "@/templates/registry";
import { cn, formatRelative, publicCardPath } from "@/lib/utils";
import { Button, LinkButton } from "@/components/ui/button";
import { Segmented, StatusBadge } from "@/components/ui/controls";
import {
  DEVICES,
  DevicePreview,
  type Device,
} from "@/components/ui/device-preview";
import { Dialog, Sheet } from "@/components/ui/dialog";
import { Field, Textarea } from "@/components/ui/field";
import { StatusChip } from "@/components/ui/status-chip";
import { useToast } from "@/components/ui/toast";
import { Tooltip } from "@/components/ui/tooltip";
import { NotificationBell } from "@/components/portal/notification-bell";
import { ReviewBanner } from "@/components/portal/review-banner";
import { PreviewRibbon as RibbonView } from "@/components/templates/preview-ribbon";
import { CardRenderer } from "@/components/card/card-renderer";
import { useCardOps } from "../card-ops";
import {
  CLIENT_TABS,
  EDITOR_TABS,
  EditorProvider,
  useEditor,
  type EditorTab,
} from "./editor-context";
import { ContentPanel } from "./panels/content-panel";
import { DesignPanel } from "./panels/design-panel";
import { DetailsPanel } from "./panels/details-panel";
import { MapPanel } from "./panels/map-panel";
import { MediaPanel } from "./panels/media-panel";
import { OrgPanel } from "./panels/org-panel";
import { PhotosPanel } from "./panels/photos-panel";
import { SectionsPanel } from "./panels/sections-panel";
import { SharePanel } from "./panels/share-panel";
import { SocialsPanel } from "./panels/socials-panel";

const RAIL: {
  id: EditorTab;
  label: string;
  icon: typeof Type;
  group: "content" | "look";
}[] = [
  { id: "content", label: "Content", icon: Type, group: "content" },
  { id: "media", label: "Media", icon: ImageIcon, group: "content" },
  { id: "socials", label: "Socials", icon: AtSign, group: "content" },
  { id: "photos", label: "Photos", icon: Images, group: "content" },
  { id: "org", label: "Org chart", icon: Network, group: "content" },
  { id: "map", label: "Map", icon: MapPin, group: "content" },
  { id: "details", label: "Details", icon: ListPlus, group: "content" },
  { id: "sections", label: "Sections", icon: Rows3, group: "content" },
  { id: "design", label: "Design", icon: Palette, group: "look" },
  { id: "share", label: "Share", icon: Share2, group: "look" },
];

/** Clients see plainer names: "Photos" for the photo, cover and logo; "Album" for the gallery. */
const CLIENT_LABELS: Partial<Record<EditorTab, string>> = {
  media: "Photos",
  photos: "Album",
  sections: "Section order",
};
/** Phone tab bar for clients: four tabs and More. */
const CLIENT_BAR: EditorTab[] = ["content", "media", "photos", "design"];

function railFor(role: Role) {
  if (role === "admin") return RAIL;
  return CLIENT_TABS.map((id) => {
    const r = RAIL.find((x) => x.id === id)!;
    return { ...r, label: CLIENT_LABELS[id] ?? r.label };
  });
}

const PANELS: Record<EditorTab, () => React.ReactNode> = {
  content: () => <ContentPanel />,
  media: () => <MediaPanel />,
  socials: () => <SocialsPanel />,
  photos: () => <PhotosPanel />,
  org: () => <OrgPanel />,
  map: () => <MapPanel />,
  details: () => <DetailsPanel />,
  sections: () => <SectionsPanel />,
  design: () => <DesignPanel />,
  share: () => <SharePanel />,
};

/**
 * One editor for both roles. The Client Portal renders it with role="client":
 * the same panels, with admin-only controls (link, NFC, QR, unpublish, custom
 * colors and fonts) hidden, and Publish or Submit for review per the card's permissions.
 */
export function Editor({
  bundle,
  role = "admin",
  client,
}: {
  bundle: CardBundle;
  role?: Role;
  client?: Client;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const allowed = role === "admin" ? EDITOR_TABS : CLIENT_TABS;
  const raw = params.get("tab") as EditorTab | null;
  const [tab, setTabState] = useState<EditorTab>(
    raw && allowed.includes(raw) ? raw : "content",
  );
  const base =
    role === "admin" ? `/admin/cards/${bundle.card.id}` : "/portal/edit";

  const setTab = useCallback(
    (t: EditorTab) => {
      setTabState(t);
      router.replace(`${base}?tab=${t}`, { scroll: false });
    },
    [router, base],
  );

  return (
    <EditorProvider
      bundle={bundle}
      tab={tab}
      setTab={setTab}
      role={role}
      client={client}
    >
      <EditorLayout />
    </EditorProvider>
  );
}

function EditorLayout() {
  const { card, tab, setTab, device, role, previewBundle } = useEditor();
  const [mobilePreview, setMobilePreview] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const rail = railFor(role);
  const client = role === "client";

  // The dev role switcher sits above the client's phone tab bar.
  useEffect(() => {
    if (!client) return;
    document.documentElement.style.setProperty("--dev-switcher-offset", "84px");
    return () => {
      document.documentElement.style.removeProperty("--dev-switcher-offset");
    };
  }, [client]);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-studio-bg">
      <TopBar />
      <ReviewRow />
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <nav
          aria-label="Editor sections"
          className={cn(
            "shrink-0 border-b border-studio-line bg-studio-surface lg:w-[84px] lg:border-r lg:border-b-0",
            client && "hidden lg:block",
          )}
        >
          <ul className="flex gap-1 overflow-x-auto px-2 py-1.5 lg:h-full lg:flex-col lg:overflow-y-auto lg:px-1.5 lg:py-2.5">
            {rail.map((item, i) => {
              const active = tab === item.id;
              const sep = i > 0 && rail[i - 1].group !== item.group;
              return (
                <li
                  key={item.id}
                  className={cn(
                    "shrink-0",
                    sep && "lg:mt-2 lg:border-t lg:border-studio-line lg:pt-2",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setTab(item.id)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex h-11 cursor-pointer items-center gap-2 rounded-lg px-3 text-2xs font-medium transition-colors lg:h-[58px] lg:w-full lg:flex-col lg:justify-center lg:gap-1 lg:px-1 lg:text-center",
                      active
                        ? "bg-studio-action-soft font-semibold text-studio-action-ink"
                        : "text-studio-ink-2 hover:bg-studio-raised hover:text-studio-ink",
                    )}
                  >
                    <item.icon
                      aria-hidden
                      className="size-[18px] lg:size-5"
                      strokeWidth={1.75}
                    />
                    {item.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <section
          aria-label={rail.find((r) => r.id === tab)?.label}
          className="studio-scroll min-h-0 flex-1 overflow-y-auto bg-studio-surface lg:max-w-[460px] lg:flex-none lg:basis-[440px] lg:border-r lg:border-studio-line xl:basis-[460px]"
        >
          <div
            key={tab}
            className={cn(
              "mx-auto max-w-2xl px-5 pt-6 sm:px-6 lg:pb-10",
              client ? "pb-40" : "pb-28",
            )}
          >
            {PANELS[tab]()}
          </div>
        </section>

        <section
          aria-label="Live preview"
          className="hidden min-h-0 min-w-0 flex-1 flex-col bg-studio-sunken lg:flex"
        >
          <div className="flex h-12 shrink-0 items-center justify-between gap-3 px-5">
            <span className="text-2xs text-studio-ink-3 tabular-nums">
              {DEVICES[device].label}, {DEVICES[device].w} × {DEVICES[device].h}
            </span>
            {!client && (
              <Link
                href={`/admin/cards/${card.id}/preview`}
                target="_blank"
                className="text-2xs font-semibold text-studio-action-ink underline-offset-2 hover:underline"
              >
                Open preview in a new tab
              </Link>
            )}
          </div>
          <div className="relative flex min-h-0 flex-1 flex-col px-6 pb-6">
            <PreviewRibbon />
            <DevicePreview
              device={device}
              urlLabel={`${BRAND.domain}${publicCardPath(card.slug)}`}
            >
              <CardRenderer
                bundle={previewBundle}
                mode="preview"
                viewportHeight={`${DEVICES[device].h}px`}
              />
            </DevicePreview>
          </div>
        </section>
      </div>

      <button
        type="button"
        onClick={() => setMobilePreview(true)}
        className={cn(
          "fixed right-4 z-30 inline-flex h-12 cursor-pointer items-center gap-2 rounded-full bg-studio-ink px-5 text-sm font-semibold text-studio-bg shadow-[0_8px_24px_rgb(0_0_0/0.25)] lg:hidden",
          client ? "bottom-[84px]" : "bottom-4",
        )}
      >
        <Eye aria-hidden className="size-4" />
        Preview
      </button>

      {client && (
        <nav
          aria-label="Editor sections"
          className="fixed inset-x-0 bottom-0 z-30 border-t border-studio-line bg-studio-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
        >
          <ul className="grid grid-cols-5">
            {CLIENT_BAR.map((id) => {
              const item = rail.find((r) => r.id === id)!;
              return (
                <li key={id}>
                  <TabBarButton
                    active={tab === id}
                    label={item.label}
                    icon={
                      <item.icon
                        aria-hidden
                        className="size-5"
                        strokeWidth={1.75}
                      />
                    }
                    onClick={() => setTab(id)}
                  />
                </li>
              );
            })}
            <li>
              <TabBarButton
                active={!CLIENT_BAR.includes(tab)}
                label={
                  !CLIENT_BAR.includes(tab)
                    ? (rail.find((r) => r.id === tab)?.label ?? "More")
                    : "More"
                }
                icon={
                  <Ellipsis aria-hidden className="size-5" strokeWidth={1.75} />
                }
                onClick={() => setMoreOpen(true)}
                haspopup
              />
            </li>
          </ul>
        </nav>
      )}

      {client && (
        <Sheet
          open={moreOpen}
          onOpenChange={setMoreOpen}
          side="bottom"
          title="More sections"
          className="lg:hidden"
        >
          <ul className="flex flex-col gap-1 pb-2">
            {rail
              .filter((r) => !CLIENT_BAR.includes(r.id))
              .map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setTab(r.id);
                      setMoreOpen(false);
                    }}
                    aria-current={tab === r.id ? "page" : undefined}
                    className={cn(
                      "flex h-12 w-full cursor-pointer items-center gap-3 rounded-xl px-3 text-left text-[15px] font-medium",
                      tab === r.id
                        ? "bg-studio-action-soft font-semibold text-studio-action-ink"
                        : "hover:bg-studio-raised",
                    )}
                  >
                    <r.icon aria-hidden className="size-5" strokeWidth={1.75} />
                    {r.label}
                  </button>
                </li>
              ))}
          </ul>
        </Sheet>
      )}

      {client ? (
        <Sheet
          open={mobilePreview}
          onOpenChange={setMobilePreview}
          side="bottom"
          title="Preview"
          description="Your card as people will see it."
          className="h-[94dvh] max-h-[94dvh] bg-studio-sunken lg:hidden"
        >
          <div className="flex h-full min-h-[480px] flex-col">
            <PreviewRibbon />
            <DevicePreview device="phone">
              <CardRenderer
                bundle={previewBundle}
                mode="preview"
                viewportHeight={`${DEVICES.phone.h}px`}
              />
            </DevicePreview>
          </div>
        </Sheet>
      ) : (
        mobilePreview && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Card preview"
            className="fixed inset-0 z-50 flex flex-col bg-studio-sunken lg:hidden"
          >
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-studio-line bg-studio-surface px-4">
              <span className="text-sm font-semibold">Preview</span>
              <Button
                icon={<X aria-hidden className="size-4" />}
                onClick={() => setMobilePreview(false)}
                autoFocus
              >
                Close
              </Button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col p-4">
              <PreviewRibbon />
              <DevicePreview device="phone">
                <CardRenderer
                  bundle={previewBundle}
                  mode="preview"
                  viewportHeight={`${DEVICES.phone.h}px`}
                />
              </DevicePreview>
            </div>
          </div>
        )
      )}
    </div>
  );
}

function TabBarButton({
  active,
  label,
  icon,
  onClick,
  haspopup,
}: {
  active: boolean;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  haspopup?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active && !haspopup ? "page" : undefined}
      aria-haspopup={haspopup ? "dialog" : undefined}
      className={cn(
        "flex h-16 w-full cursor-pointer flex-col items-center justify-center gap-1 text-[11px] font-medium",
        active ? "text-studio-action-ink" : "text-studio-ink-3",
      )}
    >
      <span
        className={cn(
          "inline-flex h-7 w-12 items-center justify-center rounded-full transition-colors",
          active && "bg-studio-action-soft",
        )}
      >
        {icon}
      </span>
      <span className="max-w-full truncate px-1">{label}</span>
    </button>
  );
}

/** The ribbon over the live preview while a locked template is previewed. */
function PreviewRibbon() {
  const { templatePreview, setTemplatePreview } = useEditor();
  if (!templatePreview) return null;
  const tpl = getTemplate(templatePreview.templateId);
  const theme = tpl.themes.find((t) => t.id === templatePreview.themeId) ?? tpl.themes[0];
  return <RibbonView templateName={tpl.name} themeName={tpl.themes.length > 1 ? theme.name : undefined} onBack={() => setTemplatePreview(null)} />;
}

/** Review state under the top bar: the client's banner, or the admin's approve / request changes. */
function ReviewRow() {
  const { card, role, client } = useEditor();
  const toast = useToast();
  const [asking, setAsking] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const review = card.review;
  if (!review || review.status === "approved") return null;
  if (role === "admin" && review.status !== "pending") return null;

  return (
    <div className="shrink-0 border-b border-studio-line bg-studio-surface px-3 py-2 sm:px-4">
      <ReviewBanner
        review={review}
        audience={role}
        company={WORKSPACE.company}
        clientName={client?.name ?? card.name}
        actions={
          role === "admin" ? (
            <>
              <Button size="sm" onClick={() => setAsking(true)}>
                Request changes
              </Button>
              <Button
                size="sm"
                variant="primary"
                loading={busy === "approve"}
                onClick={async () => {
                  setBusy("approve");
                  const res = await approveCardReview(card.id);
                  setBusy(null);
                  if (res.ok)
                    toast.success("Approved and published", {
                      description:
                        "The client was told in their portal and by email.",
                    });
                  else
                    toast.error("Couldn’t approve", { description: res.error });
                }}
              >
                Approve & publish
              </Button>
            </>
          ) : undefined
        }
      />
      <Dialog
        open={asking}
        onOpenChange={setAsking}
        title="Ask for changes"
        description="The client sees this note in their portal and by email. Their live card stays as it is."
        footer={
          <>
            <Button onClick={() => setAsking(false)}>Cancel</Button>
            <Button
              variant="primary"
              disabled={!note.trim()}
              loading={busy === "changes"}
              onClick={async () => {
                setBusy("changes");
                const res = await requestCardChanges(card.id, note);
                setBusy(null);
                if (!res.ok)
                  return toast.error("Couldn’t send", {
                    description: res.error,
                  });
                setAsking(false);
                setNote("");
                toast.success("Changes requested", {
                  description:
                    "The client was told in their portal and by email.",
                });
              }}
            >
              Send note
            </Button>
          </>
        }
      >
        <Field label="What should change?">
          {(p) => (
            <Textarea
              id={p.id}
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Please use the new licence number before this goes live."
              autoFocus
            />
          )}
        </Field>
      </Dialog>
    </div>
  );
}

function SaveIndicator() {
  const { save, retrySave } = useEditor();
  if (save.status === "saving") {
    return (
      <span
        role="status"
        className="flex items-center gap-1.5 text-2xs text-studio-ink-3"
      >
        <LoaderCircle aria-hidden className="size-3.5 animate-spin" />
        Saving
      </span>
    );
  }
  if (save.status === "error") {
    return (
      <span
        role="alert"
        className="flex items-center gap-2 text-2xs font-medium text-studio-danger-ink"
      >
        <CircleAlert aria-hidden className="size-3.5" />
        <Tooltip content={save.error ?? "Couldn’t save"}>
          <span>Not saved</span>
        </Tooltip>
        <button
          type="button"
          onClick={retrySave}
          className="cursor-pointer font-semibold underline underline-offset-2"
        >
          Retry
        </button>
      </span>
    );
  }
  return (
    <span
      role="status"
      className="flex items-center gap-1.5 text-2xs text-studio-ink-3"
    >
      <Check
        aria-hidden
        className="size-3.5 text-studio-success"
        strokeWidth={2.5}
      />
      {save.status === "saved"
        ? "Draft saved"
        : `Saved ${formatRelative(save.savedAt)}`}
    </span>
  );
}

function TopBar() {
  const router = useRouter();
  const {
    card,
    device,
    setDevice,
    invalid,
    save,
    setTab,
    retrySave,
    role,
    client,
  } = useEditor();
  const ops = useCardOps();
  const toast = useToast();
  const dirty = hasUnpublishedChanges(card);
  const invalidCount = Object.keys(invalid).length;
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const isClient = role === "client";
  const home = isClient ? "/portal" : "/admin";
  // Clients publish directly only when the admin allowed it for this card.
  const canPublish = !isClient || !!card.permissions?.clientCanPublish;

  const publishLabel =
    card.status === "draft"
      ? "Publish"
      : dirty
        ? "Publish changes"
        : "Published";
  const busy = ops.busy === `publish:${card.id}`;
  const state = portalCardState(card);

  const submit = async () => {
    if (save.status === "saving" || save.status === "error") await retrySave();
    setSubmitting(true);
    const res = await submitCardForReview(card.id);
    setSubmitting(false);
    if (res.ok)
      toast.success(`Sent to ${WORKSPACE.shortName} for review`, {
        description: "Your live card stays as it is until it’s approved.",
      });
    else toast.error("Couldn’t send for review", { description: res.error });
  };

  let action: React.ReactNode;
  if (invalidCount > 0) {
    action = (
      <Tooltip
        content={`Fix ${invalidCount} field${invalidCount === 1 ? "" : "s"} before ${canPublish ? "publishing" : "submitting"}`}
      >
        <span>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setTab("content")}
            aria-disabled
            className="opacity-60"
          >
            {canPublish ? publishLabel : "Submit for review"}
          </Button>
        </span>
      </Tooltip>
    );
  } else if (canPublish) {
    action = (
      <Button
        variant="primary"
        size="sm"
        loading={busy}
        disabled={card.status === "published" && !dirty}
        onClick={async () => {
          // Flush a pending autosave first so the published version includes the latest edit.
          if (save.status === "saving" || save.status === "error")
            await retrySave();
          ops.publish(card, { asClient: isClient });
        }}
        icon={
          card.status === "published" && !dirty ? (
            <Check aria-hidden className="size-4" />
          ) : undefined
        }
      >
        {busy ? "Publishing" : publishLabel}
      </Button>
    );
  } else if (state === "review") {
    action = (
      <span className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-studio-info-soft px-3 text-sm font-semibold text-studio-info-ink">
        <Hourglass aria-hidden className="size-4" />
        In review
      </span>
    );
  } else {
    action = (
      <Button
        variant="primary"
        size="sm"
        loading={submitting}
        disabled={state === "live"}
        onClick={submit}
        icon={
          state === "live" ? (
            <Check aria-hidden className="size-4" />
          ) : (
            <Send aria-hidden className="size-4" />
          )
        }
      >
        {submitting
          ? "Sending"
          : state === "live"
            ? "Up to date"
            : "Submit for review"}
      </Button>
    );
  }

  return (
    <header className="flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-studio-line bg-studio-surface px-3 py-2 sm:px-4">
      <div className="flex min-w-0 items-center gap-2">
        <Link
          href={home}
          onClick={(e) => {
            if (
              invalidCount > 0 ||
              save.status === "saving" ||
              save.status === "error"
            ) {
              e.preventDefault();
              setLeaveOpen(true);
            }
          }}
          className="inline-flex h-11 shrink-0 items-center gap-1 rounded-lg pr-2.5 pl-1.5 text-sm font-medium text-studio-ink-2 hover:bg-studio-raised hover:text-studio-ink"
        >
          <ChevronLeft aria-hidden className="size-[18px]" />
          {isClient ? "My card" : "Cards"}
        </Link>
        <span aria-hidden className={cn("h-5 w-px bg-studio-line", isClient && "hidden sm:block")} />
        <h1
          className={cn(
            "min-w-0 truncate px-1 text-[15px] font-semibold",
            isClient && "sr-only sm:not-sr-only",
          )}
        >
          {isClient ? "Edit my card" : card.name || "Untitled card"}
        </h1>
        {isClient ? (
          <span className="hidden sm:contents">
            <StatusChip kind="review" status={state} size="sm" />
          </span>
        ) : (
          <StatusBadge status={card.status} dirty={dirty} />
        )}
        {!isClient && client && (
          <Link
            href={`/admin/clients?client=${client.id}`}
            className="hidden h-9 items-center rounded-lg px-2 text-2xs font-semibold text-studio-ink-3 hover:bg-studio-raised hover:text-studio-ink xl:inline-flex"
          >
            Client: {client.name}
          </Link>
        )}
      </div>

      <div className="hidden lg:block">
        <Segmented<Device>
          label="Preview device"
          value={device}
          onChange={setDevice}
          size="sm"
          options={[
            {
              value: "phone",
              label: "Phone",
              icon: <Smartphone aria-hidden />,
            },
            { value: "tablet", label: "Tablet", icon: <Tablet aria-hidden /> },
            {
              value: "desktop",
              label: "Desktop",
              icon: <Monitor aria-hidden />,
            },
          ]}
        />
      </div>

      <div className="flex items-center gap-2.5">
        <SaveIndicator />
        {isClient && client && <NotificationBell client={client} />}
        {!isClient && (
          <LinkButton
            href={`/admin/cards/${card.id}/preview`}
            size="sm"
            className="hidden sm:inline-flex"
          >
            Preview
          </LinkButton>
        )}
        {action}
      </div>

      <Dialog
        open={leaveOpen}
        onOpenChange={setLeaveOpen}
        size="sm"
        title="Leave the editor?"
        description={
          invalidCount > 0
            ? `${invalidCount} field${invalidCount === 1 ? " has a value" : "s have values"} that couldn’t be saved because ${invalidCount === 1 ? "it isn’t" : "they aren’t"} valid yet. Leaving discards ${invalidCount === 1 ? "it" : "them"}.`
            : "The latest changes are still saving. Leaving now may lose them."
        }
        footer={
          <>
            <Button onClick={() => setLeaveOpen(false)}>Stay and fix</Button>
            <Button variant="danger" onClick={() => router.push(home)}>
              Leave anyway
            </Button>
          </>
        }
      />
    </header>
  );
}
