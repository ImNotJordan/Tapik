"use client";

import Image from "next/image";
import { ImageOff } from "lucide-react";
import { useContext, useState, type CSSProperties } from "react";
import { luminance } from "@/lib/design/contrast";
import { cn, initials } from "@/lib/utils";
import { cropStyle, SHAPE_STYLE, type PhotoShape } from "@/components/ui/image-tools";
import { CardContext, useCard } from "./context";

/** Data/blob URLs and the local Storage emulator can't go through the image optimizer. */
const isLocal = (src: string) => src.startsWith("data:") || src.startsWith("blob:") || /^http:\/\/(127\.0\.0\.1|localhost):9199\//.test(src);
/** SVGs are served as they are (Storage URLs end in ?alt=media, so check the decoded path). */
const isSvg = (src: string) => /\.svg(\?|$)/i.test(safeDecode(src));
const safeDecode = (s: string) => {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};

/**
 * Image with a designed failure state. Uses next/image for hosted files;
 * local uploads (data/blob URLs) render unoptimized.
 */
export function CardImage({
  src,
  alt,
  sizes,
  priority,
  focal,
  className,
  imgClassName,
  style,
  failTone = "surface",
}: {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  focal?: { x: number; y: number };
  className?: string;
  imgClassName?: string;
  style?: CSSProperties;
  failTone?: "surface" | "background";
}) {
  const [failed, setFailed] = useState(false);
  const ctx = useContext(CardContext);
  const eager = priority && ctx?.mode !== "thumbnail";
  const position = focal ? `${focal.x * 100}% ${focal.y * 100}%` : undefined;

  if (failed) {
    return (
      <div
        role="img"
        aria-label={alt ? `${alt} (image unavailable)` : "Image unavailable"}
        className={cn(
          "flex flex-col items-center justify-center gap-1.5 text-center",
          failTone === "surface" ? "bg-c-surface-tint text-c-text-muted" : "bg-c-bg-tint text-c-on-bg-muted",
          className,
        )}
        style={style}
      >
        <ImageOff aria-hidden className="size-5" strokeWidth={1.75} />
        <span className="px-2 text-xs">Photo unavailable</span>
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden", className)} style={style}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={ctx?.mode === "thumbnail" ? "240px" : sizes}
        priority={eager}
        unoptimized={isLocal(src) || isSvg(src)}
        onError={() => setFailed(true)}
        className={cn("object-cover", imgClassName)}
        style={{ objectPosition: position }}
      />
    </div>
  );
}

/** Initials on a quiet tone: the honest stand-in until a real photo is uploaded. */
export function Monogram({
  name,
  className,
  tone = "surface",
  style,
}: {
  name: string;
  className?: string;
  tone?: "surface" | "background" | "accent";
  style?: CSSProperties;
}) {
  const bg =
    tone === "surface"
      ? "bg-c-surface-tint text-c-text"
      : tone === "background"
        ? "bg-c-bg-tint text-c-on-bg"
        : "bg-c-accent text-c-bg";
  return (
    <div
      role="img"
      aria-label={name}
      className={cn("flex items-center justify-center overflow-hidden [container-type:inline-size]", bg, className)}
      style={style}
    >
      <span aria-hidden className="card-display leading-none" style={{ fontSize: "34cqi" }}>
        {initials(name)}
      </span>
    </div>
  );
}

/** Agent photo in the template's shape, with crop and a monogram fallback. */
export function AgentPhoto({
  shape,
  className,
  sizes,
  tone = "surface",
  priority,
  monogramClassName,
}: {
  shape: PhotoShape;
  className?: string;
  sizes: string;
  tone?: "surface" | "background";
  priority?: boolean;
  monogramClassName?: string;
}) {
  const { bundle, isHidden } = useCard();
  const { card } = bundle;
  if (isHidden("agentPhoto")) return null;
  const shapeStyle = SHAPE_STYLE[shape];

  if (!card.agentPhotoUrl) {
    return <Monogram name={card.name} tone={tone} className={cn(className, monogramClassName)} style={shapeStyle} />;
  }
  return (
    <div className={cn("relative overflow-hidden", className)} style={shapeStyle}>
      <div className="absolute inset-0" style={cropStyle(card.agentPhotoCrop)}>
        <CardImage
          src={card.agentPhotoUrl}
          alt={card.agentPhotoAlt || card.name}
          sizes={sizes}
          priority={priority}
          className="size-full"
          failTone={tone}
        />
      </div>
    </div>
  );
}

/** Picks the logo variant that reads on the color behind it. */
export function Logo({ on, className }: { on: string; className?: string }) {
  const { bundle, isHidden } = useCard();
  const { card } = bundle;
  if (isHidden("logo")) return null;
  const darkGround = luminance(on) < 0.35;
  const src = darkGround ? card.logoDarkUrl || card.logoUrl : card.logoUrl || card.logoDarkUrl;
  if (!src) {
    return card.company ? (
      <span className={cn("card-display truncate text-base leading-tight", className)}>{card.company}</span>
    ) : null;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- logos are small SVG/PNG of unknown aspect ratio
    <img src={src} alt={card.logoAlt || card.company || "Logo"} className={cn("h-7 w-auto max-w-[60%] object-contain object-left", className)} />
  );
}

/**
 * Keeps short hyphenated names ("Reyes-Tan") together when the line wraps.
 * Long ones ("Villanueva-Santiago") may break after the hyphen rather than overflow.
 */
export function NameText({ name }: { name: string }) {
  return (
    <>
      {name.split(/(\s+)/).map((part, i) =>
        part.includes("-") && part.length <= 14 ? (
          <span key={i} className="whitespace-nowrap">
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </>
  );
}
