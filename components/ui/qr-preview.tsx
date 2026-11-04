"use client";

import { QRCodeSVG } from "qrcode.react";
import { forwardRef } from "react";

/** QR code for a card URL. High error correction so it survives print and glare. */
export const QrPreview = forwardRef<SVGSVGElement, { value: string; size?: number; fg?: string; bg?: string; title?: string }>(
  function QrPreview({ value, size = 184, fg = "#111412", bg = "#FFFFFF", title }, ref) {
    return (
      <QRCodeSVG
        ref={ref}
        value={value}
        size={size}
        level="Q"
        marginSize={2}
        fgColor={fg}
        bgColor={bg}
        title={title ?? `QR code for ${value}`}
        role="img"
        className="rounded-lg"
      />
    );
  },
);
