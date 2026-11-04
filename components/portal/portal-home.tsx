"use client";

import Link from "next/link";
import { ArrowRight, Check, Copy, ExternalLink, PenLine, Share2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useIsDesktop } from "@/lib/hooks";
import { WORKSPACE } from "@/lib/mock/workspace";
import { portalCardState } from "@/lib/services/cards";
import { touchClientActive } from "@/lib/services/clients";
import { useCardBundle, useDB } from "@/lib/services/data";
import type { CardBundle, Client } from "@/lib/types";
import { cn, formatRelative, greetingName, publicCardPath, publicCardUrl } from "@/lib/utils";
import { Button, LinkButton } from "@/components/ui/button";
import { buttonClass } from "@/components/ui/button-styles";
import { AdaptiveDialog } from "@/components/ui/dialog";
import { DevicePreview } from "@/components/ui/device-preview";
import { QrPreview } from "@/components/ui/qr-preview";
import { StatusChip } from "@/components/ui/status-chip";
import { CardRenderer } from "@/components/card/card-renderer";
import { useCopy } from "@/components/card/actions";
import { ClientGate, PortalSkeleton } from "./gates";
import { PortalShell } from "./portal-shell";
import { openPortalRequests } from "./request-adapter";
import { ReviewBanner } from "./review-banner";

export function PortalHome() {
  return <ClientGate>{(client) => <Home client={client} />}</ClientGate>;
}

const STATE_LINE: Record<ReturnType<typeof portalCardState>, string> = {
  live: "Your card is live. Anyone who taps your NFC card or scans your code sees it.",
  draft: "Your card isn’t live yet.",
  changes: "You have edits that aren’t on your live card yet.",
  review: `${WORKSPACE.shortName} is reviewing your latest edits.`,
  changes_requested: `${WORKSPACE.shortName} asked for a few changes before this goes live.`,
};

function Home({ client }: { client: Client }) {
  const { bundle } = useCardBundle(client.cardId);
  const [share, setShare] = useState(false);

  useEffect(() => {
    touchClientActive(client.id);
  }, [client.id]);

  if (!bundle) return <PortalSkeleton />;
  const { card } = bundle;
  const state = portalCardState(card);
  const neverLive = !card.published_at;
  const goLiveHow = card.permissions?.clientCanPublish ? "after you publish it from the editor" : `once ${WORKSPACE.shortName} approves your first version`;

  return (
    <PortalShell client={client}>
      <div className="mx-auto grid w-full max-w-[1080px] gap-8 px-4 pt-6 pb-6 sm:px-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:gap-12 lg:pt-10">
        {/* Right on desktop, first on phones: who, status, actions. */}
        <div className="flex min-w-0 flex-col gap-6 lg:order-2 lg:pt-4">
          <div className="flex flex-col gap-3">
            <h1 className="text-[1.75rem] leading-tight font-semibold tracking-[-0.02em] sm:text-3xl">Hi {greetingName(client.name)}</h1>
            <div className="flex flex-col items-start gap-2">
              <StatusChip kind="review" status={state} />
              <p className="text-base text-studio-ink-2">{STATE_LINE[state]}</p>
            </div>
          </div>

          {(card.review?.status === "pending" || card.review?.status === "changes_requested") && <ReviewBanner review={card.review} audience="client" company={WORKSPACE.company} />}

          <div className="flex flex-col gap-2.5">
            <LinkButton href="/portal/edit" variant="primary" size="lg" className="w-full sm:w-auto sm:self-start sm:px-8" icon={<PenLine aria-hidden className="size-4" />}>
              Edit my card
            </LinkButton>
            <div className="grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap">
              {neverLive ? (
                <span aria-disabled="true" className={buttonClass("secondary", "lg", "pointer-events-none opacity-55")}>
                  <ExternalLink aria-hidden className="size-4" />
                  View live card
                </span>
              ) : (
                <a href={publicCardPath(card.slug)} target="_blank" rel="noreferrer" className={buttonClass("secondary", "lg")}>
                  <ExternalLink aria-hidden className="size-4" />
                  View live card
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              )}
              <Button size="lg" icon={<Share2 aria-hidden className="size-4" />} onClick={() => setShare(true)}>
                Share<span className="sr-only"> my card</span>
              </Button>
            </div>
            {neverLive && <p className="text-sm text-studio-ink-3">Your card goes live {goLiveHow}.</p>}
          </div>

          <ThemeRequests cardId={card.id} />
          <Checklist bundle={bundle} />
        </div>

        {/* The card itself. */}
        <section aria-label="Your card" className="flex min-w-0 flex-col items-center gap-3 lg:order-1">
          <div className="flex h-[min(720px,calc(100dvh-140px))] min-h-[520px] w-full max-w-[400px] rounded-[32px] bg-studio-sunken p-4 lg:sticky lg:top-24">
            <DevicePreview device="phone">
              <CardRenderer bundle={bundle} mode="preview" viewportHeight="844px" />
            </DevicePreview>
          </div>
          <p className="text-2xs text-studio-ink-3">{state === "live" ? "Same as your live card" : "Preview with your latest edits"} · Updated {formatRelative(card.updated_at)}</p>
        </section>
      </div>

      <ShareDialog bundle={bundle} open={share} onOpenChange={setShare} neverLive={neverLive} goLiveHow={goLiveHow} />
    </PortalShell>
  );
}

