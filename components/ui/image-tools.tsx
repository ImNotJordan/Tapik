"use client";

/* eslint-disable @next/next/no-img-element -- editor previews show local data URLs */
import { Move } from "lucide-react";
import { useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { clamp, cn } from "@/lib/utils";
import { Slider } from "./controls";

export type Crop = { zoom: number; x: number; y: number };
export type PhotoShape = "circle" | "rounded-square" | "arch" | "full-bleed-portrait" | "square";

export const SHAPE_STYLE: Record<PhotoShape, CSSProperties> = {
  circle: { borderRadius: "9999px", aspectRatio: "1 / 1" },
  "rounded-square": { borderRadius: "14px", aspectRatio: "4 / 5" },
  arch: { borderRadius: "999px 999px 12px 12px", aspectRatio: "3 / 4" },
  "full-bleed-portrait": { borderRadius: "4px", aspectRatio: "4 / 5" },
  square: { borderRadius: "2px", aspectRatio: "1 / 1" },
};

export function cropStyle(crop: Crop | undefined): CSSProperties {
  const c = crop ?? { zoom: 1, x: 0, y: 0 };
  return { transform: `translate(${c.x}%, ${c.y}%) scale(${c.zoom})`, transformOrigin: "center" };
}

/**
 * Crop UI: drag to reposition, slider to zoom, arrow keys for fine moves.
 * The preview uses the template's photo shape so admins see the real result.
 */
export function ImageCropper({
  src,
  alt,
  shape,
  crop,
  onChange,
}: {
  src: string;
  alt: string;
  shape: PhotoShape;
  crop: Crop;
  onChange: (c: Crop) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const start = useRef<{ px: number; py: number; x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const limit = (z: number) => ((z - 1) / (2 * z)) * 100;

  const set = (next: Partial<Crop>) => {
    const z = next.zoom ?? crop.zoom;
    const l = limit(z);
    onChange({ zoom: z, x: clamp(next.x ?? crop.x, -l, l), y: clamp(next.y ?? crop.y, -l, l) });
  };

  const onPointerDown = (e: PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    start.current = { px: e.clientX, py: e.clientY, x: crop.x, y: crop.y };
    setDragging(true);
  };
  const onPointerMove = (e: PointerEvent) => {
    if (!start.current || !box.current) return;
    const r = box.current.getBoundingClientRect();
    set({
      x: start.current.x + ((e.clientX - start.current.px) / r.width) * 100 / crop.zoom,
      y: start.current.y + ((e.clientY - start.current.py) / r.height) * 100 / crop.zoom,
    });
  };
  const onKey = (e: KeyboardEvent) => {
    const step = e.shiftKey ? 5 : 1;
    const map: Record<string, Partial<Crop>> = {
      ArrowLeft: { x: crop.x - step },
      ArrowRight: { x: crop.x + step },
      ArrowUp: { y: crop.y - step },
      ArrowDown: { y: crop.y + step },
    };
    if (map[e.key]) {
      e.preventDefault();
      set(map[e.key]);
    }
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
      <div
        ref={box}
        role="slider"
        tabIndex={0}
        aria-label="Photo position. Drag or use arrow keys."
        aria-valuenow={Math.round(crop.x)}
        aria-valuetext={`Horizontal ${Math.round(crop.x)}%, vertical ${Math.round(crop.y)}%`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => {
          start.current = null;
          setDragging(false);
        }}
        onKeyDown={onKey}
        className={cn(
          "relative w-40 shrink-0 touch-none overflow-hidden bg-studio-raised outline-offset-4 select-none",
          dragging ? "cursor-grabbing" : "cursor-grab",
        )}
        style={SHAPE_STYLE[shape]}
      >
        <img src={src} alt={alt} draggable={false} className="size-full object-cover" style={cropStyle(crop)} />
        <span
          aria-hidden
          className="absolute right-2 bottom-2 flex size-7 items-center justify-center rounded-full bg-black/55 text-white"
        >
          <Move className="size-3.5" />
        </span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <Slider label="Zoom" value={crop.zoom} min={1} max={3} step={0.05} onValueChange={(z) => set({ zoom: z })} format={(v) => `${Math.round(v * 100)}%`} />
        <p className="text-2xs text-studio-ink-3">Drag the photo to position the face. Shift + arrow keys move in bigger steps.</p>
        <button
          type="button"
          onClick={() => onChange({ zoom: 1, x: 0, y: 0 })}
          className="self-start text-2xs font-semibold text-studio-action-ink underline underline-offset-2 hover:no-underline"
        >
          Reset crop
        </button>
      </div>
    </div>
  );
}

/** Click or drag to set the focal point that stays visible at every crop. */
export function FocalPointPicker({
  src,
  alt,
  point,
  onChange,
  overlay,
  overlayColor,
}: {
  src: string;
  alt: string;
  point: { x: number; y: number };
  onChange: (p: { x: number; y: number }) => void;
  overlay: number;
  overlayColor: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const active = useRef(false);

  const fromEvent = (e: PointerEvent) => {
    const r = box.current!.getBoundingClientRect();
    onChange({ x: clamp((e.clientX - r.left) / r.width, 0, 1), y: clamp((e.clientY - r.top) / r.height, 0, 1) });
  };
  const pos = `${Math.round(point.x * 100)}% ${Math.round(point.y * 100)}%`;

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={box}
        role="slider"
        tabIndex={0}
        aria-label="Focal point. Click the part of the photo that must stay visible, or use arrow keys."
        aria-valuenow={Math.round(point.x * 100)}
        aria-valuetext={`${Math.round(point.x * 100)}% from left, ${Math.round(point.y * 100)}% from top`}
        onPointerDown={(e) => {
          active.current = true;
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          fromEvent(e);
        }}
        onPointerMove={(e) => active.current && fromEvent(e)}
        onPointerUp={() => (active.current = false)}
        onKeyDown={(e) => {
          const d = e.shiftKey ? 0.1 : 0.02;
          const k: Record<string, { x: number; y: number }> = {
            ArrowLeft: { x: point.x - d, y: point.y },
            ArrowRight: { x: point.x + d, y: point.y },
            ArrowUp: { x: point.x, y: point.y - d },
            ArrowDown: { x: point.x, y: point.y + d },
          };
          if (k[e.key]) {
            e.preventDefault();
            onChange({ x: clamp(k[e.key].x, 0, 1), y: clamp(k[e.key].y, 0, 1) });
          }
        }}
        className="relative aspect-[16/10] cursor-crosshair touch-none overflow-hidden rounded-xl bg-studio-raised select-none"
      >
        <img src={src} alt={alt} draggable={false} className="size-full object-cover" />
        <span
          aria-hidden
          className="pointer-events-none absolute size-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-[2.5px] border-white shadow-[0_0_0_1.5px_rgb(0_0_0/0.45),0_2px_8px_rgb(0_0_0/0.4)]"
          style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%` }}
        />
      </div>
      <div className="flex items-end gap-3" aria-label="How the photo crops on each device">
        {[
          { label: "Phone", ratio: "9 / 16", w: "w-14" },
          { label: "Tablet", ratio: "3 / 4", w: "w-20" },
          { label: "Desktop", ratio: "16 / 9", w: "w-36" },
        ].map((d) => (
          <figure key={d.label} className="flex flex-col gap-1">
            <div className={cn("relative overflow-hidden rounded-md bg-studio-raised", d.w)} style={{ aspectRatio: d.ratio }}>
              <img src={src} alt="" className="size-full object-cover" style={{ objectPosition: pos }} />
              <div className="absolute inset-0" style={{ background: overlayColor, opacity: overlay }} />
            </div>
            <figcaption className="text-2xs text-studio-ink-3">{d.label}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
