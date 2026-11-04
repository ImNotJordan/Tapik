"use client";

/* eslint-disable @next/next/no-img-element -- grid thumbnails of local uploads */
import { Ellipsis, Pencil, Star, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
import { addPhoto, deleteAlbumPhoto, patchPhoto, removePhoto, reorderPhotos, restorePhoto, setCoverPhoto, uploadAlbumPhoto } from "@/lib/services/cards";
import type { AlbumPhoto } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button, IconButton } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Dropzone, useUploadQueue } from "@/components/ui/dropzone";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Menu } from "@/components/ui/menu";
import { SortableList } from "@/components/ui/sortable-list";
import { useToast } from "@/components/ui/toast";
import { useEditor } from "../editor-context";
import { PanelHeader } from "../fields";

const MAX_PHOTOS = 24;

export function PhotosPanel() {
  const { bundle, card } = useEditor();
  const toast = useToast();
  const photos = bundle.photos;
  const [editing, setEditing] = useState<AlbumPhoto | null>(null);

  const upload = useCallback((f: File, p: (n: number) => void, signal: AbortSignal) => uploadAlbumPhoto(card.id, f, p, signal), [card.id]);
  const done = useCallback(
    (d: { url: string; storagePath?: string; width?: number; height?: number }) =>
      addPhoto(card.id, { url: d.url, alt: "", caption: "", storagePath: d.storagePath, width: d.width, height: d.height }),
    [card.id],
  );
  const q = useUploadQueue(upload, done);
  const remaining = MAX_PHOTOS - photos.length - q.items.filter((i) => i.status === "uploading").length;

  const onFiles = (files: File[]) => {
    if (remaining <= 0) return toast.error("The album is full", { description: `Delete a photo to add another. The limit is ${MAX_PHOTOS}.` });
    if (files.length > remaining) {
      toast.error(`Only ${remaining} more photo${remaining === 1 ? "" : "s"} fit`, { description: `The first ${remaining} were added. The limit is ${MAX_PHOTOS}.` });
    }
    q.add(files.slice(0, remaining));
  };

  const del = async (p: AlbumPhoto) => {
    const removed = removePhoto(card.id, p.id);
    await deleteAlbumPhoto(p);
    if (removed) toast.success("Photo deleted", { action: { label: "Undo", onClick: () => restorePhoto(removed) } });
  };

  const missingAlt = photos.filter((p) => !p.alt?.trim()).length;

  return (
    <div className="flex flex-col gap-5">
      <PanelHeader title="Photos" description="The album shows on the card under “Photos”. Drag to reorder; the cover photo shows first." />

      <div className="flex items-center justify-between text-2xs">
        <span className="font-semibold text-studio-ink-2 tabular-nums">
          {photos.length} of {MAX_PHOTOS} photos
        </span>
        <div aria-hidden className="h-1.5 w-32 overflow-hidden rounded-full bg-studio-line">
          <div className="h-full bg-studio-action" style={{ width: `${(photos.length / MAX_PHOTOS) * 100}%` }} />
        </div>
      </div>

      <Dropzone
        multiple
        title="Add photos to the album"
        hint={`JPG, PNG or WebP, up to 15 MB each. Up to ${MAX_PHOTOS} photos.`}
        onFiles={onFiles}
        items={q.items}
        onRetry={q.retry}
        onDismiss={q.dismiss}
        disabled={remaining <= 0}
        disabledReason={`The album is full (${MAX_PHOTOS} photos). Delete one to add another.`}
      />

      {missingAlt > 0 && (
        <p className="rounded-lg bg-studio-warn-soft px-3 py-2.5 text-2xs text-studio-warn-ink">
          {missingAlt} photo{missingAlt === 1 ? " needs" : "s need"} a description for screen readers. Use Edit on each photo.
        </p>
      )}

      {photos.length > 0 && (
        <SortableList
          layout="grid"
          label="Album photos"
          items={photos}
          onReorder={(ids) => reorderPhotos(card.id, ids)}
          className="grid-cols-2 sm:grid-cols-3"
          renderItem={(p, handle, { dragging }) => (
            <figure
              className={cn(
                "group relative m-0 overflow-hidden rounded-xl border bg-studio-raised",
                dragging ? "border-studio-action shadow-[0_12px_28px_rgb(0_0_0/0.18)]" : "border-studio-line",
              )}
            >
              <div className="relative aspect-square">
                <img src={p.thumbUrl ?? p.url} alt={p.alt || ""} loading="lazy" className="size-full object-cover" />
                {p.isCover && (
                  <span className="absolute bottom-2 left-2 inline-flex h-6 items-center gap-1 rounded-md bg-black/70 px-1.5 text-2xs font-semibold text-white">
                    <Star aria-hidden className="size-3 fill-current" />
                    Cover
                  </span>
                )}
                <div className="absolute top-1 right-1 flex rounded-lg bg-studio-surface/95 shadow-[0_1px_3px_rgb(0_0_0/0.2)]">
                  {handle}
                  <Menu
                    trigger={<IconButton size="sm" label="Photo actions" icon={<Ellipsis aria-hidden />} tooltip={false} />}
                    items={[
                      { label: "Edit caption and description", icon: <Pencil />, onSelect: () => setEditing(p) },
                      { label: "Set as cover", icon: <Star />, onSelect: () => setCoverPhoto(card.id, p.id), disabled: p.isCover },
                      { type: "separator" },
                      { label: "Delete photo", icon: <Trash2 />, danger: true, onSelect: () => del(p) },
                    ]}
                  />
                </div>
              </div>
              <figcaption className="truncate px-2.5 py-2 text-2xs text-studio-ink-2">
                {p.caption || <span className="text-studio-ink-3">No caption</span>}
              </figcaption>
            </figure>
          )}
        />
      )}

      <PhotoDialog
        key={editing?.id ?? "none"}
        photo={editing}
        onClose={() => setEditing(null)}
        onSave={(caption, alt) => {
          if (editing) patchPhoto(card.id, editing.id, { caption, alt });
          setEditing(null);
          toast.success("Photo details saved");
        }}
      />
    </div>
  );
}

function PhotoDialog({ photo, onClose, onSave }: { photo: AlbumPhoto | null; onClose: () => void; onSave: (caption: string, alt: string) => void }) {
  const [caption, setCaption] = useState(photo?.caption ?? "");
  const [alt, setAlt] = useState(photo?.alt ?? "");
  return (
    <Dialog
      open={!!photo}
      onOpenChange={(v) => !v && onClose()}
      title="Photo details"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => onSave(caption.trim(), alt.trim())}>
            Save details
          </Button>
        </>
      }
    >
      {photo && (
        <div className="flex flex-col gap-4">
          <img src={photo.url} alt="" className="max-h-56 w-full rounded-xl bg-studio-raised object-contain" />
          <Field label="Caption" optional hint="Shown under the photo when it’s opened full screen.">
            {(p) => <Textarea id={p.id} aria-describedby={p.describedBy} rows={2} value={caption} onChange={(e) => setCaption(e.target.value)} />}
          </Field>
          <Field label="Description (alt text)" hint="What the photo shows, for people using screen readers.">
            {(p) => <Input id={p.id} aria-describedby={p.describedBy} value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="e.g. Kitchen with wooden shelves" />}
          </Field>
        </div>
      )}
    </Dialog>
  );
}
