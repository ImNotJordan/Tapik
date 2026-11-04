"use client";

import { Dialog as D } from "radix-ui";
import { Check, Copy, Phone, Share2, UserPlus, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { MESSAGE_LABEL, generateVCard, messageHref } from "@/lib/services/card-utils";
import { phoneDigits } from "@/lib/validate";
import { cn } from "@/lib/utils";
import { QrPreview } from "@/components/ui/qr-preview";
import { useScrollRoot } from "@/components/ui/device-preview";
import { BrandIcon } from "./brand-icons";
import { useCard } from "./context";
import { useLabels } from "./labels";

/* --------------------------------------------------------------- Helpers */

export function useContactActions() {
  const { bundle, url } = useCard();
  const { card } = bundle;
  const call = card.phone ? `tel:${phoneDigits(card.phone)}` : null;
  const message = messageHref(card);
  const messageLabel = MESSAGE_LABEL[card.messageChannel];

  const saveContact = () => {
    const vcf = generateVCard(bundle, url);
    const blob = new Blob([vcf], { type: "text/vcard;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${card.slug}.vcf`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  return { call, message, messageLabel, saveContact, channel: card.messageChannel };
}

export function MessageIcon({ className = "size-5" }: { className?: string }) {
  const { bundle } = useCard();
  const ch = bundle.card.messageChannel;
  if (ch === "sms") {
    return (
      <svg aria-hidden viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
      </svg>
    );
  }
  return <BrandIcon platform={ch} className={className} />;
}

/** Copy text with a fallback for browsers that refuse the clipboard. */
export function useCopy(timeout = 1600) {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (text: string, key = text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(key);
    setTimeout(() => setCopied(null), timeout);
  };
  return { copied, copy };
}

/* ----------------------------------------------------------- Card sheet */

/** Bottom sheet that lives inside the themed card root (and inside the preview frame). */
export function CardSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
}) {
  const { portal } = useCard();
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal container={portal.current}>
        <D.Overlay className="fixed inset-0 z-[70] bg-black/50 [animation:fade-in_160ms_ease-out]" />
        <D.Content className="fixed inset-x-0 bottom-0 z-[71] mx-auto flex max-h-[85%] w-full max-w-lg flex-col rounded-t-3xl bg-c-surface text-c-text shadow-[0_-16px_48px_rgb(0_0_0/0.3)] [animation:sheet-up_300ms_var(--ease-out-expo)] focus:outline-none">
          <div aria-hidden className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-c-line" />
          <div className="flex items-start justify-between gap-3 px-5 pt-3 pb-2">
            <div className="flex min-w-0 flex-col gap-1">
              <D.Title className="card-display text-2xl leading-tight">{title}</D.Title>
              {description ? (
                <D.Description className="text-sm text-c-text-muted">{description}</D.Description>
              ) : (
                <D.Description className="sr-only">{typeof title === "string" ? title : "Details"}</D.Description>
              )}
            </div>
            <D.Close aria-label="Close" className="-mr-2 inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full hover:bg-c-surface-tint">
              <X aria-hidden className="size-5" />
            </D.Close>
          </div>
          <div className="min-h-0 overflow-y-auto px-5 pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom))]">{children}</div>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}

/* ---------------------------------------------------------------- Share */

export function ShareSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { bundle, url } = useCard();
  const { copied, copy } = useCopy();
  const L = useLabels();
  return (
    <CardSheet open={open} onOpenChange={onOpenChange} title={L.share} description={L.shareDescription}>
      <div className="flex flex-col items-center gap-5">
        <div className="rounded-2xl bg-white p-3">
          <QrPreview value={url} size={196} title={`QR code for ${bundle.card.name}’s card`} />
        </div>
        <div className="flex w-full items-center gap-2 rounded-xl border border-c-line p-1.5 pl-4">
          <span className="min-w-0 flex-1 truncate text-sm">{url.replace(/^https?:\/\//, "")}</span>
          <button
            type="button"
            onClick={() => copy(url)}
            className="inline-flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-lg bg-c-text px-4 text-sm font-semibold text-c-surface"
          >
            {copied ? <Check aria-hidden className="size-4" /> : <Copy aria-hidden className="size-4" />}
            {copied ? L.copied : L.copyLink}
          </button>
        </div>
        <span aria-live="polite" className="sr-only">
          {copied ? L.linkCopied : ""}
        </span>
      </div>
    </CardSheet>
  );
}

/** Uses the native share sheet where it exists, else our own. */
export function useShare() {
  const { bundle, url, mode } = useCard();
  const [open, setOpen] = useState(false);
  const share = async () => {
    const data = { title: bundle.card.name, text: [bundle.card.title, bundle.card.company].filter(Boolean).join(", "), url };
    if (mode === "public" && typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(data);
        return;
      } catch (e) {
        if ((e as DOMException).name === "AbortError") return;
      }
    }
    setOpen(true);
  };
  return { share, open, setOpen };
}

export function ShareButton({ className, label }: { className?: string; label?: string }) {
  const { share, open, setOpen } = useShare();
  const L = useLabels();
  return (
    <>
      <button
        type="button"
        onClick={share}
        aria-label={label ?? L.share}
        className={cn("ml-auto inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full", className)}
      >
        <Share2 aria-hidden className="size-[18px]" strokeWidth={2} />
      </button>
      <ShareSheet open={open} onOpenChange={setOpen} />
    </>
  );
}

/* ------------------------------------------------------- Primary actions */

/**
 * Call + Message (+ Save contact). `layout` lets each template arrange them;
 * buttons share the card's button shape and fill tokens.
 */
export function PrimaryActions({
  layout,
  className,
  callLabel,
}: {
  layout: "pair" | "stacked" | "trio";
  className?: string;
  callLabel?: string;
}) {
  const { call, message, messageLabel, saveContact } = useContactActions();
  const L = useLabels();
  if (!call && !message) {
    return (
      <div className={cn("flex", className)}>
        <button type="button" onClick={saveContact} className="cbtn cbtn-primary h-14 w-full px-5 text-base">
          <UserPlus aria-hidden className="size-5" />
          {L.saveContact}
        </button>
      </div>
    );
  }

  if (layout === "trio") {
    return (
      <div className={cn("grid grid-cols-3 gap-2", className)}>
        {call && (
          <a href={call} className="cbtn cbtn-primary h-[72px] flex-col gap-1.5 text-sm">
            <Phone aria-hidden className="size-[22px]" strokeWidth={2} />
            {L.call}
          </a>
        )}
        {message && (
          <a href={message} target={message.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="cbtn cbtn-secondary h-[72px] flex-col gap-1.5 text-sm">
            <MessageIcon className="size-[22px]" />
            {messageLabel}
          </a>
        )}
        <button type="button" onClick={saveContact} className="cbtn cbtn-secondary h-[72px] cursor-pointer flex-col gap-1.5 text-sm">
          <UserPlus aria-hidden className="size-[22px]" strokeWidth={2} />
          {L.save}
        </button>
      </div>
    );
  }

  if (layout === "stacked") {
    return (
      <div className={cn("flex flex-col gap-2.5", className)}>
        {call && (
          <a href={call} className="cbtn cbtn-primary h-16 justify-between px-6 text-xl">
            <span className="card-display text-[1.3rem] [letter-spacing:-0.01em]">{callLabel ?? L.call}</span>
            <Phone aria-hidden className="size-[22px]" strokeWidth={2.25} />
          </a>
        )}
        {message && (
          <a href={message} target={message.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="cbtn cbtn-secondary h-16 justify-between border-2 px-6 text-xl" style={{ borderColor: "var(--c-on-bg)" }}>
            <span className="card-display text-[1.3rem] [letter-spacing:-0.01em]">{L.messageOn(messageLabel === "Message" ? "SMS" : messageLabel)}</span>
            <MessageIcon className="size-[22px]" />
          </a>
        )}
        <button type="button" onClick={saveContact} className="cbtn cbtn-secondary h-12 cursor-pointer text-[15px]">
          <UserPlus aria-hidden className="size-[18px]" strokeWidth={2} />
          {L.saveContact}
        </button>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      <div className="grid grid-cols-2 gap-2.5">
        {call && (
          <a href={call} className={cn("cbtn cbtn-primary h-14 text-base", !message && "col-span-2")}>
            <Phone aria-hidden className="size-5" strokeWidth={2} />
            {L.call}
          </a>
        )}
        {message && (
          <a href={message} target={message.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className={cn("cbtn cbtn-secondary h-14 text-base", !call && "col-span-2")}>
            <MessageIcon />
            {messageLabel}
          </a>
        )}
      </div>
      <button
        type="button"
        onClick={saveContact}
        className="inline-flex h-12 cursor-pointer items-center justify-center gap-2 text-[15px] font-medium text-c-on-bg underline decoration-c-bg-line underline-offset-4 hover:decoration-current"
      >
        <UserPlus aria-hidden className="size-[18px]" strokeWidth={2} />
        {L.saveToContacts}
      </button>
    </div>
  );
}

/**
 * Sticky bottom bar: appears once the primary actions scroll out of view,
 * keeping Call / Message / Save within thumb reach. Hidden on wide layouts.
 */
export function StickyActionBar({ watch }: { watch: React.RefObject<HTMLElement | null> }) {
  const { call, message, messageLabel, saveContact } = useContactActions();
  const L = useLabels();
  const root = useScrollRoot();
  const [visible, setVisible] = useState(false);
  const seen = useRef(false);

  useEffect(() => {
    const el = watch.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        const above = entry.boundingClientRect.top < (entry.rootBounds?.top ?? 0);
        if (!entry.isIntersecting && above) {
          seen.current = true;
          setVisible(true);
        } else {
          setVisible(false);
        }
      },
      { root: root?.current ?? null, threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [watch, root]);

  if (!call && !message) return null;
  return (
    <div
      aria-hidden={!visible}
      inert={!visible}
      className={cn(
        "sticky bottom-0 z-40 -mt-[84px] h-[84px] transition-[transform,opacity] duration-300 [transition-timing-function:var(--ease-out-expo)] @4xl:hidden",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0",
      )}
    >
      <div className="grid h-full grid-cols-[1fr_1fr_56px] gap-2 bg-c-bg px-4 pt-3 pb-[max(14px,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgb(0_0_0/0.18)]">
        {call ? (
          <a href={call} className="cbtn cbtn-primary text-[15px]">
            <Phone aria-hidden className="size-[18px]" strokeWidth={2} />
            {L.call}
          </a>
        ) : (
          <span />
        )}
        {message ? (
          <a href={message} target={message.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="cbtn cbtn-secondary text-[15px]">
            <MessageIcon className="size-[18px]" />
            {messageLabel}
          </a>
        ) : (
          <span />
        )}
        <button type="button" onClick={saveContact} aria-label={L.saveToContacts} className="cbtn cbtn-secondary cursor-pointer">
          <UserPlus aria-hidden className="size-5" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
