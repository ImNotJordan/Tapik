"use client";

import { ArrowRight, Check, CircleCheck, Clock, LoaderCircle, Lock } from "lucide-react";
import { useId, useMemo, useState, type ReactNode } from "react";
import { NEEDS_PAYMENT } from "@/lib/entitlements";
import { useIsDesktop } from "@/lib/hooks";
import { WORKSPACE } from "@/lib/mock/workspace";
import { formatPeso } from "@/lib/pricing";
import type { CardBundle, TemplatePricing, TemplateRequest } from "@/lib/types";
import { cn, formatRelative } from "@/lib/utils";
import { getTemplate, lookFor } from "@/templates/registry";
import { withLook } from "@/templates/preview-kit";
import { Button } from "@/components/ui/button";
import { AdaptiveDialog } from "@/components/ui/dialog";
import { Field, Textarea } from "@/components/ui/field";
import { StatusChip } from "@/components/ui/status-chip";
import { PaymentStep } from "./payment-step";
import { TemplateThumbnail } from "./template-thumbnail";

type Result = { ok: true } | { ok: false; error: string };
/** A request was made: with QR payments it opens at "pending_payment" and the sheet moves to the payment step. */
type Requested = { ok: true; status?: TemplateRequest["status"] } | { ok: false; error: string };

export type PaywallProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** The paid template the client tapped. */
  templateId: string;
  pricing: TemplatePricing;
  /** The theme the client is previewing it in. */
  themeId?: string;
  /** The client's saved card: the "now" preview and the content of the "after" one. */
  bundle: CardBundle;
  /** Name of the Default template, for "switch back any time". */
  defaultName: string;
  /** An open request for this template: the sheet shows its status instead of the offer. */
  request?: TemplateRequest;
  onRequest: (note: string) => Promise<Requested>;
  /** The signed-in client (their receipt uploads go to their own folder). */
  clientId?: string;
  onCancelRequest: () => Promise<Result>;
  /** "Keep current template": also ends the preview (closing with X keeps previewing). */
  onKeep?: () => void;
  /** Render inline (style guide) instead of in a dialog. */
  inline?: boolean;
};

/**
 * "Unlock [template]". A calm offer, not a pitch: the price, what it includes,
 * the card now and in this template, an optional note, and two equal ways out.
 * With QR payments on, requesting moves straight to the payment step (the InstaPay
 * QR and "I've paid"); the sheet can close and reopen at the same step later.
 */
export function PaywallSheet(props: PaywallProps) {
  const desktop = useIsDesktop();
  const { open, onOpenChange, templateId, request, inline, clientId } = props;
  // Mounted per template (key), so the success state lives until it closes.
  const [phase, setPhase] = useState<"offer" | "sent" | "paying" | "submitted">("offer");
  const name = getTemplate(templateId).name;
  const paying = !!request && !!clientId && NEEDS_PAYMENT.includes(request.status) && phase !== "submitted";
  const verifying = phase === "submitted" || request?.status === "payment_submitted";

  const title =
    phase === "sent" ? "Request sent"
    : verifying ? "Verifying your payment"
    : paying ? (request!.status === "payment_rejected" ? `Check your payment for ${name}` : `Pay for ${name}`)
    : phase === "paying" ? `Pay for ${name}`
    : request ? `${name} is requested`
    : `Unlock ${name}`;
  let body: ReactNode;
  if (phase === "sent") body = <Sent name={name} onDone={() => onOpenChange(false)} />;
  else if (verifying) body = <Verifying name={name} request={request} onDone={() => onOpenChange(false)} />;
  else if (paying) {
    body = (
      <PaymentStep
        request={request!}
        clientId={clientId!}
        name={name}
        preview={<Mini label={name} bundle={props.bundle} templateId={templateId} themeId={request!.themeId ?? props.themeId} small />}
        onCancelRequest={async () => {
          const r = await props.onCancelRequest();
          if (r.ok) onOpenChange(false);
          return r;
        }}
        onSubmitted={() => setPhase("submitted")}
      />
    );
  } else if (phase === "paying") {
    body = (
      <p role="status" className="flex items-center gap-2 py-8 text-sm text-studio-ink-2">
        <LoaderCircle aria-hidden className="size-4 animate-spin" /> Getting the payment details ready…
      </p>
    );
  } else body = request ? <Status {...props} name={name} request={request} /> : <Offer {...props} name={name} onSent={(status) => setPhase(status === "pending_payment" ? "paying" : "sent")} />;

  if (inline) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-studio-line bg-studio-surface p-5 shadow-[0_24px_64px_-24px_rgb(0_0_0/0.25)]">
        <p className="text-lg font-semibold">{title}</p>
        {body}
      </div>
    );
  }
  return (
    <AdaptiveDialog desktop={desktop} open={open} onOpenChange={onOpenChange} title={title} size="md">
      {body}
    </AdaptiveDialog>
  );
}

