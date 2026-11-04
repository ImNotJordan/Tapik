"use client";

import { brandUrl } from "@/lib/brand";
import { useMemo, useState, useSyncExternalStore } from "react";
import { createSeedDB, bundleFromDB } from "@/lib/mock";
import { ago } from "@/lib/mock/clients";
import { WORKSPACE } from "@/lib/mock/workspace";
import { paymentEmail } from "@/lib/services/requests";
import { pricingOf } from "@/lib/services/templates";
import { templatePricing } from "@/lib/entitlements";
import type { CardReview } from "@/lib/types";
import { getTemplate } from "@/templates/registry";
import { CLIENT_CHIP, INVITE_CHIP, REQUEST_CHIP, REVIEW_CHIP, StatusChip } from "@/components/ui/status-chip";
import { AccessBadge, type TileState } from "@/components/templates/access-badge";
import { PaywallSheet } from "@/components/templates/paywall-sheet";
import { PreviewRibbon } from "@/components/templates/preview-ribbon";
import { TemplateBrowser } from "@/components/templates/template-browser";
import { templateItems } from "@/components/templates/template-items";
import { ThemeSwatch } from "@/components/themes/theme-swatch";
import { EmailPreview, InviteEmailBody, PaymentEmailBody } from "@/components/email/email-preview";
import { ReviewBanner } from "@/components/portal/review-banner";
import { Button } from "@/components/ui/button";

/**
 * Style guide: the Client Portal and paid-template pieces in every state.
 * Rendered from the same components the screens use, on seed data.
 */
type DemoFn = (p: { label: string; children: React.ReactNode; className?: string }) => React.ReactNode;

const noopSubscribe = () => () => {};

export function PortalGuide({ Demo }: { Demo: DemoFn }) {
  // Times ("2 hours ago") depend on the visitor's clock, so these demos render in the browser only.
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  if (!mounted) return <div aria-busy="true" className="skeleton h-[480px] rounded-2xl" />;
  return <PortalGuideInner Demo={Demo} />;
}