function ThemeRequests({ cardId }: { cardId: string }) {
  const { db } = useDB();
  const open = useMemo(() => openPortalRequests(db, cardId), [db, cardId]);
  if (open.length === 0) return null;
  return (
    <section aria-labelledby="req-h" className="flex flex-col gap-3 rounded-2xl border border-studio-line bg-studio-surface p-4 sm:p-5">
      <h2 id="req-h" className="text-base font-semibold">
        Template request{open.length > 1 ? "s" : ""}
      </h2>
      <ul className="flex flex-col divide-y divide-studio-line">
        {open.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3 first:pt-0 last:pb-0">
            <div className="flex min-w-0 flex-1 basis-40 flex-col gap-0.5">
              <p className="text-sm font-semibold">{r.name} requested</p>
              <p className="text-2xs text-studio-ink-2">
                <span className="font-semibold tabular-nums">{r.price}</span>
                {r.themeName && ` · in the ${r.themeName} colors`}
              </p>
              <p className="text-2xs text-studio-ink-3">Requested {formatRelative(r.requestedAt)}</p>
              {r.awaitingPayment && (
                <p className="text-2xs text-studio-ink-2">Payment details were sent to your email{r.paymentRequestedAt ? ` ${formatRelative(r.paymentRequestedAt)}` : ""}.</p>
              )}
            </div>
            <StatusChip kind="request" status={r.status} size="sm" />
          </li>
        ))}
      </ul>
      <Link href="/portal/edit?tab=design" className="inline-flex h-11 items-center gap-1.5 self-start text-sm font-semibold text-studio-action-ink underline-offset-2 hover:underline">
        See it in Design
        <ArrowRight aria-hidden className="size-4" />
      </Link>
    </section>
  );
}

function Checklist({ bundle }: { bundle: CardBundle }) {
  const { card, photos, socials } = bundle;
  const items = [
    { label: "Add your photo", done: !!card.agentPhotoUrl, tab: "media" },
    { label: "Add a cover photo", done: !!card.backgroundPhotoUrl, tab: "media" },
    { label: "Add 3 or more album photos", done: photos.length >= 3, tab: "photos" },
    { label: "Add your socials", done: socials.some((s) => s.visible), tab: "socials" },
    { label: "Write a short quote", done: !!card.quote?.trim(), tab: "content" },
  ];
  const done = items.filter((i) => i.done).length;
  if (done === items.length) return null;
  return (
    <section aria-labelledby="todo-h" className="flex flex-col gap-3 rounded-2xl border border-studio-line bg-studio-surface p-4 sm:p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="todo-h" className="text-base font-semibold">
          Finish your card
        </h2>
        <span className="text-sm text-studio-ink-3 tabular-nums">
          {done} of {items.length} done
        </span>
      </div>
      <div aria-hidden className="h-1.5 overflow-hidden rounded-full bg-studio-raised">
        <div className="h-full rounded-full bg-studio-action transition-[width] duration-300" style={{ width: `${(done / items.length) * 100}%` }} />
      </div>
      <ul className="-mx-2 flex flex-col">
        {items.map((i) => (
          <li key={i.label}>
            <Link
              href={`/portal/edit?tab=${i.tab}`}
              className={cn("group flex min-h-12 items-center gap-3 rounded-lg px-2 py-2 hover:bg-studio-raised", i.done && "text-studio-ink-3")}
            >
              <span
                aria-hidden
                className={cn(
                  "inline-flex size-6 shrink-0 items-center justify-center rounded-full border-[1.5px]",
                  i.done ? "border-studio-success bg-studio-success text-white" : "border-studio-line-strong",
                )}
              >
                {i.done && <Check className="size-3.5" strokeWidth={3} />}
              </span>
              <span className={cn("flex-1 text-[15px]", i.done ? "line-through decoration-studio-ink-3/50" : "font-medium text-studio-ink")}>
                {i.label}
                <span className="sr-only">{i.done ? ", done" : ", to do"}</span>
              </span>
              {!i.done && <ArrowRight aria-hidden className="size-4 text-studio-ink-3 transition-transform group-hover:translate-x-0.5" />}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ShareDialog({ bundle, open, onOpenChange, neverLive, goLiveHow }: { bundle: CardBundle; open: boolean; onOpenChange: (v: boolean) => void; neverLive: boolean; goLiveHow: string }) {
  const desktop = useIsDesktop();
  const { copied, copy } = useCopy();
  const { card } = bundle;
  const url = publicCardUrl(card.slug);
  const canNativeShare = typeof navigator !== "undefined" && "share" in navigator;
  return (
    <AdaptiveDialog
      desktop={desktop}
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      title="Share your card"
      description={neverLive ? `The link and code start working ${goLiveHow}.` : "Send the link, or let people scan the code from your screen."}
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-studio-raised p-5">
          <div className="rounded-xl bg-white p-2">
            <QrPreview value={url} size={184} title={`QR code for ${card.name}’s card`} />
          </div>
          <p className="max-w-full text-center text-sm break-all text-studio-ink-2">{url.replace(/^https?:\/\//, "")}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button size="lg" variant="primary" className="flex-1" onClick={() => copy(url)} icon={copied ? <Check aria-hidden className="size-4" /> : <Copy aria-hidden className="size-4" />}>
            {copied ? "Copied" : "Copy link"}
          </Button>
          {canNativeShare && (
            <Button
              size="lg"
              className="flex-1"
              icon={<Share2 aria-hidden className="size-4" />}
              onClick={() => navigator.share({ title: card.name, url }).catch(() => undefined)}
            >
              Share…
            </Button>
          )}
        </div>
        <p aria-live="polite" className="sr-only">
          {copied ? "Link copied" : ""}
        </p>
      </div>
    </AdaptiveDialog>
  );
}