function Offer({ name, templateId, pricing, themeId, bundle, defaultName, onRequest, onOpenChange, onKeep, onSent }: PaywallProps & { name: string; onSent: (status?: TemplateRequest["status"]) => void }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tpl = getTemplate(templateId);
  const current = getTemplate(bundle.card.templateId);
  const priceId = useId();

  const send = async () => {
    setBusy(true);
    setError(null);
    const res = await onRequest(note);
    setBusy(false);
    if (res.ok) onSent(res.status);
    else setError(res.error);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-end justify-between gap-4 border-b border-studio-line pb-4">
        <div className="flex flex-col gap-1">
          <p id={priceId} className="text-[2rem] leading-none font-semibold tracking-[-0.02em] tabular-nums">
            {formatPeso(pricing.price ?? 0)}
          </p>
          <p className="text-sm text-studio-ink-3">One-time unlock for this card.</p>
        </div>
        <span className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full bg-studio-raised px-2.5 text-2xs font-semibold text-studio-ink-2">
          <Lock aria-hidden className="size-3" strokeWidth={2.5} />
          {tpl.category}
        </span>
      </div>

      <BeforeAfter bundle={bundle} templateId={templateId} themeId={themeId} currentName={current.name} name={name} />

      <ul className="flex flex-col gap-2 text-sm">
        {[
          `The ${name} layout, with your own content`,
          `All ${tpl.themes.length} of its color themes, free to switch`,
          `Switch back to ${defaultName} any time`,
          `Pay by InstaPay with GCash, Maya or any bank app. ${name} goes on your card once ${WORKSPACE.shortName} confirms it`,
        ].map((t) => (
          <li key={t} className="flex gap-2.5">
            <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-studio-success" strokeWidth={2.5} />
            <span className="text-studio-ink-2">{t}</span>
          </li>
        ))}
      </ul>

      <Field label={`Note for ${WORKSPACE.shortName}`} optional>
        {(p) => <Textarea id={p.id} aria-describedby={p.describedBy} rows={2} maxLength={400} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Can you send the GCash details?" />}
      </Field>

      {error && (
        <p role="alert" className="rounded-lg bg-studio-danger-soft px-3 py-2 text-sm text-studio-danger-ink">
          {error}
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          size="lg"
          onClick={() => {
            onKeep?.();
            onOpenChange(false);
          }}
          className="sm:min-w-40"
        >
          Keep current template
        </Button>
        <Button size="lg" variant="primary" loading={busy} onClick={send} aria-describedby={priceId} className="sm:min-w-48">
          {busy ? "Sending" : "Request this template"}
        </Button>
      </div>
    </div>
  );
}

function BeforeAfter({ bundle, templateId, themeId, currentName, name }: { bundle: CardBundle; templateId: string; themeId?: string; currentName: string; name: string }) {
  const after = useMemo(() => withLook(bundle, lookFor(getTemplate(templateId), themeId)), [bundle, templateId, themeId]);
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-xl bg-studio-sunken p-3 sm:gap-4 sm:p-4">
      <Mini label={`Now: ${currentName}`} bundle={bundle} />
      <ArrowRight aria-hidden className="size-4 text-studio-ink-3" />
      <Mini label={name} bundle={after} highlight />
    </div>
  );
}

function Mini({ label, bundle, highlight, templateId, themeId, small }: { label: string; bundle: CardBundle; highlight?: boolean; templateId?: string; themeId?: string; small?: boolean }) {
  // `templateId`: the card shown in that template (the payment step's header).
  const shown = useMemo(() => (templateId ? withLook(bundle, lookFor(getTemplate(templateId), themeId)) : bundle), [bundle, templateId, themeId]);
  if (small) {
    return (
      <div aria-hidden className="overflow-hidden rounded-[10px] border border-studio-line">
        <TemplateThumbnail bundle={shown} width={390} height={640} scale={0.16} eager />
      </div>
    );
  }
  return (
    <figure className="flex flex-col items-center gap-2">
      <div className={cn("overflow-hidden rounded-[14px] border-2", highlight ? "border-studio-action" : "border-studio-line")}>
        <TemplateThumbnail bundle={shown} width={390} height={640} scale={0.3} eager />
      </div>
      <figcaption className={cn("text-center text-2xs", highlight ? "font-semibold text-studio-ink" : "text-studio-ink-3")}>{label}</figcaption>
    </figure>
  );
}

function Sent({ name, onDone }: { name: string; onDone: () => void }) {
  return (
    <div className="flex flex-col items-start gap-4">
      <div role="status" className="flex gap-3">
        <CircleCheck aria-hidden className="mt-0.5 size-6 shrink-0 text-studio-success" strokeWidth={2} />
        <div className="flex flex-col gap-1">
          <p className="text-base font-semibold">Request sent.</p>
          <p className="text-sm text-studio-ink-2">
            {WORKSPACE.company} will contact you about payment for {name}. Your card stays as it is; when {name} is unlocked you’ll get a notification with Apply now.
          </p>
        </div>
      </div>
      <Button size="lg" variant="primary" onClick={onDone} autoFocus className="w-full sm:w-auto">
        Done
      </Button>
    </div>
  );
}

/** A payment is in: the studio verifies it. No cancelling from here (it may already be with the bank). */
function Verifying({ name, request, onDone }: { name: string; request?: TemplateRequest; onDone: () => void }) {
  const p = request?.payment;
  return (
    <div className="flex flex-col items-start gap-5">
      <div role="status" className="flex gap-3">
        <Clock aria-hidden className="mt-0.5 size-6 shrink-0 text-studio-info-ink" strokeWidth={2} />
        <div className="flex flex-col gap-1">
          <p className="text-base font-semibold">Payment submitted. We’ll verify it shortly.</p>
          <p className="text-sm text-studio-ink-2">
            {WORKSPACE.shortName} checks the transfer, then puts {name} on your card. You’ll get a notification and an email. Your card stays as it is until then.
          </p>
        </div>
      </div>
      {p && (
        <dl className="grid w-full grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-xl bg-studio-raised px-4 py-3 text-sm">
          <dt className="text-studio-ink-3">Reference</dt>
          <dd className="font-mono tracking-wide">{p.referenceNo}</dd>
          <dt className="text-studio-ink-3">Amount</dt>
          <dd className="tabular-nums">{formatPeso(p.amountPaid)}</dd>
          <dt className="text-studio-ink-3">Submitted</dt>
          <dd>{formatRelative(p.submittedAt)}</dd>
        </dl>
      )}
      <Button size="lg" variant="primary" onClick={onDone} autoFocus className="w-full sm:w-auto">
        Done
      </Button>
    </div>
  );
}

function Status({ name, request, onCancelRequest, onOpenChange }: PaywallProps & { name: string; request: TemplateRequest }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const awaiting = request.status === "awaiting_payment";
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <StatusChip kind="request" status={request.status} />
        <span className="text-sm text-studio-ink-3">Requested {formatRelative(request.requestedAt)}</span>
      </div>
      <p className="text-sm text-studio-ink-2">
        {awaiting
          ? `Payment details for ${formatPeso(request.price)} were sent to your email${request.paymentRequestedAt ? ` ${formatRelative(request.paymentRequestedAt)}` : ""}. ${name} unlocks as soon as ${WORKSPACE.shortName} confirms it.`
          : `${WORKSPACE.company} has your request for ${name} (${formatPeso(request.price)}) and will contact you about payment.`}
      </p>
      {request.note && (
        <blockquote className="rounded-lg border-l-2 border-studio-line-strong bg-studio-raised px-3 py-2 text-sm text-studio-ink-2">
          <span className="sr-only">Your note: </span>“{request.note}”
        </blockquote>
      )}
      {error && (
        <p role="alert" className="rounded-lg bg-studio-danger-soft px-3 py-2 text-sm text-studio-danger-ink">
          {error}
        </p>
      )}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          size="lg"
          variant="danger-ghost"
          loading={busy}
          onClick={async () => {
            setBusy(true);
            const res = await onCancelRequest();
            setBusy(false);
            if (res.ok) onOpenChange(false);
            else setError(res.error);
          }}
        >
          Cancel request
        </Button>
        <Button size="lg" variant="primary" onClick={() => onOpenChange(false)} autoFocus>
          Close
        </Button>
      </div>
    </div>
  );
}
