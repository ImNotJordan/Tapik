"use client";

import { Download, ImageUp, LoaderCircle, RotateCw, TriangleAlert } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { WORKSPACE } from "@/lib/mock/workspace";
import { formatPeso } from "@/lib/pricing";
import { getPaymentQr, RECEIPT_TYPES, saveQrImage, submitPayment, type PaymentQr } from "@/lib/services/payments";
import type { TemplateRequest } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";

type Result = { ok: true } | { ok: false; error: string };

/** "2026-11-09T14:05" in the visitor's own clock, for datetime-local. */
function localNow(d = new Date()) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/**
 * Pay for a requested template: the InstaPay QR, three steps, then "I've paid"
 * (reference number, amount, when, receipt). Opens straight after the request, and
 * again from "Pay now" or "Resubmit payment". Nothing is charged here; the studio
 * verifies the transfer.
 */
export function PaymentStep({ request, clientId, name, preview, onCancelRequest, onSubmitted }: { request: TemplateRequest; clientId: string; name: string; preview?: ReactNode; onCancelRequest: () => Promise<Result>; onSubmitted: () => void }) {
  const toast = useToast();
  const amountDue = formatPeso(request.price);
  const rejected = request.status === "payment_rejected";
  const prev = request.payment;

  const [qr, setQr] = useState<PaymentQr | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);
  const [qrTry, setQrTry] = useState(0);
  useEffect(() => {
    let live = true;
    void getPaymentQr({ fresh: qrTry > 0 }).then((r) => {
      if (!live) return;
      if (r.ok) setQr(r.data);
      else setQrError(r.error);
    });
    return () => {
      live = false;
    };
  }, [qrTry]);

  const [ref, setRef] = useState(rejected ? prev?.referenceNo ?? "" : "");
  const [amount, setAmount] = useState(String(rejected && prev ? prev.amountPaid : request.price));
  const [paidAt, setPaidAt] = useState(() => (rejected && prev ? localNow(new Date(prev.paidAt)) : localNow()));
  const [receipt, setReceipt] = useState<File | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const formId = useId();

  // The chosen receipt's preview: made when it's picked, freed when replaced or on close.
  const urlRef = useRef<string | null>(null);
  useEffect(() => () => void (urlRef.current && URL.revokeObjectURL(urlRef.current)), []);
  const pickReceipt = (f: File | null) => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = f ? URL.createObjectURL(f) : null;
    setReceipt(f);
    setReceiptUrl(urlRef.current);
  };
  // "Now" for the payment-time check, taken when the form opens and again on submit.
  const [now, setNow] = useState(() => Date.now());

  const refOk = /^[A-Za-z0-9]{6,30}$/.test(ref.trim());
  const n = Number(amount);
  const amountOk = Number.isFinite(n) && n >= 1;
  const whenOk = !!paidAt && Date.parse(paidAt) <= now + 5 * 60_000;
  // On a resubmit the previous receipt can stay (only a new one is uploaded).
  const receiptOk = !!receipt || (rejected && !!prev?.proofPath);
  const mismatch = amountOk && Math.round(n) !== Math.round(request.price);

  const submit = async () => {
    setNow(Date.now());
    setTried(true);
    setError(null);
    if (!refOk || !amountOk || !whenOk || !receiptOk) return;
    setBusy(true);
    setProgress(receipt ? 0 : null);
    const res = await submitPayment(
      { requestId: request.id, clientId, referenceNo: ref, amountPaid: n, paidAt: new Date(paidAt).toISOString(), receipt: receipt ?? undefined, existingProofPath: receipt ? undefined : prev?.proofPath ?? undefined },
      setProgress,
    );
    setBusy(false);
    setProgress(null);
    if (!res.ok) return setError(res.error);
    onSubmitted();
  };

  return (
    <div className="flex flex-col gap-6">
      {rejected && prev?.reviewNote && (
        <div role="alert" className="flex gap-3 rounded-xl bg-studio-danger-soft px-4 py-3 text-studio-danger-ink">
          <TriangleAlert aria-hidden className="mt-0.5 size-5 shrink-0" />
          <div className="flex flex-col gap-1 text-sm">
            <p className="font-semibold">{WORKSPACE.shortName} couldn’t confirm your payment</p>
            <p>“{prev.reviewNote}”</p>
            <p>Check the details below and submit again. Your previous receipt stays unless you replace it.</p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-4">
        {preview}
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-sm text-studio-ink-3">Amount due for {name}</p>
          <p className="text-[2.5rem] leading-none font-semibold tracking-[-0.03em] tabular-nums">{amountDue}</p>
          <p className="text-sm text-studio-ink-3">One time, for this card.</p>
        </div>
      </div>

      {/* The QR: large on a white ground so another phone can scan it off this screen. */}
      <section aria-labelledby={`${formId}-qr`} className="flex flex-col items-center gap-3 rounded-2xl border border-studio-line bg-studio-sunken p-4">
        <h3 id={`${formId}-qr`} className="sr-only">
          InstaPay QR code
        </h3>
        <div className="flex aspect-[640/834] w-full max-w-[300px] min-w-[260px] items-center justify-center overflow-hidden rounded-xl bg-white">
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element -- a data: URL from an authenticated Function
            <img src={qr.dataUrl} alt={`InstaPay QR code for ${qr.settings.accountName || WORKSPACE.company}`} className="size-full object-contain" />
          ) : qrError ? (
            <div className="flex flex-col items-center gap-2 p-4 text-center text-sm text-studio-ink-2">
              <p>{qrError}</p>
              <Button size="sm" icon={<RotateCw aria-hidden className="size-4" />} onClick={() => (setQrError(null), setQrTry((t) => t + 1))}>
                Try again
              </Button>
            </div>
          ) : (
            <LoaderCircle aria-label="Loading the QR code" className="size-6 animate-spin text-studio-ink-3" />
          )}
        </div>
        {qr && (
          <>
            <Button
              size="lg"
              icon={<Download aria-hidden className="size-4" />}
              className="w-full max-w-[300px]"
              onClick={async () => {
                const how = await saveQrImage(qr);
                if (how === "downloaded") toast.success("QR saved", { description: "Choose it from your banking app’s Scan QR screen." });
              }}
            >
              Save QR to Photos
            </Button>
            <dl className="flex w-full max-w-[300px] flex-col gap-0.5 text-center text-sm">
              <dt className="sr-only">Pay to</dt>
              <dd className="font-semibold">{qr.settings.accountName}</dd>
              <dt className="sr-only">Account</dt>
              <dd className="text-studio-ink-2 tabular-nums">
                {qr.settings.channelLabel}
                {qr.settings.accountLast4 ? ` · •••• ${qr.settings.accountLast4}` : ""}
              </dd>
            </dl>
            {qr.settings.instructions && <p className="max-w-[44ch] text-center text-2xs text-studio-ink-2">{qr.settings.instructions}</p>}
            <p className="text-2xs text-studio-ink-3">InstaPay transfer fees may apply.</p>
          </>
        )}
      </section>

      <ol className="flex flex-col gap-2.5 text-sm">
        {[
          <>Open your bank or e-wallet app (GCash, Maya or any bank) and scan the QR, or upload it from Photos through InstaPay.</>,
          <>
            Pay exactly <span className="font-semibold tabular-nums">{amountDue}</span>.
          </>,
          <>Come back here and submit your reference number and a screenshot of the receipt.</>,
        ].map((t, i) => (
          <li key={i} className="flex gap-3">
            <span aria-hidden className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-studio-raised text-2xs font-semibold tabular-nums">
              {i + 1}
            </span>
            <span className="pt-0.5 text-studio-ink-2">{t}</span>
          </li>
        ))}
      </ol>

      <form
        aria-labelledby={`${formId}-h`}
        className="flex flex-col gap-4 border-t border-studio-line pt-5"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        noValidate
      >
        <h3 id={`${formId}-h`} className="text-base font-semibold">
          I’ve paid
        </h3>
        <Field label="Reference number" error={tried && !refOk ? "Use the reference number from your receipt: 6 to 30 letters and numbers, no spaces." : null}>
          {(p) => <Input id={p.id} aria-describedby={p.describedBy} invalid={tried && !refOk} value={ref} onChange={(e) => setRef(e.target.value.replace(/\s+/g, ""))} autoComplete="off" autoCapitalize="characters" spellCheck={false} inputMode="text" className="font-mono tracking-wide uppercase" />}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Amount paid (₱)" error={tried && !amountOk ? "Enter the amount you sent." : null} hint={mismatch ? `The price is ${amountDue}. Send the difference, or explain it in your request note.` : undefined}>
            {(p) => <Input id={p.id} aria-describedby={p.describedBy} invalid={tried && !amountOk} value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} inputMode="decimal" className="tabular-nums" />}
          </Field>
          <Field label="When you paid" error={tried && !whenOk ? "Use the date and time on your receipt." : null}>
            {(p) => <Input id={p.id} aria-describedby={p.describedBy} invalid={tried && !whenOk} type="datetime-local" value={paidAt} max={localNow(new Date(now))} onChange={(e) => setPaidAt(e.target.value)} className="tabular-nums" />}
          </Field>
        </div>

        <Field label="Receipt screenshot" error={tried && !receiptOk ? "Add a screenshot of the receipt from your banking app." : null} hint="JPG, PNG, WebP or HEIC, up to 10 MB.">
          {(p) => (
            <div className="flex flex-col gap-2">
              <input ref={fileRef} id={p.id} aria-describedby={p.describedBy} type="file" accept={RECEIPT_TYPES} className="sr-only" onChange={(e) => pickReceipt(e.target.files?.[0] ?? null)} />
              <label
                htmlFor={p.id}
                className={cn(
                  "flex min-h-[88px] cursor-pointer items-center gap-3 rounded-xl border border-dashed px-3 py-3 transition-colors hover:bg-studio-raised focus-within:outline-2",
                  tried && !receiptOk ? "border-studio-danger" : "border-studio-line-strong",
                )}
              >
                {receiptUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- a local preview of the chosen file
                  <img src={receiptUrl} alt="" className="h-16 w-12 shrink-0 rounded-md object-cover" />
                ) : (
                  <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-lg bg-studio-raised">
                    <ImageUp aria-hidden className="size-5 text-studio-ink-2" />
                  </span>
                )}
                <span className="flex min-w-0 flex-col gap-0.5 text-sm">
                  <span className="truncate font-semibold">{receipt ? receipt.name : rejected && prev?.proofPath ? "Your previous receipt" : "Add the receipt"}</span>
                  <span className="text-2xs text-studio-ink-3">{receipt || (rejected && prev?.proofPath) ? "Tap to replace it" : "Tap to choose a screenshot"}</span>
                </span>
              </label>
            </div>
          )}
        </Field>

        {progress !== null && (
          <div className="flex flex-col gap-1">
            <div role="progressbar" aria-label="Uploading the receipt" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} className="h-1.5 overflow-hidden rounded-full bg-studio-raised">
              <div className="h-full rounded-full bg-studio-action transition-[width] duration-200" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-2xs text-studio-ink-3 tabular-nums">Uploading the receipt… {progress}%</p>
          </div>
        )}
        {error && (
          <p role="alert" className="rounded-lg bg-studio-danger-soft px-3 py-2 text-sm text-studio-danger-ink">
            {error}
          </p>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          {request.status === "pending_payment" ? (
            <Button
              size="lg"
              variant="danger-ghost"
              loading={cancelling}
              disabled={busy}
              onClick={async () => {
                setCancelling(true);
                const r = await onCancelRequest();
                setCancelling(false);
                if (!r.ok) setError(r.error);
              }}
            >
              Cancel request
            </Button>
          ) : (
            <span />
          )}
          <Button type="submit" size="lg" variant="primary" loading={busy} disabled={cancelling} className="sm:min-w-48">
            {busy ? (progress !== null && progress < 100 ? "Uploading" : "Submitting") : rejected ? "Resubmit payment" : "Submit payment"}
          </Button>
        </div>
      </form>
    </div>
  );
}
