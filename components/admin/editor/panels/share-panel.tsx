"use client";

import { Check, Copy, Download, ExternalLink, Nfc, Smartphone, CircleAlert } from "lucide-react";
import { useRef, useState } from "react";
import { checkSlugAvailable, downloadQrCode, hasUnpublishedChanges } from "@/lib/services/cards";
import { useDB } from "@/lib/services/data";
import { writeNfcTag } from "@/lib/services/nfc";
import { cn, formatDate, publicCardPath, publicCardUrl, slugify } from "@/lib/utils";
import { validateSlug } from "@/lib/validate";
import { Button, LinkButton } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/controls";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { QrPreview } from "@/components/ui/qr-preview";
import { useToast } from "@/components/ui/toast";
import { useCopy } from "@/components/card/actions";
import { UnpublishDialog, useCardOps } from "../../card-ops";
import { useEditor } from "../editor-context";
import { Divider, PanelHeader } from "../fields";

export function SharePanel() {
  const { card, invalid } = useEditor();
  const ops = useCardOps();
  const [confirmUnpub, setConfirmUnpub] = useState(false);
  const dirty = hasUnpublishedChanges(card);
  const blocked = Object.keys(invalid).length > 0;

  return (
    <div>
      <PanelHeader title="Share and publish" description="Publishing makes the link, QR code and NFC card open this card." />

      <section className="flex flex-col gap-4 rounded-xl border border-studio-line p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <StatusBadge status={card.status} dirty={dirty} />
          {card.published_at && card.status === "published" && (
            <span className="text-2xs text-studio-ink-3">Last published {formatDate(card.published_at)}</span>
          )}
        </div>
        <p className="text-sm text-studio-ink-2">
          {card.status === "draft"
            ? "Only you can see this card. Publish it to make the link work."
            : dirty
              ? "Visitors still see the last published version. Publish to update it."
              : "The card is live and up to date."}
        </p>
        {blocked && (
          <p className="flex items-start gap-1.5 text-2xs font-medium text-studio-danger-ink">
            <CircleAlert aria-hidden className="mt-px size-3.5 shrink-0" />
            Fix the highlighted fields in Content before publishing.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {(card.status === "draft" || dirty) && (
            <Button variant="primary" disabled={blocked} loading={ops.busy === `publish:${card.id}`} onClick={() => ops.publish(card)}>
              {card.status === "draft" ? "Publish card" : "Publish changes"}
            </Button>
          )}
          {card.status === "published" && (
            <Button variant="danger-ghost" onClick={() => setConfirmUnpub(true)}>
              Unpublish
            </Button>
          )}
        </div>
      </section>

      <Divider />
      <SlugEditor />
      <Divider />
      <QrSection />
      <Divider />
      <NfcSection />

      <UnpublishDialog
        card={card}
        open={confirmUnpub}
        onOpenChange={setConfirmUnpub}
        onConfirm={() => {
          ops.unpublish(card);
          setConfirmUnpub(false);
        }}
      />
    </div>
  );
}

function SlugEditor() {
  const { card, patch, setInvalid } = useEditor();
  const { db } = useDB();
  const toast = useToast();
  const { copied, copy } = useCopy();
  const [value, setValue] = useState(card.slug);
  const [checking, setChecking] = useState(false);
  const [tried, setTried] = useState(false);
  const taken = db.cards.filter((c) => c.id !== card.id).map((c) => c.slug);
  const result = validateSlug(value, taken);
  const changed = value !== card.slug;
  const url = publicCardUrl(card.slug);
  const host = url.replace(/^https?:\/\//, "").replace(publicCardPath(card.slug), "");

  const save = async () => {
    setTried(true);
    if (!result.ok) return;
    setChecking(true);
    const free = await checkSlugAvailable(result.value, taken, card.id);
    setChecking(false);
    if (!free) return;
    const before = card.slug;
    patch({ slug: result.value });
    setInvalid("slug", null);
    toast.success("Link updated", {
      description: card.status === "published" ? "Old QR codes and NFC cards point to the old link. Reprint or reprogram them." : undefined,
      action: { label: "Undo", onClick: () => { patch({ slug: before }); setValue(before); } },
    });
  };

  return (
    <section className="flex flex-col gap-4" aria-labelledby="link-h">
      <h3 id="link-h" className="text-base font-semibold">
        Public link
      </h3>
      <Field
        label="Link ending"
        error={tried && !result.ok ? result.message : null}
        hint={card.status === "published" ? "Changing it breaks QR codes and NFC cards that already use the old link." : "Lowercase letters, numbers and hyphens."}
      >
        {(p) => (
          <div className={cn("flex h-11 items-center overflow-hidden rounded-lg border bg-studio-surface focus-within:border-studio-action focus-within:shadow-[0_0_0_3px_var(--studio-action-soft)]", p.invalid ? "border-studio-danger" : "border-studio-line-strong")}>
            <span className="flex h-full shrink-0 items-center border-r border-studio-line bg-studio-raised px-3 text-sm text-studio-ink-3">
              {host}/c/
            </span>
            <input
              id={p.id}
              aria-describedby={p.describedBy}
              aria-invalid={p.invalid || undefined}
              value={value}
              spellCheck={false}
              onChange={(e) => {
                const v = e.target.value.toLowerCase().replace(/\s+/g, "-");
                setValue(v);
                setInvalid("slug", v !== card.slug && !validateSlug(v, taken).ok ? "slug" : null);
              }}
              onBlur={() => value !== card.slug && setTried(true)}
              onKeyDown={(e) => e.key === "Enter" && changed && save()}
              className="h-full min-w-0 flex-1 bg-transparent px-3 text-[15px] focus:outline-none"
            />
          </div>
        )}
      </Field>
      <div className="flex flex-wrap gap-2">
        {changed ? (
          <>
            <Button variant="primary" loading={checking} onClick={save}>
              Save link
            </Button>
            <Button
              onClick={() => {
                setValue(card.slug);
                setTried(false);
                setInvalid("slug", null);
              }}
            >
              Cancel
            </Button>
            {value !== slugify(card.name) && (
              <Button variant="ghost" onClick={() => setValue(slugify(card.name))}>
                Use the name
              </Button>
            )}
          </>
        ) : (
          <>
            <Button icon={copied ? <Check aria-hidden className="size-4" /> : <Copy aria-hidden className="size-4" />} onClick={() => copy(url)}>
              {copied ? "Copied" : "Copy link"}
            </Button>
            <LinkButton href={publicCardPath(card.slug)} target="_blank" icon={<ExternalLink aria-hidden className="size-4" />}>
              {card.status === "published" ? "Open public page" : "Open link"}
            </LinkButton>
          </>
        )}
      </div>
    </section>
  );
}

function QrSection() {
  const { card } = useEditor();
  const toast = useToast();
  const svg = useRef<SVGSVGElement>(null);
  const url = publicCardUrl(card.slug);
  return (
    <section className="flex flex-col gap-4" aria-labelledby="qr-h">
      <h3 id="qr-h" className="text-base font-semibold">
        QR code
      </h3>
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <div className="rounded-xl border border-studio-line bg-white p-2">
          <QrPreview ref={svg} value={url} size={148} />
        </div>
        <div className="flex flex-col gap-3">
          <p className="text-2xs text-studio-ink-3">For flyers, office signage and the back of the printed card. Print it at least 2 cm wide.</p>
          <Button
            className="self-start"
            icon={<Download aria-hidden className="size-4" />}
            onClick={() => {
              if (!svg.current) return;
              downloadQrCode(svg.current, `${card.slug}-qr`);
              toast.success("QR code downloaded", { description: `${card.slug}-qr.svg` });
            }}
          >
            Download SVG
          </Button>
        </div>
      </div>
    </section>
  );
}

type NfcState = "idle" | "waiting" | "done" | "error";

function NfcSection() {
  const { card } = useEditor();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<NfcState>("idle");
  const url = publicCardUrl(card.slug);

  const start = async () => {
    setState("waiting");
    const res = await writeNfcTag(url);
    setState(res.ok ? "done" : "error");
  };

  return (
    <section className="flex flex-col gap-4" aria-labelledby="nfc-h">
      <h3 id="nfc-h" className="text-base font-semibold">
        NFC card
      </h3>
      <p className="text-sm text-studio-ink-2">
        Writes the card’s link onto a blank NFC card or sticker, so a tap on any phone opens it.
      </p>
      <Button
        className="self-start"
        icon={<Nfc aria-hidden className="size-4" />}
        onClick={() => {
          setState("idle");
          setOpen(true);
        }}
      >
        Program NFC card
      </Button>
      {card.status === "draft" && <p className="text-2xs text-studio-ink-3">You can program it now; taps start working once the card is published.</p>}

      <Dialog
        open={open}
        onOpenChange={setOpen}
        size="sm"
        title="Program an NFC card"
        description={state === "idle" ? "Use Chrome on an Android phone with NFC turned on." : undefined}
        footer={
          state === "idle" ? (
            <>
              <Button onClick={() => setOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={start}>
                Start writing
              </Button>
            </>
          ) : state === "waiting" ? (
            <Button onClick={() => setState("idle")}>Cancel</Button>
          ) : state === "done" ? (
            <>
              <Button onClick={() => setState("idle")}>Program another</Button>
              <Button variant="primary" onClick={() => setOpen(false)}>
                Done
              </Button>
            </>
          ) : (
            <Button variant="primary" onClick={start}>
              Try again
            </Button>
          )
        }
      >
        <div className="flex flex-col items-center gap-4 py-2 text-center" aria-live="polite">
          <span
            aria-hidden
            className={cn(
              "flex size-20 items-center justify-center rounded-full",
              state === "done" ? "bg-studio-success-soft text-studio-success" : state === "error" ? "bg-studio-danger-soft text-studio-danger" : "bg-studio-action-soft text-studio-action-ink",
              state === "waiting" && "motion-safe:animate-pulse",
            )}
          >
            {state === "done" ? <Check className="size-9" strokeWidth={2.5} /> : state === "error" ? <CircleAlert className="size-9" /> : state === "waiting" ? <Nfc className="size-9" /> : <Smartphone className="size-9" />}
          </span>
          {state === "idle" && (
            <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-left text-sm text-studio-ink-2">
              <li>Open this page on the Android phone.</li>
              <li>Tap Start writing.</li>
              <li>Hold the blank card flat against the back of the phone until it confirms.</li>
            </ol>
          )}
          {state === "waiting" && (
            <p className="text-sm text-studio-ink-2">Hold the card against the back of the phone. Keep it still for a moment.</p>
          )}
          {state === "done" && (
            <p className="text-sm text-studio-ink-2">
              The card now opens <span className="font-semibold text-studio-ink">{url.replace(/^https?:\/\//, "")}</span>. Test it with a tap.
            </p>
          )}
          {state === "error" && <p className="text-sm text-studio-ink-2">The card moved before writing finished. Hold it still and try again.</p>}
          <p className="text-2xs text-studio-ink-3">iPhones can read NFC cards but can’t write them from a browser.</p>
        </div>
      </Dialog>
    </section>
  );
}
