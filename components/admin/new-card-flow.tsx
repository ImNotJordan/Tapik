"use client";

/* eslint-disable @next/next/no-img-element -- previews of local uploads (data URLs) */
import { brandUrl } from "@/lib/brand";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, CircleAlert, Clock, Gift, Link2, Send, ShieldCheck, Trash2, Wallet, Zap } from "lucide-react";
import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { type UploadKind, uploadImage } from "@/lib/services/cards";
import { type Created, createClientCard } from "@/lib/services/clients";
import { useDB } from "@/lib/services/data";
import { inviteUrl, saveInviteDraft, sendInvite } from "@/lib/services/invites";
import { pricingOf, toggleFavoriteTemplate } from "@/lib/services/templates";
import { isEmailEnabled } from "@/lib/services/mode";
import { sampleBundle } from "@/lib/mock";
import { PRICING, formatPeso } from "@/lib/pricing";
import { templatePricing } from "@/lib/entitlements";
import type { Card, CardBundle, CardPermissions } from "@/lib/types";
import { cn, uid } from "@/lib/utils";
import { validateEmail, validatePhone, validateRequired } from "@/lib/validate";
import { Button, LinkButton } from "@/components/ui/button";
import { DevicePreview } from "@/components/ui/device-preview";
import { Dropzone, useUploadQueue } from "@/components/ui/dropzone";
import { Field, Input, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { CardRenderer } from "@/components/card/card-renderer";
import { EmailPreview, InviteEmailBody } from "@/components/email/email-preview";
import { AccessBadge } from "@/components/templates/access-badge";
import { Badge } from "@/components/ui/controls";
import { TemplateBrowser } from "@/components/templates/template-browser";
import { itemLook, templateItems } from "@/components/templates/template-items";
import { PageHeader } from "./studio-shell";

type Step = "client" | "template" | "content" | "invite";
const STEPS: { id: Step; label: string }[] = [
  { id: "client", label: "Client details" },
  { id: "template", label: "Template" },
  { id: "content", label: "Starter content" },
  { id: "invite", label: "Invite" },
];
const DEFAULT_SUBJECT = "Your digital business card is ready to edit";

/**
 * "New card for client": client details, template, optional starter content,
 * then the invite email. Nothing is created until the last step's action.
 */
export function NewCardFlow() {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const { db, hydrated } = useDB();
  const lib = db.library;
  const items = useMemo(() => templateItems(lib).filter((i) => !lib.disabledTemplates.includes(i.manifest.id)), [lib]);

  const initialStep = STEPS.find((s) => s.id === params.get("step"))?.id ?? "client";
  const [step, setStep] = useState<Step>(initialStep);
  const index = STEPS.findIndex((s) => s.id === step);
  const [reached, setReached] = useState(index);

  // The Default template is preselected unless the link names one (?template=).
  const [pickedKey, setPickedKey] = useState<string | null>(params.get("template"));
  const defaultItem = items.find((i) => i.key === lib.defaultTemplateId) ?? items[0];
  const item = items.find((i) => i.key === pickedKey) ?? defaultItem;
  const pricing = pricingOf(db);
  const itemPrice = templatePricing(item.manifest.id, pricing);
  const paid = itemPrice.tier === "paid";
  /** For a paid template: unlock it now (paid upfront or comped), or start the card on the Default. */
  const [unlock, setUnlock] = useState<UnlockChoice>({ mode: null, how: "paid", reference: "", reason: "" });
  const [unlockTried, setUnlockTried] = useState(false);
  const pick = (key: string) => {
    if (key !== item.key) {
      setUnlock({ mode: null, how: "paid", reference: "", reason: "" });
      setUnlockTried(false);
    }
    setPickedKey(key);
  };
  const startOnDefault = paid && unlock.mode === "default";
  // The template the card is created on.
  const cardItem = startOnDefault ? defaultItem : item;
  const look = itemLook(cardItem);
  const usageMap = useMemo(() => {
    const m = new Map<string, number>();
    db.cards.forEach((c) => m.set(c.templateId, (m.get(c.templateId) ?? 0) + 1));
    return m;
  }, [db.cards]);
  const usage = useCallback((id: string) => usageMap.get(id) ?? 0, [usageMap]);

  /* Step 1 */
  const [client, setClient] = useState({ name: "", email: "", phone: "", company: "" });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [tried, setTried] = useState(false);
  const checks = {
    name: validateRequired(client.name, "The client’s name"),
    email: client.email.trim() ? validateEmail(client.email) : ({ ok: false, message: "Add the client’s email. The invite goes there." } as const),
    phone: validatePhone(client.phone),
  };
  const err = (k: keyof typeof checks) => ((touched[k] || tried) && !checks[k].ok ? (checks[k] as { message: string }).message : null);

  /* Step 3: card fields start from step 1 until the admin edits them. */
  const [starter, setStarter] = useState<{ title: string; name?: string; phone?: string; email?: string; company?: string }>({ title: "" });
  const [media, setMedia] = useState<{ logoUrl?: string; agentPhotoUrl?: string; backgroundPhotoUrl?: string }>({});
  const cardName = starter.name ?? client.name;
  const cardPhone = starter.phone ?? client.phone;
  const cardEmail = starter.email ?? client.email;
  const cardCompany = starter.company ?? client.company;
  const cardPhoneCheck = validatePhone(cardPhone);
  const cardEmailCheck = validateEmail(cardEmail);

  /* Step 4 */
  const [permissions, setPermissions] = useState<CardPermissions>({ clientCanPublish: false, requireReview: true });
  const [subject, setSubject] = useState(DEFAULT_SUBJECT);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<null | "email" | "link" | "draft">(null);
  const [announce, setAnnounce] = useState("");
  const created = useRef<Created | null>(null);
  // Reserved now so photos added in step 3 upload straight into this card's folder.
  const [newCardId] = useState(() => uid("card"));

  const go = (next: Step) => {
    const i = STEPS.findIndex((s) => s.id === next);
    setStep(next);
    setReached((r) => Math.max(r, i));
    requestAnimationFrame(() => document.getElementById("step-heading")?.focus());
  };

  const next = () => {
    if (step === "client") {
      setTried(true);
      const first = (["name", "email", "phone"] as const).find((k) => !checks[k].ok);
      if (first) {
        document.getElementById(`nc-${first}`)?.focus();
        return;
      }
      if (checks.phone.ok && checks.phone.value) setClient((c) => ({ ...c, phone: (checks.phone as { value: string }).value }));
      go("template");
    } else if (step === "template") {
      if (paid && !unlock.mode) {
        setUnlockTried(true);
        requestAnimationFrame(() => document.getElementById("nc-unlock-now")?.focus());
        return;
      }
      go("content");
    }
    else if (step === "content") {
      if (!cardName.trim()) return document.getElementById("nc-card-name")?.focus();
      if (!cardPhoneCheck.ok) return document.getElementById("nc-card-phone")?.focus();
      if (!cardEmailCheck.ok) return document.getElementById("nc-card-email")?.focus();
      go("invite");
    }
  };

  const back = () => index > 0 && go(STEPS[index - 1].id);

  /** Creates the client, card and draft invite once (with "Unlock now" if chosen); later actions reuse them. */
  const ensureCreated = async (): Promise<Created | null> => {
    if (created.current) return created.current;
    // Card fields the admin changed in step 3 (they start as the client's details).
    const cardPatch: Partial<Pick<Card, "name" | "phone" | "email" | "company">> = {};
    if (cardName.trim() && cardName.trim() !== client.name.trim()) cardPatch.name = cardName.trim();
    if (starter.phone !== undefined) cardPatch.phone = cardPhoneCheck.ok ? cardPhoneCheck.value || undefined : undefined;
    if (starter.email !== undefined) cardPatch.email = cardEmailCheck.ok ? cardEmailCheck.value || undefined : undefined;
    if (starter.company !== undefined) cardPatch.company = cardCompany.trim() || undefined;
    const res = await createClientCard({
      client: {
        name: client.name.trim(),
        email: (checks.email as { value: string }).value ?? client.email.trim(),
        phone: checks.phone.ok ? checks.phone.value || undefined : undefined,
        company: client.company.trim() || undefined,
      },
      look,
      starter: { title: starter.title.trim() || undefined, ...media },
      permissions,
      cardId: newCardId,
      cardPatch,
      unlock:
        paid && unlock.mode === "unlock"
          ? { templateId: item.manifest.id, paid: unlock.how === "paid", reference: unlock.how === "paid" ? unlock.reference : undefined, reason: unlock.how === "paid" ? undefined : unlock.reason }
          : undefined,
      invite: { subject, message },
    });
    if (!res.ok) {
      toast.error("The card wasn’t created", { description: res.error });
      return null;
    }
    if (res.data.unlockError) {
      toast.error(`${item.name} wasn’t unlocked`, { description: `${res.data.unlockError} The card was created; unlock it from the card’s Design tab.` });
    }
    created.current = res.data;
    return created.current;
  };

  const finish = async (mode: "email" | "link" | "draft") => {
    setBusy(mode);
    const made = await ensureCreated();
    if (!made) {
      setBusy(null);
      return;
    }
    const c = { id: made.clientId, name: made.clientName, email: made.clientEmail };
    if (mode === "draft") {
      saveInviteDraft(made.inviteId, subject, message);
      toast.success("Saved as a draft invite", { description: `${c.name}’s card is ready. Send the invite from Clients when you’re ready.` });
      router.push(`/admin/clients?client=${c.id}`);
      return;
    }
    setAnnounce(mode === "email" ? "Sending the invite" : "Creating the link");
    const res = await sendInvite(made.inviteId, { subject, message, channel: mode });
    if (!res.ok) {
      setBusy(null);
      setAnnounce("");
      toast.error(mode === "email" ? "The invite wasn’t sent" : "The link couldn’t be created", { description: res.error });
      return;
    }
    if (mode === "email") {
      setAnnounce(`Invite sent to ${c.email}`);
      toast.success("Invite sent", { description: `${c.name} gets an email at ${c.email}. The link works for ${PRICING.inviteValidDays} days.` });
    } else {
      const url = inviteUrl(res.data.token);
      let copied = false;
      try {
        await navigator.clipboard.writeText(url);
        copied = true;
      } catch {
        /* clipboard blocked: the link is still on the client's page */
      }
      setAnnounce(copied ? "Invite link copied" : "Invite link created");
      toast.success(copied ? "Invite link copied" : "Invite link created", {
        description: copied ? `Paste it in Viber, Messenger or a text to ${c.name}. It works for ${PRICING.inviteValidDays} days.` : "Copy it from the client’s details.",
      });
    }
    router.push(`/admin/clients?client=${c.id}`);
  };

  /* Preview of the card as it will be created */
  const sample = useMemo(() => sampleBundle(), []);
  const previewPhone = cardPhoneCheck.ok && cardPhoneCheck.value ? cardPhoneCheck.value : "+63 900 000 0000";
  const previewEmail = cardEmailCheck.ok && cardEmailCheck.value ? cardEmailCheck.value : undefined;
  // Plain derivation; the React Compiler memoizes it.
  const previewBundle = ((): CardBundle => {
    const base = { ...sample, photos: [], socials: [], orgMembers: [], orgChart: undefined };
    return {
      ...base,
      card: {
        ...base.card,
        ...look,
        sectionOrder: item.manifest.defaultSectionOrder,
        name: cardName.trim() || "Client name",
        title: starter.title.trim() || undefined,
        company: cardCompany.trim() || undefined,
        credential: undefined,
        quote: undefined,
        description: undefined,
        address: undefined,
        agentPhotoUrl: media.agentPhotoUrl,
        backgroundPhotoUrl: media.backgroundPhotoUrl,
        logoUrl: media.logoUrl,
        logoDarkUrl: undefined,
        phone: previewPhone,
        email: previewEmail,
        messageChannel: "sms",
      },
    };
  })();

  const [expires] = useState(() => new Date(Date.now() + PRICING.inviteValidDays * 86_400_000).toISOString());

  return (
    <div className="mx-auto flex max-w-[1240px] flex-col gap-6 px-4 py-6 pb-28 sm:px-6 lg:px-10 lg:pt-10 lg:pb-28">
      <PageHeader title="New card for a client" description="Set up the card, then invite the client to finish it themselves." actions={<LinkButton href="/admin">Cancel</LinkButton>} />

      <Stepper index={index} reached={reached} onGo={go} />

      <p aria-live="polite" className="sr-only">
        {announce}
      </p>

      <h2 id="step-heading" tabIndex={-1} className="text-lg font-semibold tracking-[-0.01em] focus:outline-none">
        {STEPS[index].label}
      </h2>

      {step === "client" && (
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            next();
          }}
          className="flex max-w-xl flex-col gap-5 rounded-2xl border border-studio-line bg-studio-surface p-5 sm:p-6"
        >
          <p className="text-sm text-studio-ink-2">Who is this card for? The invite goes to their email; nothing is sent until the last step.</p>
          <Field id="nc-name" label="Client’s full name" error={err("name")}>
            {(p) => (
              <Input id={p.id} aria-describedby={p.describedBy} invalid={p.invalid} autoComplete="off" value={client.name} onChange={(e) => setClient({ ...client, name: e.target.value })} onBlur={() => setTouched({ ...touched, name: true })} placeholder="e.g. Carmela Reyes-Tan" />
            )}
          </Field>
          <Field id="nc-email" label="Email" error={err("email")} hint="The invite link is sent here. It’s also how they sign in.">
            {(p) => (
              <Input id={p.id} aria-describedby={p.describedBy} invalid={p.invalid} type="email" autoComplete="off" value={client.email} onChange={(e) => setClient({ ...client, email: e.target.value })} onBlur={() => setTouched({ ...touched, email: true })} placeholder="name@company.ph" />
            )}
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="nc-phone" label="Mobile number" optional error={err("phone")}>
              {(p) => (
                <Input
                  id={p.id}
                  aria-describedby={p.describedBy}
                  invalid={p.invalid}
                  inputMode="tel"
                  autoComplete="off"
                  value={client.phone}
                  onChange={(e) => setClient({ ...client, phone: e.target.value })}
                  onBlur={() => {
                    setTouched({ ...touched, phone: true });
                    if (checks.phone.ok && checks.phone.value) setClient((c) => ({ ...c, phone: (checks.phone as { value: string }).value }));
                  }}
                  placeholder="0917 555 0142"
                  className="tabular-nums"
                />
              )}
            </Field>
            <Field id="nc-company" label="Company" optional>
              {(p) => <Input id={p.id} autoComplete="off" value={client.company} onChange={(e) => setClient({ ...client, company: e.target.value })} placeholder="e.g. Tan & Ocampo Realty" />}
            </Field>
          </div>
          <button type="submit" hidden />
        </form>
      )}

      {step === "template" && (
        <div className="flex flex-col gap-4">
          <p className="max-w-2xl text-sm text-studio-ink-2">
            <span className="font-semibold text-studio-ink">{defaultItem.name}</span> is the Default and free. Other templates have a one-time price per card: unlock one now, or start on the Default and let the client request it later. Themes and colors are always free.
          </p>
          <TemplateBrowser items={items} selectedKey={item.key} onSelect={pick} favorites={lib.favoriteTemplates} onToggleFavorite={toggleFavoriteTemplate} usage={usage} loading={!hydrated} pricing={pricing} />
          {paid && hydrated && <UnlockChoicePanel name={item.name} price={itemPrice.price ?? 0} defaultName={defaultItem.name} value={unlock} onChange={setUnlock} error={unlockTried && !unlock.mode} />}
        </div>
      )}

      {step === "content" && (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,480px)_minmax(0,1fr)]">
          <div className="flex flex-col gap-5 rounded-2xl border border-studio-line bg-studio-surface p-5 sm:p-6">
            <p className="text-sm text-studio-ink-2">Optional. Anything you leave empty, {client.name.trim().split(" ")[0] || "the client"} can fill in from their portal.</p>
            <Field id="nc-card-name" label="Name on the card" error={cardName.trim() ? null : "The card needs a name."}>
              {(p) => <Input id={p.id} aria-describedby={p.describedBy} invalid={p.invalid} value={cardName} onChange={(e) => setStarter({ ...starter, name: e.target.value })} />}
            </Field>
            <Field id="nc-title" label="Title or position" optional>
              {(p) => <Input id={p.id} value={starter.title} onChange={(e) => setStarter({ ...starter, title: e.target.value })} placeholder="e.g. Licensed Real Estate Broker" />}
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="nc-card-phone" label="Phone on the card" optional error={cardPhoneCheck.ok ? null : cardPhoneCheck.message}>
                {(p) => <Input id={p.id} aria-describedby={p.describedBy} invalid={p.invalid} inputMode="tel" className="tabular-nums" value={cardPhone} onChange={(e) => setStarter({ ...starter, phone: e.target.value })} />}
              </Field>
              <Field id="nc-card-email" label="Email on the card" optional error={cardEmailCheck.ok ? null : cardEmailCheck.message}>
                {(p) => <Input id={p.id} aria-describedby={p.describedBy} invalid={p.invalid} type="email" value={cardEmail} onChange={(e) => setStarter({ ...starter, email: e.target.value })} />}
              </Field>
            </div>
            <Field id="nc-card-company" label="Company on the card" optional>
              {(p) => <Input id={p.id} value={cardCompany} onChange={(e) => setStarter({ ...starter, company: e.target.value })} />}
            </Field>

            <div className="flex flex-col gap-1 border-t border-studio-line pt-5">
              <p className="text-sm font-semibold">Photos</p>
              <p className="text-2xs text-studio-ink-3">JPG, PNG or WebP, up to 15 MB. Or leave them for the client.</p>
            </div>
            <UploadSlot cardId={newCardId} kind="agent-photo" label="Client’s photo" url={media.agentPhotoUrl} onChange={(u) => setMedia((m) => ({ ...m, agentPhotoUrl: u }))} />
            <UploadSlot cardId={newCardId} kind="background-photo" label="Cover photo" url={media.backgroundPhotoUrl} onChange={(u) => setMedia((m) => ({ ...m, backgroundPhotoUrl: u }))} wide />
            <UploadSlot cardId={newCardId} kind="logo" label="Logo" url={media.logoUrl} onChange={(u) => setMedia((m) => ({ ...m, logoUrl: u }))} accept="image/*" />
          </div>
          <div className="hidden min-h-[640px] flex-col items-center gap-3 rounded-2xl bg-studio-sunken p-6 lg:flex">
            <p className="self-start text-2xs font-semibold text-studio-ink-3">
              Preview · {cardItem.name}
            </p>
            <DevicePreview device="phone">
              <CardRenderer bundle={previewBundle} mode="preview" viewportHeight="844px" />
            </DevicePreview>
          </div>
        </div>
      )}

      {step === "invite" && (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:items-start">
          <div className="flex flex-col gap-6">
            <TemplateSummary name={item.name} defaultName={defaultItem.name} price={itemPrice.price ?? 0} paid={paid} isDefault={!!itemPrice.isDefault} choice={unlock} onChange={() => go("template")} />
            <fieldset className="flex flex-col gap-2.5">
              <legend className="pb-2.5 text-sm font-semibold">When {client.name.trim().split(" ")[0] || "the client"} edits the card</legend>
              <PermissionOption
                checked={permissions.requireReview}
                onSelect={() => setPermissions({ clientCanPublish: false, requireReview: true })}
                icon={<ShieldCheck aria-hidden className="size-5" />}
                title="Changes need my review"
                body="Edits are saved as a draft. You approve them before they go live."
              />
              <PermissionOption
                checked={permissions.clientCanPublish}
                onSelect={() => setPermissions({ clientCanPublish: true, requireReview: false })}
                icon={<Zap aria-hidden className="size-5" />}
                title="Client can publish changes directly"
                body="Edits go live when they press Publish. You can change this later."
              />
            </fieldset>

            <div className="flex flex-col gap-4 border-t border-studio-line pt-6">
              <Field label="Subject" error={subject.trim() ? null : "Add a subject so the email isn’t mistaken for spam."}>
                {(p) => <Input id={p.id} aria-describedby={p.describedBy} invalid={p.invalid} value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={120} />}
              </Field>
              <Field label="Personal message" optional hint="Shown above the button, in your words." counter={{ value: message.length, max: 500 }}>
                {(p) => <Textarea id={p.id} aria-describedby={p.describedBy} rows={4} value={message} onChange={(e) => setMessage(e.target.value.slice(0, 500))} placeholder={`e.g. Hi ${client.name.trim().split(" ")[0] || "there"}! Your card is set up. Add your photo and socials whenever you’re ready.`} />}
              </Field>
            </div>

            <div className="flex flex-col gap-2 border-t border-studio-line pt-6">
              {isEmailEnabled ? (
                <>
                  <Button variant="primary" size="lg" loading={busy === "email"} disabled={!!busy || !subject.trim()} onClick={() => finish("email")} icon={<Send aria-hidden className="size-4" />}>
                    {busy === "email" ? "Sending invite" : "Send invite"}
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button size="lg" loading={busy === "link"} disabled={!!busy} onClick={() => finish("link")} icon={<Link2 aria-hidden className="size-4" />}>
                      Copy link instead
                    </Button>
                    <Button size="lg" loading={busy === "draft"} disabled={!!busy} onClick={() => finish("draft")} icon={<Clock aria-hidden className="size-4" />}>
                      Send later
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <Button variant="primary" size="lg" loading={busy === "link"} disabled={!!busy} onClick={() => finish("link")} icon={<Link2 aria-hidden className="size-4" />}>
                    {busy === "link" ? "Creating the link" : "Copy invite link"}
                  </Button>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button size="lg" disabled aria-describedby="email-soon" icon={<Send aria-hidden className="size-4" />} className="justify-center">
                      <span className="flex items-center gap-2">
                        Send by email
                        <Badge tone="neutral" className="h-5 px-1.5">Coming soon</Badge>
                      </span>
                    </Button>
                    <Button size="lg" loading={busy === "draft"} disabled={!!busy} onClick={() => finish("draft")} icon={<Clock aria-hidden className="size-4" />}>
                      Send later
                    </Button>
                  </div>
                </>
              )}
              <p id="email-soon" className="text-2xs text-studio-ink-3">
                {isEmailEnabled
                  ? `“Send later” keeps the invite as a draft in Clients. The link is unique to this client and works for ${PRICING.inviteValidDays} days.`
                  : `Sending invites by email is coming soon. For now, copy the link and send it by Viber, Messenger or text. It’s unique to this client and works for ${PRICING.inviteValidDays} days. “Send later” keeps the invite as a draft in Clients.`}
              </p>
            </div>
          </div>

          <EmailPreview to={{ name: client.name.trim() || "Client", email: client.email.trim() || "client@email.ph" }} subject={subject}>
            <InviteEmailBody clientName={client.name.trim() || "there"} message={message} link={brandUrl("/invite/•••••••")} expiresAt={expires} />
          </EmailPreview>
        </div>
      )}

      {/* Back / Next */}
      {step !== "invite" ? (
        <div className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-between gap-3 border-t border-studio-line bg-studio-bg/95 px-4 py-3 backdrop-blur sm:px-6 lg:left-60 lg:px-10">
          {index > 0 ? (
            <Button size="lg" onClick={back} icon={<ArrowLeft aria-hidden className="size-4" />}>
              Back
            </Button>
          ) : (
            <span />
          )}
          <div className="flex min-w-0 items-center gap-3">
            {step === "template" && (
              <p className="hidden min-w-0 flex-col text-sm leading-tight text-studio-ink-2 sm:flex md:block md:truncate">
                <span className="truncate">
                  <span className="font-semibold text-studio-ink">{item.name}</span> · {paid ? formatPeso(itemPrice.price ?? 0) : itemPrice.isDefault ? "Free · Default" : "Free"}
                </span>
                {paid && (
                  <span className="truncate text-2xs md:text-sm">
                    <span className="md:hidden"> </span>
                    <span className="hidden md:inline"> · </span>
                    {unlock.mode === "unlock" ? (unlock.how === "paid" ? "Unlock now, paid" : "Unlock now, comped") : unlock.mode === "default" ? "Start on Default" : "Choose below the grid"}
                  </span>
                )}
              </p>
            )}
            <Button variant="primary" size="lg" onClick={next} disabled={step === "template" && !hydrated}>
              {step === "template" ? "Use this template" : step === "content" ? "Next: invite" : "Next"}
              <ArrowRight aria-hidden className="size-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <Button size="lg" onClick={back} disabled={!!busy} icon={<ArrowLeft aria-hidden className="size-4" />}>
            Back
          </Button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ Pieces */

type UnlockChoice = { mode: "unlock" | "default" | null; how: "paid" | "comp"; reference: string; reason: string };

/** Shown under the grid when the picked template is paid. Nothing is preselected: it's a money decision. */
function UnlockChoicePanel({ name, price, defaultName, value, onChange, error }: { name: string; price: number; defaultName: string; value: UnlockChoice; onChange: (v: UnlockChoice) => void; error: boolean }) {
  const set = (p: Partial<UnlockChoice>) => onChange({ ...value, ...p });
  return (
    <fieldset aria-describedby={error ? "nc-unlock-err" : undefined} className="flex max-w-2xl flex-col gap-2.5 rounded-2xl border border-studio-line bg-studio-surface p-4 sm:p-5">
      <legend className="sr-only">{name} is a paid template</legend>
      <p aria-hidden className="flex flex-wrap items-center gap-2 text-sm font-semibold">
        {name} is a paid template
        <AccessBadge state="locked" pricing={{ templateId: name, tier: "paid", price, isDefault: false }} admin />
      </p>
      {error && (
        <p id="nc-unlock-err" role="alert" className="flex items-center gap-1.5 text-2xs font-medium text-studio-danger-ink">
          <CircleAlert aria-hidden className="size-3.5" />
          Choose one to continue.
        </p>
      )}
      <ChoiceRow id="nc-unlock-now" name="nc-unlock" checked={value.mode === "unlock"} onSelect={() => set({ mode: "unlock" })} title={`Unlock ${name} now`} body={`The card starts on ${name}. ${formatPeso(price)}, one time, for this card.`} />
      {value.mode === "unlock" && (
        <div className="ml-4 flex flex-col gap-3 border-l-2 border-studio-line pl-4 sm:ml-6">
          <div role="radiogroup" aria-label="How it’s unlocked" className="grid gap-2 sm:grid-cols-2">
            <SmallChoice checked={value.how === "paid"} onSelect={() => set({ how: "paid" })} icon={<Wallet aria-hidden className="size-4" />} label="Paid upfront" />
            <SmallChoice checked={value.how === "comp"} onSelect={() => set({ how: "comp" })} icon={<Gift aria-hidden className="size-4" />} label="Comp it (free)" />
          </div>
          {value.how === "paid" ? (
            <Field label="Payment reference" optional hint="GCash, Maya or bank reference number, for your records.">
              {(p) => <Input id={p.id} aria-describedby={p.describedBy} value={value.reference} onChange={(e) => set({ reference: e.target.value })} placeholder="e.g. GCash 7781 2203 9915" />}
            </Field>
          ) : (
            <Field label="Reason" optional hint="Kept in the client’s history.">
              {(p) => <Input id={p.id} aria-describedby={p.describedBy} value={value.reason} onChange={(e) => set({ reason: e.target.value })} placeholder="e.g. Launch promo, VIP client" />}
            </Field>
          )}
        </div>
      )}
      <ChoiceRow name="nc-unlock" checked={value.mode === "default"} onSelect={() => set({ mode: "default" })} title={`Start on ${defaultName}`} body={`Free. The client can request ${name} later from their portal.`} />
    </fieldset>
  );
}

function ChoiceRow({ id, name, checked, onSelect, title, body }: { id?: string; name: string; checked: boolean; onSelect: () => void; title: string; body: string }) {
  return (
    <label
      className={cn(
        "flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-[border-color,box-shadow] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-studio-focus",
        checked ? "border-studio-action shadow-[0_0_0_1px_var(--studio-action)]" : "border-studio-line hover:border-studio-line-strong",
      )}
    >
      <input id={id} type="radio" name={name} checked={checked} onChange={onSelect} className="mt-0.5 size-[18px] shrink-0 accent-[var(--studio-action)]" />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-sm font-semibold">{title}</span>
        <span className="text-2xs text-studio-ink-3">{body}</span>
      </span>
    </label>
  );
}

function SmallChoice({ checked, onSelect, icon, label }: { checked: boolean; onSelect: () => void; icon: ReactNode; label: string }) {
  return (
    <label
      className={cn(
        "flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg border px-3 text-sm font-medium has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-studio-focus",
        checked ? "border-studio-action bg-studio-action-soft text-studio-action-ink" : "border-studio-line-strong text-studio-ink-2 hover:border-studio-ink-3",
      )}
    >
      <input type="radio" name="nc-unlock-how" checked={checked} onChange={onSelect} className="sr-only" />
      {icon}
      {label}
      {checked && <Check aria-hidden className="ml-auto size-4" strokeWidth={2.5} />}
    </label>
  );
}

/** Step 4: what the card starts on, and how a paid template was handled. */
function TemplateSummary({ name, defaultName, price, paid, isDefault, choice, onChange }: { name: string; defaultName: string; price: number; paid: boolean; isDefault: boolean; choice: UnlockChoice; onChange: () => void }) {
  const line = !paid
    ? `${name} · ${isDefault ? "Free · Default" : "Free"}`
    : choice.mode === "default"
      ? `${defaultName} (Default, free). The client can request ${name} later.`
      : choice.how === "paid"
        ? `${name} · ${formatPeso(price)}, unlocked now, paid upfront${choice.reference.trim() ? ` (ref. ${choice.reference.trim()})` : ""}`
        : `${name} · unlocked now, comped${choice.reason.trim() ? `: ${choice.reason.trim()}` : ""}`;
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-studio-line bg-studio-surface px-4 py-3">
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="text-2xs font-semibold text-studio-ink-3">Template</p>
        <p className="text-sm [overflow-wrap:anywhere]">{line}</p>
      </div>
      <Button variant="ghost" size="sm" onClick={onChange} className="h-11 shrink-0" aria-label="Change template">
        Change
      </Button>
    </div>
  );
}

function Stepper({ index, reached, onGo }: { index: number; reached: number; onGo: (s: Step) => void }) {
  return (
    <nav aria-label="Progress" className="flex flex-col gap-3">
      <p className="text-sm text-studio-ink-3 sm:hidden">
        Step {index + 1} of {STEPS.length}
      </p>
      <div aria-hidden className="h-1 overflow-hidden rounded-full bg-studio-line sm:hidden">
        <div className="h-full rounded-full bg-studio-action transition-[width] duration-300" style={{ width: `${((index + 1) / STEPS.length) * 100}%` }} />
      </div>
      <ol className="flex gap-1.5 sm:gap-2">
        {STEPS.map((s, i) => {
          const done = i < index;
          const current = i === index;
          const reachable = i <= reached && !current;
          const body = (
            <>
              <span
                className={cn(
                  "inline-flex size-7 shrink-0 items-center justify-center rounded-full text-2xs font-semibold tabular-nums",
                  current ? "bg-studio-action text-studio-on-action" : done ? "bg-studio-action-soft text-studio-action-ink" : "border border-studio-line-strong text-studio-ink-3",
                )}
              >
                {done ? <Check aria-hidden className="size-3.5" strokeWidth={3} /> : i + 1}
              </span>
              <span className={cn("hidden truncate text-sm sm:inline", current ? "font-semibold text-studio-ink" : "text-studio-ink-2")}>{s.label}</span>
              <span className="sr-only sm:hidden">{s.label}</span>
              {done && <span className="sr-only">, done</span>}
            </>
          );
          return (
            <li key={s.id} aria-current={current ? "step" : undefined} className="min-w-0 flex-1">
              <div className={cn("h-1 rounded-full max-sm:hidden", i <= index ? "bg-studio-action" : "bg-studio-line")} />
              {reachable ? (
                <button type="button" onClick={() => onGo(s.id)} className="flex min-h-11 w-full min-w-0 cursor-pointer items-center gap-2 rounded-lg pt-1.5 text-left hover:text-studio-ink">
                  {body}
                </button>
              ) : (
                <div className="flex min-h-11 min-w-0 items-center gap-2 pt-1.5">{body}</div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function PermissionOption({ checked, onSelect, icon, title, body }: { checked: boolean; onSelect: () => void; icon: ReactNode; title: string; body: string }) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-xl border bg-studio-surface p-4 transition-[border-color,box-shadow] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-studio-focus",
        checked ? "border-studio-action shadow-[0_0_0_1px_var(--studio-action)]" : "border-studio-line hover:border-studio-line-strong",
      )}
    >
      <input type="radio" name="nc-permission" checked={checked} onChange={onSelect} className="sr-only" />
      <span className={cn("mt-0.5 shrink-0", checked ? "text-studio-action-ink" : "text-studio-ink-3")}>{icon}</span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-sm font-semibold">{title}</span>
        <span className="text-2xs text-studio-ink-3">{body}</span>
      </span>
      <span aria-hidden className={cn("mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full border-2", checked ? "border-studio-action" : "border-studio-line-strong")}>
        {checked && <span className="size-2.5 rounded-full bg-studio-action" />}
      </span>
    </label>
  );
}

function UploadSlot({ cardId, kind, label, url, onChange, wide, accept = "image/*" }: { cardId: string; kind: UploadKind; label: string; url?: string; onChange: (url: string | undefined) => void; wide?: boolean; accept?: string }) {
  const upload = useCallback((f: File, p: (n: number) => void, signal: AbortSignal) => uploadImage(f, kind, p, { cardId, signal }), [kind, cardId]);
  const done = useCallback((d: { url: string }) => onChange(d.url), [onChange]);
  const q = useUploadQueue(upload, done);

  if (url) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-studio-line p-2.5">
        <img src={url} alt="" className={cn("shrink-0 rounded-lg bg-studio-raised object-cover", wide ? "h-14 w-24" : "size-14", kind === "logo" && "object-contain p-1")} />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">{label}</span>
          <span className="block text-2xs text-studio-success">Added</span>
        </span>
        <Button variant="danger-ghost" onClick={() => onChange(undefined)} icon={<Trash2 aria-hidden className="size-4" />} aria-label={`Remove ${label.toLowerCase()}`} className="h-11">
          Remove
        </Button>
      </div>
    );
  }
  return <Dropzone accept={accept} onFiles={q.add} title={label} hint="Optional" items={q.items} onRetry={q.retry} onDismiss={q.dismiss} compact />;
}

