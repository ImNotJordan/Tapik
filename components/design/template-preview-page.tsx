"use client";

import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { CardRenderer } from "@/components/card/card-renderer";
import type { CardBundle } from "@/lib/types";
import { getPreview } from "@/templates/previews";
import { getTemplate } from "@/templates/registry";

/** Strips everything optional and stretches the name: the worst case every template must survive. */
export function sparseBundle(b: CardBundle): CardBundle {
  return {
    ...b,
    card: {
      ...b.card,
      name: "Maria Concepcion Villanueva-Santiago de los Reyes",
      quote: undefined,
      backgroundPhotoUrl: undefined,
      agentPhotoUrl: undefined,
      logoUrl: undefined,
      logoDarkUrl: undefined,
      credential: undefined,
      hours: undefined,
      services: undefined,
      serviceAreas: undefined,
      event: undefined,
      department: undefined,
      employeeId: undefined,
      bookingUrl: undefined,
      bookingLabel: undefined,
      bookingNote: undefined,
      expertiseChips: undefined,
      tagline: undefined,
      eyebrow: undefined,
    },
    photos: [],
    orgChart: undefined,
    orgMembers: [],
  };
}

export function TemplatePreviewPage({ id }: { id: string }) {
  const params = useSearchParams();
  const theme = params.get("theme");
  const sparse = params.get("sparse") === "1";
  const bundle = useMemo(() => {
    const t = getTemplate(id);
    const base = getPreview(t.id);
    const themed = { ...base, card: { ...base.card, themeId: t.themes.some((th) => th.id === theme) ? theme! : base.card.themeId } };
    return sparse ? sparseBundle(themed) : themed;
  }, [id, theme, sparse]);
  return <CardRenderer bundle={bundle} mode="public" />;
}
