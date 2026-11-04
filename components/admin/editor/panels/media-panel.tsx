"use client";

/* eslint-disable @next/next/no-img-element -- editor previews of local uploads */
import { RefreshCw, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
import { type UploadKind, uploadImage } from "@/lib/services/cards";
import { getTemplate } from "@/templates/registry";
import { resolveTokens } from "@/lib/design/resolve";
import type { Card, HeaderElement } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Slider, Toggle } from "@/components/ui/controls";
import { Dropzone, useUploadQueue } from "@/components/ui/dropzone";
import { Field, Input } from "@/components/ui/field";
import { FocalPointPicker, ImageCropper, type PhotoShape } from "@/components/ui/image-tools";
import { Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { useEditor } from "../editor-context";
import { PanelHeader } from "../fields";

const SHAPE_NAME: Record<PhotoShape, string> = {
  circle: "circle",
  "rounded-square": "rounded square",
  arch: "arch",
  "full-bleed-portrait": "full-width portrait",
  square: "square",
};

export function MediaPanel() {
  const [tab, setTab] = useState("agent");
  return (
    <div>
      <PanelHeader title="Media" description="Photos are resized for fast loading. Every image needs a short description for screen readers." />
      <Tabs
        label="Media type"
        value={tab}
        onValueChange={setTab}
        tabs={[
          { value: "agent", label: "Agent photo", content: <AgentPhotoEditor /> },
          { value: "background", label: "Background", content: <BackgroundEditor /> },
          { value: "logo", label: "Logo", content: <LogoEditor /> },
        ]}
      />
    </div>
  );
}

function useSingleUpload(kind: UploadKind, onDone: (url: string) => void) {
  const { card } = useEditor();
  const upload = useCallback((f: File, p: (n: number) => void, signal: AbortSignal) => uploadImage(f, kind, p, { cardId: card.id, signal }), [kind, card.id]);
  const done = useCallback((d: { url: string }) => onDone(d.url), [onDone]);
  return useUploadQueue(upload, done);
}

function useVisibility(key: HeaderElement) {
  const { card, patch } = useEditor();
  const hidden = card.hiddenSections.includes(key);
  const set = (show: boolean) =>
    patch({ hiddenSections: show ? card.hiddenSections.filter((k) => k !== key) : [...card.hiddenSections, key] });
  return [!hidden, set] as const;
}

function useRemove() {
  const { card, patch } = useEditor();
  const toast = useToast();
  return (fields: (keyof Card)[], label: string) => {
    const before = Object.fromEntries(fields.map((f) => [f, card[f]])) as Partial<Card>;
    patch(Object.fromEntries(fields.map((f) => [f, undefined])) as Partial<Card>);
    toast.success(`${label} removed`, { action: { label: "Undo", onClick: () => patch(before) } });
  };
}

function AgentPhotoEditor() {
  const { card, patch } = useEditor();
  const [show, setShow] = useVisibility("agentPhoto");
  const remove = useRemove();
  const tpl = getTemplate(card.templateId);
  const onDone = useCallback((url: string) => patch({ agentPhotoUrl: url, agentPhotoCrop: { zoom: 1, x: 0, y: 0 } }), [patch]);
  const q = useSingleUpload("agent-photo", onDone);

  return (
    <div className="flex flex-col gap-6">
      <Toggle label="Show agent photo" description="When hidden, no photo or initials appear." checked={show} onCheckedChange={setShow} />
      {card.agentPhotoUrl ? (
        <>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold">Crop</p>
            <p className="text-2xs text-studio-ink-3">
              {tpl.name} shows the photo as a {SHAPE_NAME[tpl.photoShape]}.
            </p>
          </div>
          <ImageCropper
            src={card.agentPhotoUrl}
            alt={card.agentPhotoAlt || card.name}
            shape={tpl.photoShape}
            crop={card.agentPhotoCrop ?? { zoom: 1, x: 0, y: 0 }}
            onChange={(c) => patch({ agentPhotoCrop: c })}
          />
          <AltField value={card.agentPhotoAlt ?? ""} onChange={(v) => patch({ agentPhotoAlt: v })} placeholder={card.name} />
          <div className="flex flex-wrap gap-2">
            <ReplaceButton accept="image/*" onFile={(f) => q.add([f])} />
            <Button variant="danger-ghost" icon={<Trash2 aria-hidden className="size-4" />} onClick={() => remove(["agentPhotoUrl", "agentPhotoCrop"], "Agent photo")}>
              Remove
            </Button>
          </div>
          {q.items.length > 0 && <Dropzone title="" onFiles={q.add} items={q.items} onRetry={q.retry} onDismiss={q.dismiss} compact />}
        </>
      ) : (
        <Dropzone
          title="Upload an agent photo"
          hint="JPG, PNG or WebP, up to 15 MB. A clear face works best."
          onFiles={q.add}
          items={q.items}
          onRetry={q.retry}
          onDismiss={q.dismiss}
        />
      )}
      {!card.agentPhotoUrl && <p className="text-2xs text-studio-ink-3">Until a photo is added, the card shows initials in its place.</p>}
    </div>
  );
}

function BackgroundEditor() {
  const { card, patch } = useEditor();
  const [show, setShow] = useVisibility("backgroundPhoto");
  const remove = useRemove();
  const tokens = resolveTokens(card);
  const onDone = useCallback((url: string) => patch({ backgroundPhotoUrl: url, backgroundFocalPoint: { x: 0.5, y: 0.5 } }), [patch]);
  const q = useSingleUpload("background-photo", onDone);
  const overlay = card.overlayOpacity ?? 0.55;

  return (
    <div className="flex flex-col gap-6">
      <Toggle
        label="Show background photo"
        description={
          getTemplate(card.templateId).supports.coverPhoto
            ? `${getTemplate(card.templateId).name} shows it in the header.`
            : `${getTemplate(card.templateId).name} doesn’t show a background photo. It stays saved for templates that do.`
        }
        checked={show}
        onCheckedChange={setShow}
      />
      {card.backgroundPhotoUrl ? (
        <>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold">Focal point</p>
            <p className="text-2xs text-studio-ink-3">Click the part that must stay visible when the photo is cropped for phones and desktops.</p>
          </div>
          <FocalPointPicker
            src={card.backgroundPhotoUrl}
            alt={card.backgroundPhotoAlt || "Background photo"}
            point={card.backgroundFocalPoint ?? { x: 0.5, y: 0.5 }}
            onChange={(p) => patch({ backgroundFocalPoint: p })}
            overlay={overlay}
            overlayColor={tokens.background}
          />
          <Slider
            label="Overlay darkness"
            value={Math.round(overlay * 100)}
            min={0}
            max={90}
            step={5}
            onValueChange={(v) => patch({ overlayOpacity: v / 100 })}
            format={(v) => `${v}%`}
          />
          <p className="-mt-3 text-2xs text-studio-ink-3">Raise it if the name or buttons are hard to read over the photo.</p>
          <AltField value={card.backgroundPhotoAlt ?? ""} onChange={(v) => patch({ backgroundPhotoAlt: v })} placeholder="e.g. Café interior with a brick wall" />
          <div className="flex flex-wrap gap-2">
            <ReplaceButton accept="image/*" onFile={(f) => q.add([f])} />
            <Button variant="danger-ghost" icon={<Trash2 aria-hidden className="size-4" />} onClick={() => remove(["backgroundPhotoUrl", "backgroundFocalPoint"], "Background photo")}>
              Remove
            </Button>
          </div>
          {q.items.length > 0 && <Dropzone title="" onFiles={q.add} items={q.items} onRetry={q.retry} onDismiss={q.dismiss} compact />}
        </>
      ) : (
        <Dropzone
          title="Upload a background photo"
          hint="JPG, PNG or WebP, up to 15 MB. Landscape, at least 1600 px wide."
          onFiles={q.add}
          items={q.items}
          onRetry={q.retry}
          onDismiss={q.dismiss}
        />
      )}
    </div>
  );
}

function LogoEditor() {
  const { card, patch } = useEditor();
  const [show, setShow] = useVisibility("logo");
  const remove = useRemove();
  const onLight = useCallback((url: string) => patch({ logoUrl: url }), [patch]);
  const onDark = useCallback((url: string) => patch({ logoDarkUrl: url }), [patch]);
  const ql = useSingleUpload("logo", onLight);
  const qd = useSingleUpload("logo-dark", onDark);

  const slot = (
    label: string,
    hint: string,
    url: string | undefined,
    q: ReturnType<typeof useSingleUpload>,
    field: "logoUrl" | "logoDarkUrl",
    ground: string,
  ) => (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-2xs text-studio-ink-3">{hint}</p>
      </div>
      {url ? (
        <div className="flex items-center gap-3">
          <div className="flex h-20 flex-1 items-center rounded-xl border border-studio-line px-5" style={{ background: ground }}>
            <img src={url} alt={card.logoAlt || "Logo"} className="max-h-10 max-w-full object-contain" />
          </div>
          <div className="flex flex-col gap-1">
            <ReplaceButton accept="image/*" onFile={(f) => q.add([f])} compact />
            <Button size="sm" variant="danger-ghost" icon={<Trash2 aria-hidden className="size-4" />} onClick={() => remove([field], label)}>
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <Dropzone title={`Upload ${label.toLowerCase()}`} hint="SVG or transparent PNG, up to 15 MB" onFiles={q.add} items={q.items} onRetry={q.retry} onDismiss={q.dismiss} compact />
      )}
      {url && q.items.length > 0 && <Dropzone title="" onFiles={q.add} items={q.items} onRetry={q.retry} onDismiss={q.dismiss} compact />}
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <Toggle label="Show logo" description="Without a logo, the company name is shown in its place." checked={show} onCheckedChange={setShow} />
      {slot("Logo for light backgrounds", "Dark ink. Used on light themes.", card.logoUrl, ql, "logoUrl", "#FFFFFF")}
      {slot("Logo for dark backgrounds", "Light ink. Used on dark themes and over photos.", card.logoDarkUrl, qd, "logoDarkUrl", "#1A1D1B")}
      <Field label="Logo description" hint="Usually the company name.">
        {(p) => <Input id={p.id} aria-describedby={p.describedBy} value={card.logoAlt ?? ""} placeholder={card.company || "Company name"} onChange={(e) => patch({ logoAlt: e.target.value })} />}
      </Field>
    </div>
  );
}

function AltField({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <Field label="Image description (alt text)" hint="Describe what the picture shows in a few words. Screen readers read this aloud.">
      {(p) => <Input id={p.id} aria-describedby={p.describedBy} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />}
    </Field>
  );
}

function ReplaceButton({ accept, onFile, compact }: { accept: string; onFile: (f: File) => void; compact?: boolean }) {
  return (
    <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-studio-line-strong bg-studio-surface px-3 text-sm font-semibold text-studio-ink hover:bg-studio-raised focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-studio-focus">
      <RefreshCw aria-hidden className="size-4" />
      {compact ? "Replace" : "Replace photo"}
      <input
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
    </label>
  );
}