function PortalGuideInner({ Demo }: { Demo: DemoFn }) {
  const db = useMemo(() => createSeedDB(), []);
  const bundle = useMemo(() => bundleFromDB(db, "card_carmela")!, [db]);
  const pricing = pricingOf(db);
  const folio = templatePricing("folio", pricing);
  const keepsake = templatePricing("keepsake", pricing);
  const boardroom = templatePricing("boardroom", pricing);
  const joelReq = db.templateRequests.find((r) => r.id === "tr_1")!;
  const lia = db.clients.find((c) => c.id === "cl_lia")!;
  const liaReq = db.templateRequests.find((r) => r.id === "tr_4")!;
  const pay = paymentEmail(liaReq, lia);
  const items = useMemo(() => templateItems(db.library).filter((i) => !i.saved).slice(0, 4), [db]);
  const access = (id: string) => (id === "keepsake" ? "free" : id === "landmark" ? "unlocked" : id === "folio" ? "requested" : "locked");
  const [themePick, setThemePick] = useState("forest");
  const keepsakeTpl = getTemplate("keepsake");
  const noop = async () => ({ ok: true as const });
  const pending: CardReview = { status: "pending", submittedAt: ago(0, 2) };
  const changes: CardReview = { status: "changes_requested", submittedAt: pending.submittedAt, resolvedAt: ago(0, 1), note: "Please use the new licence number, PRC REB No. 0004127, before this goes live." };

  const tileStates: [TileState, typeof folio][] = [
    ["free", keepsake],
    ["locked", folio],
    ["locked", boardroom],
    ["requested", folio],
    ["unlocked", folio],
    ["previewing", folio],
  ];

  return (
    <div className="flex flex-col gap-8">
      <Demo label="StatusChip: invite, request, review and client states. Always text and an icon.">
        <div className="flex flex-col gap-3">
          {(
            [
              ["invite", INVITE_CHIP],
              ["request", REQUEST_CHIP],
              ["review", REVIEW_CHIP],
              ["client", CLIENT_CHIP],
            ] as const
          ).map(([kind, map]) => (
            <div key={kind} className="flex flex-wrap items-center gap-2">
              <span className="w-16 text-2xs font-semibold text-studio-ink-3">{kind}</span>
              {Object.keys(map).map((s) => (
                <StatusChip key={s} kind={kind} status={s} />
              ))}
            </div>
          ))}
        </div>
      </Demo>

      <Demo label="Template price states (AccessBadge). Clients: free (Default), locked with price, requested, unlocked, previewing. Admins see prices without locks.">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {tileStates.map(([s, p], i) => (
              <AccessBadge key={i} state={s} pricing={p} />
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <AccessBadge state="free" pricing={keepsake} admin />
            <AccessBadge state="locked" pricing={folio} admin />
            <AccessBadge state="locked" pricing={boardroom} admin />
          </div>
        </div>
      </Demo>

      <Demo label="TemplateTile in client mode: the Template Library grid with locks, prices and “Show only what I can use”.">
        <TemplateBrowser items={items} selectedKey="keepsake" currentKey="keepsake" onSelect={() => {}} favorites={[]} content={bundle} pricing={pricing} access={access} previewingKey={null} />
      </Demo>

      <Demo label="ThemeSwatch: themes are free. Selected, and previewing (the themes of a locked template on the client’s card).">
        <div className="grid max-w-xl grid-cols-3 gap-2 sm:grid-cols-6">
          {keepsakeTpl.themes.map((t) => (
            <ThemeSwatch key={t.id} name={t.name} tokens={t.tokens} selected={themePick === t.id} onClick={() => setThemePick(t.id)} />
          ))}
        </div>
      </Demo>

      <Demo label="PreviewRibbon over the live preview" className="bg-studio-sunken">
        <PreviewRibbon templateName="Folio" themeName="Bond" onBack={() => {}} />
      </Demo>

      <div className="grid gap-6 lg:grid-cols-2">
        <Demo label="PaywallSheet: the offer (a dialog on desktop, a bottom sheet on phones)">
          <PaywallSheet inline open onOpenChange={() => {}} templateId="folio" pricing={folio} themeId="bond" bundle={bundle} defaultName="Keepsake" onRequest={noop} onCancelRequest={noop} />
        </Demo>
        <Demo label="PaywallSheet: an open request, with Cancel request">
          <PaywallSheet inline open onOpenChange={() => {}} templateId={joelReq.templateId} pricing={templatePricing(joelReq.templateId, pricing)} bundle={bundle} defaultName="Keepsake" request={joelReq} onRequest={noop} onCancelRequest={noop} />
        </Demo>
      </div>

      <Demo label="ReviewBanner: client and admin views">
        <div className="flex flex-col gap-3">
          <ReviewBanner review={pending} audience="client" company={WORKSPACE.company} />
          <ReviewBanner review={changes} audience="client" company={WORKSPACE.company} />
          <ReviewBanner
            review={pending}
            audience="admin"
            company={WORKSPACE.company}
            clientName="Lia Soriano"
            actions={
              <>
                <Button size="sm">Request changes</Button>
                <Button size="sm" variant="primary">
                  Approve & publish
                </Button>
              </>
            }
          />
        </div>
      </Demo>

      <div className="grid gap-6 xl:grid-cols-2">
        <Demo label="EmailPreview: the invite">
          <EmailPreview to={{ name: "Nenita Dizon", email: "orders@alingnena.ph" }} subject="Your digital business card is ready to edit">
            <InviteEmailBody clientName="Nenita Dizon" message="Hi Aling Nena! Your card is ready. Add a few photos of the kaldero and you're set." link={brandUrl("/invite/nd-8pR2xk")} expiresAt={ago(-7)} />
          </EmailPreview>
        </Demo>
        <Demo label="EmailPreview: payment details for a template request">
          <EmailPreview to={{ name: lia.name, email: lia.email }} subject={pay.subject} device="mobile" onDeviceChange={() => {}}>
            <PaymentEmailBody templateName={getTemplate(liaReq.templateId).name} amount={liaReq.price} body={pay.body} />
          </EmailPreview>
        </Demo>
      </div>

      <Demo label="RoleSwitcher (dev only)">
        <p className="max-w-[60ch] text-sm text-studio-ink-2">
          The dashed pill at the bottom left of the studio, portal and invite pages. It flips this browser between Admin and any client so every screen can be reviewed in both roles. It is not rendered in production builds unless NEXT_PUBLIC_ROLE_SWITCHER=1.
        </p>
      </Demo>
    </div>
  );
}
