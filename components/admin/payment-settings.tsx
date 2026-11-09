"use client";

import { ImageUp, Info, LoaderCircle, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getPaymentQr, getPaymentSettings, savePaymentSettings, uploadPaymentQr, type PaymentSettingsAdmin } from "@/lib/services/payments";
import { isFirebaseMode } from "@/lib/services/mode";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/controls";
import { Field, Input, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { PageHeader } from "./studio-shell";

type Form = { enabled: boolean; channelLabel: string; accountName: string; accountLast4: string; instructions: string };

/**
 * Payment settings: the InstaPay QR clients see after requesting a paid template,
 * the name and last 4 digits under it, the instructions, and the on/off switch
 * (off: the manual flow, "Payment details will be sent by email"). A full account
 * number is never stored. A new QR keeps the previous one, so a bad upload can be undone.
 * Also: this admin's own "email me about template requests".
 */
export function PaymentSettingsScreen() {
  const toast = useToast();
  const [loaded, setLoaded] = useState<PaymentSettingsAdmin | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [qr, setQr] = useState<{ path: string | null; url: string | null }>({ path: null, url: null });
  const [pendingQr, setPendingQr] = useState<{ path: string; url: string } | null>(null);
  const [uploading, setUploading] = useState<number | null>(null);
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reload, setReload] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isFirebaseMode) return;
    let live = true;
    void (async () => {
      const s = await getPaymentSettings();
      if (!live) return;
      if (!s.ok) return setLoadError(s.error);
      setLoaded(s.data);
      setForm({ enabled: s.data.enabled, channelLabel: s.data.channelLabel, accountName: s.data.accountName, accountLast4: s.data.accountLast4, instructions: s.data.instructions });
      if (s.data.qrStoragePath) {
        const q = await getPaymentQr({ path: s.data.qrStoragePath });
        if (live) setQr({ path: s.data.qrStoragePath, url: q.ok ? q.data.dataUrl : null });
      }
    })();
    return () => {
      live = false;
    };
  }, [reload]);

  if (!isFirebaseMode) {
    return (
      <div className="mx-auto flex max-w-[860px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
        <PageHeader title="Payment settings" description="The InstaPay QR clients pay with when they request a paid template." />
        <p className="rounded-xl bg-studio-raised px-4 py-3 text-sm text-studio-ink-2">QR payments work with the Firebase backend. In this demo, template requests use the manual flow: you send payment details by email.</p>
      </div>
    );
  }

  const set = (p: Partial<Form>) => setForm((f) => (f ? { ...f, ...p } : f));
  const last4Ok = !!form && /^\d{4}$/.test(form.accountLast4);
  const nameOk = !!form?.accountName.trim();
  const labelOk = !!form?.channelLabel.trim();
  const hasQr = !!(pendingQr || qr.path);
  const dirty =
    !!form && !!loaded &&
    (!!pendingQr || form.enabled !== loaded.enabled || form.channelLabel !== loaded.channelLabel || form.accountName !== loaded.accountName || form.accountLast4 !== loaded.accountLast4 || form.instructions !== loaded.instructions);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setUploading(0);
    const up = await uploadPaymentQr(file, setUploading);
    setUploading(null);
    if (!up.ok) return toast.error("The QR didn’t upload", { description: up.error });
    setPendingQr({ path: up.data.path, url: URL.createObjectURL(file) });
  };

  const restorePrevious = async () => {
    if (!loaded?.previousQrStoragePath) return;
    const q = await getPaymentQr({ path: loaded.previousQrStoragePath });
    if (!q.ok) return toast.error("Couldn’t load the previous QR", { description: q.error });
    setPendingQr({ path: loaded.previousQrStoragePath, url: q.data.dataUrl });
  };

  const save = async () => {
    setTried(true);
    if (!form || !last4Ok || !nameOk || !labelOk) return;
    if (form.enabled && !hasQr) return toast.error("Add the QR code first", { description: "Clients need it to pay. Upload it, then turn on QR payments." });
    setSaving(true);
    const r = await savePaymentSettings({ ...form, channelLabel: form.channelLabel.trim(), accountName: form.accountName.trim(), instructions: form.instructions.trim(), qrStoragePath: pendingQr?.path });
    setSaving(false);
    if (!r.ok) return toast.error("Payment settings weren’t saved", { description: r.error });
    toast.success("Payment settings saved", { description: form.enabled ? "Clients see this QR right after they request a paid template." : "QR payments are off: you send payment details by email." });
    setPendingQr(null);
    setTried(false);
    setReload((n) => n + 1);
  };

  const shownQr = pendingQr?.url ?? qr.url;

  return (
    <div className="mx-auto flex max-w-[860px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
      <PageHeader title="Payment settings" description="The InstaPay QR clients pay with when they request a paid template. They pay, send the reference number and a receipt, and you approve it in Template requests." />

      {loadError ? (
        <div className="flex flex-col items-start gap-3 rounded-xl bg-studio-danger-soft px-4 py-3 text-sm text-studio-danger-ink">
          <p>{loadError}</p>
          <Button size="sm" onClick={() => (setLoadError(null), setReload((n) => n + 1))}>
            Try again
          </Button>
        </div>
      ) : !form ? (
        <div aria-busy="true" aria-label="Loading payment settings" className="flex flex-col gap-3">
          <div className="skeleton h-[340px] rounded-2xl" />
          <div className="skeleton h-[220px] rounded-2xl" />
        </div>
      ) : (
        <>
          <section aria-labelledby="qr-h" className="grid gap-6 rounded-2xl border border-studio-line bg-studio-surface p-5 sm:grid-cols-[260px_1fr] sm:p-6">
            <div className="flex flex-col items-center gap-3">
              <div className="flex aspect-[640/834] w-full max-w-[260px] items-center justify-center overflow-hidden rounded-xl border border-studio-line bg-white">
                {shownQr ? (
                  // eslint-disable-next-line @next/next/no-img-element -- a data: URL or a local preview, never a public URL
                  <img src={shownQr} alt="The InstaPay QR clients will scan" className="size-full object-contain" />
                ) : qr.path ? (
                  <LoaderCircle aria-label="Loading the QR" className="size-6 animate-spin text-studio-ink-3" />
                ) : (
                  <span className="px-6 text-center text-sm text-studio-ink-3">No QR yet. Upload the one from your banking app.</span>
                )}
              </div>
              {pendingQr && <p className="text-2xs font-semibold text-studio-warn-ink">Not saved yet</p>}
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <h2 id="qr-h" className="text-base font-semibold">
                  QR code
                </h2>
                <p className="text-sm text-studio-ink-3">The InstaPay QR from your bank app (GoTyme: Receive → QR). JPG, PNG or WebP up to 5 MB. Clients only ever see it inside their signed-in portal, never as a public link.</p>
              </div>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label="Upload a new QR code" onChange={(e) => void pick(e.target.files?.[0])} />
              <div className="flex flex-wrap gap-2">
                <Button icon={<ImageUp aria-hidden className="size-4" />} loading={uploading !== null} onClick={() => fileRef.current?.click()}>
                  {uploading !== null ? `Uploading ${uploading}%` : hasQr ? "Replace QR" : "Upload QR"}
                </Button>
                {pendingQr ? (
                  <Button variant="ghost" onClick={() => setPendingQr(null)}>
                    Discard new QR
                  </Button>
                ) : (
                  loaded?.previousQrStoragePath && (
                    <Button variant="ghost" icon={<RotateCcw aria-hidden className="size-4" />} onClick={() => void restorePrevious()}>
                      Restore previous QR
                    </Button>
                  )
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Bank or channel" error={tried && !labelOk ? "Add the bank or channel." : null}>
                  {(p) => <Input id={p.id} aria-describedby={p.describedBy} invalid={tried && !labelOk} value={form.channelLabel} maxLength={60} onChange={(e) => set({ channelLabel: e.target.value })} />}
                </Field>
                <Field label="Account name" error={tried && !nameOk ? "Add the name on the account." : null}>
                  {(p) => <Input id={p.id} aria-describedby={p.describedBy} invalid={tried && !nameOk} value={form.accountName} maxLength={80} onChange={(e) => set({ accountName: e.target.value })} />}
                </Field>
                <Field label="Last 4 digits of the account" error={tried && !last4Ok ? "Enter the last 4 digits only." : null} hint="Shown as •••• 2311. Never enter the full number.">
                  {(p) => <Input id={p.id} aria-describedby={p.describedBy} invalid={tried && !last4Ok} value={form.accountLast4} inputMode="numeric" maxLength={4} onChange={(e) => set({ accountLast4: e.target.value.replace(/\D/g, "").slice(0, 4) })} className="w-32 tabular-nums" />}
                </Field>
              </div>
              <Field label="Payment instructions" optional hint="Shown under the QR. “InstaPay transfer fees may apply.” is always added.">
                {(p) => <Textarea id={p.id} aria-describedby={p.describedBy} rows={3} maxLength={600} value={form.instructions} onChange={(e) => set({ instructions: e.target.value })} />}
              </Field>
            </div>
          </section>

          <section className="flex flex-col gap-3 rounded-2xl border border-studio-line bg-studio-surface p-5 sm:p-6">
            <Toggle
              checked={form.enabled}
              onCheckedChange={(v) => set({ enabled: v })}
              label="Accept QR payments"
              description={
                form.enabled
                  ? "Clients see this QR as soon as they request a paid template, pay, and send you their reference number and receipt."
                  : "Off: clients see “Payment details will be sent by email”, and you send them from Template requests."
              }
            />
            {form.enabled && !hasQr && (
              <p className={cn("flex gap-2 rounded-lg px-3 py-2 text-sm", tried ? "bg-studio-danger-soft text-studio-danger-ink" : "bg-studio-raised text-studio-ink-2")}>
                <Info aria-hidden className="mt-0.5 size-4 shrink-0" /> Upload the QR before turning this on.
              </p>
            )}
          </section>

          <div className="sticky bottom-3 z-10 flex items-center justify-end gap-3 rounded-xl border border-studio-line bg-studio-surface/95 px-3 py-2 shadow-[0_8px_24px_-12px_rgb(0_0_0/0.3)] backdrop-blur-sm">
            <span className="mr-auto pl-1 text-sm text-studio-ink-3">{dirty ? "Unsaved changes" : "All changes saved"}</span>
            <Button variant="primary" loading={saving} disabled={!dirty} onClick={() => void save()}>
              Save payment settings
            </Button>
          </div>

          <NotifyMe />
        </>
      )}
    </div>
  );
}

/** This admin's own email preference for template requests (admins/{uid}.notify.templateRequests). */
function NotifyMe() {
  const toast = useToast();
  const [on, setOn] = useState<boolean | null>(null);
  useEffect(() => {
    let live = true;
    void (async () => {
      const [{ firebaseAuth, firestore }, fs] = await Promise.all([import("@/lib/firebase/client"), import("firebase/firestore")]);
      const uid = firebaseAuth().currentUser?.uid;
      if (!uid) return;
      const d = await fs.getDoc(fs.doc(firestore(), "admins", uid)).catch(() => null);
      if (live) setOn(d?.get("notify.templateRequests") !== false);
    })();
    return () => {
      live = false;
    };
  }, []);
  if (on === null) return null;
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-studio-line bg-studio-surface p-5 sm:p-6">
      <Toggle
        checked={on}
        label="Email me about template requests"
        description="A new request, and each payment a client submits for you to verify. Every admin chooses for themselves."
        onCheckedChange={async (v) => {
          setOn(v);
          const [{ firebaseAuth, firestore }, fs] = await Promise.all([import("@/lib/firebase/client"), import("firebase/firestore")]);
          const uid = firebaseAuth().currentUser?.uid;
          if (!uid) return;
          try {
            await fs.updateDoc(fs.doc(firestore(), "admins", uid), { notify: { templateRequests: v }, updatedAt: fs.serverTimestamp() });
            toast.success(v ? "You’ll get request emails" : "Request emails are off for you");
          } catch {
            setOn(!v);
            toast.error("That didn’t save", { description: "Check your connection and try again." });
          }
        }}
      />
    </section>
  );
}
