"use client";

import { Eye, EyeOff, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { addSocial, patchSocial, removeSocial, reorderSocials, restoreSocial } from "@/lib/services/cards";
import { displayHandle, getPlatform, PLATFORMS, resolveSocialInput } from "@/lib/social";
import type { SocialLink, SocialPlatform } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button, IconButton } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/field";
import { SortableList } from "@/components/ui/sortable-list";
import { useToast } from "@/components/ui/toast";
import { BrandIcon } from "@/components/card/brand-icons";
import { useEditor } from "../editor-context";
import { PanelHeader } from "../fields";

export function SocialsPanel() {
  const { bundle, card } = useEditor();
  const toast = useToast();
  const [editing, setEditing] = useState<SocialLink | null>(null);
  const [adding, setAdding] = useState(false);
  const links = bundle.socials;

  return (
    <div className="flex flex-col gap-5">
      <PanelHeader title="Social links" description="Drag to set the order. Hidden links stay saved but don’t show on the card." />

      {links.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-studio-line-strong p-5">
          <p className="text-sm font-semibold">No social links yet</p>
          <p className="text-2xs text-studio-ink-3">Add Facebook, Instagram, a website or any link. The section hides on the card until there’s at least one.</p>
        </div>
      ) : (
        <SortableList
          label="Social links"
          items={links}
          onReorder={(ids) => reorderSocials(card.id, ids)}
          renderItem={(s, handle, { dragging }) => (
            <div
              className={cn(
                "flex items-center gap-2 rounded-xl border bg-studio-surface py-1.5 pr-1.5 pl-1",
                dragging ? "border-studio-action shadow-[0_8px_24px_rgb(0_0_0/0.12)]" : "border-studio-line",
                !s.visible && "bg-studio-raised/60",
              )}
            >
              {handle}
              <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg bg-studio-raised", !s.visible && "opacity-50")}>
                <BrandIcon platform={s.platform} className="size-[18px]" />
              </span>
              <span className={cn("flex min-w-0 flex-1 flex-col", !s.visible && "opacity-60")}>
                <span className="truncate text-sm font-semibold">{s.label || getPlatform(s.platform).label}</span>
                <span className="truncate text-2xs text-studio-ink-3">{displayHandle(s.url)}</span>
              </span>
              <IconButton
                size="sm"
                label={s.visible ? `Hide ${getPlatform(s.platform).label}` : `Show ${getPlatform(s.platform).label}`}
                icon={s.visible ? <Eye aria-hidden /> : <EyeOff aria-hidden />}
                onClick={() => patchSocial(card.id, s.id, { visible: !s.visible })}
              />
              <IconButton size="sm" label="Edit link" icon={<Pencil aria-hidden />} onClick={() => setEditing(s)} />
              <IconButton
                size="sm"
                label="Delete link"
                variant="danger-ghost"
                icon={<Trash2 aria-hidden />}
                onClick={() => {
                  const removed = removeSocial(card.id, s.id);
                  if (removed)
                    toast.success(`${getPlatform(removed.platform).label} link deleted`, {
                      action: { label: "Undo", onClick: () => restoreSocial(removed) },
                    });
                }}
              />
            </div>
          )}
        />
      )}

      <Button className="self-start" icon={<Plus aria-hidden className="size-4" />} onClick={() => setAdding(true)}>
        Add link
      </Button>

      <LinkDialog
        key={editing?.id ?? (adding ? "new" : "closed")}
        open={adding || !!editing}
        initial={editing}
        onOpenChange={(v) => {
          if (!v) {
            setAdding(false);
            setEditing(null);
          }
        }}
        onSave={(platform, url, label) => {
          if (editing) {
            patchSocial(card.id, editing.id, { platform, url, label: label || undefined });
            toast.success("Link updated");
          } else {
            addSocial(card.id, { platform, url, label: label || undefined, visible: true });
            toast.success(`${getPlatform(platform).label} link added`);
          }
          setAdding(false);
          setEditing(null);
        }}
      />
    </div>
  );
}

function LinkDialog({
  open,
  initial,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  initial: SocialLink | null;
  onOpenChange: (v: boolean) => void;
  onSave: (platform: SocialPlatform, url: string, label: string) => void;
}) {
  const [platform, setPlatform] = useState<SocialPlatform | null>(initial?.platform ?? null);
  const [value, setValue] = useState(initial?.url ?? "");
  const [label, setLabel] = useState(initial?.label ?? "");
  const [tried, setTried] = useState(false);
  const def = platform ? getPlatform(platform) : null;
  const result = platform ? resolveSocialInput(platform, value) : null;
  const needsLabel = platform === "custom";

  const submit = () => {
    setTried(true);
    if (!platform || !result?.ok || (needsLabel && !label.trim())) return;
    onSave(platform, result.value, label.trim());
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={initial ? "Edit link" : platform ? `Add ${def!.label}` : "Add a link"}
      description={platform ? undefined : "Choose where the link goes."}
      footer={
        platform ? (
          <>
            {!initial && (
              <Button variant="ghost" onClick={() => setPlatform(null)} className="mr-auto">
                Change platform
              </Button>
            )}
            <Button onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button variant="primary" onClick={submit}>
              {initial ? "Save link" : "Add link"}
            </Button>
          </>
        ) : undefined
      }
    >
      {!platform ? (
        <div role="list" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {PLATFORMS.map((p) => (
            <button
              key={p.id}
              type="button"
              role="listitem"
              onClick={() => setPlatform(p.id)}
              className="flex h-12 cursor-pointer items-center gap-2.5 rounded-xl border border-studio-line px-3 text-sm font-semibold hover:border-studio-line-strong hover:bg-studio-raised"
            >
              <BrandIcon platform={p.id} className="size-[18px]" />
              {p.label}
            </button>
          ))}
        </div>
      ) : (
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="flex flex-col gap-4"
        >
          <Field
            label={platform === "website" || platform === "custom" ? "Link" : "Link or handle"}
            error={tried && result && !result.ok ? result.message : null}
            hint={result?.ok && value ? `Opens ${displayHandle(result.value)}` : `For example ${def!.placeholder}`}
          >
            {(p) => (
              <Input
                id={p.id}
                aria-describedby={p.describedBy}
                invalid={p.invalid}
                autoFocus
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onBlur={() => value && setTried(true)}
                placeholder={def!.placeholder}
                inputMode="url"
              />
            )}
          </Field>
          <Field
            label="Button label"
            optional={!needsLabel}
            error={tried && needsLabel && !label.trim() ? "Custom links need a label, like “Menu and prices”." : null}
            hint={needsLabel ? "What the link is, in a few words." : `Leave empty to show “${def!.label}”.`}
          >
            {(p) => <Input id={p.id} aria-describedby={p.describedBy} invalid={p.invalid} value={label} onChange={(e) => setLabel(e.target.value)} />}
          </Field>
          <button type="submit" className="sr-only">
            Save
          </button>
        </form>
      )}
    </Dialog>
  );
}
