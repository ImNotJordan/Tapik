import { BRAND } from "@/lib/brand";
import type { Metadata } from "next";
import { Suspense } from "react";
import { TemplatePreviewPage } from "@/components/design/template-preview-page";
import { getTemplate, TEMPLATES } from "@/templates/registry";

export function generateStaticParams() {
  return TEMPLATES.map((t) => ({ id: t.id }));
}

export async function generateMetadata({ params }: PageProps<"/design/preview/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: { absolute: `${getTemplate(id).name} preview · ${BRAND.adminAppName}` }, robots: { index: false } };
}

/**
 * Full-size template preview with its sample card, for the style guide and
 * template QA. Query: ?theme=<id>, ?sparse=1 (no cover, quote, photos or team; long name).
 */
export default function TemplatePreview({ params }: PageProps<"/design/preview/[id]">) {
  return (
    <Suspense fallback={null}>
      <Preview params={params} />
    </Suspense>
  );
}

async function Preview({ params }: { params: PageProps<"/design/preview/[id]">["params"] }) {
  const { id } = await params;
  return <TemplatePreviewPage id={id} />;
}
