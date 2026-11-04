import type { Metadata } from "next";
import { getCardBySlug, listPublishedSlugs } from "@/lib/services/public-cards";
import { PublicCard } from "@/components/card/public-card";

export async function generateStaticParams() {
  return (await listPublishedSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/c/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const bundle = await getCardBySlug(slug);
  if (!bundle) return { title: { absolute: "Card not available" }, robots: { index: false } };
  const { card } = bundle;
  const subtitle = [card.title, card.company].filter(Boolean).join(", ");
  // The client's card, not ours: "[Owner] · [Company]", never the product name.
  const title = [card.name, card.company].filter(Boolean).join(" · ");
  return {
    title: { absolute: title },
    description: subtitle || `${card.name}’s digital business card`,
    openGraph: {
      title,
      description: subtitle,
      images: card.backgroundPhotoUrl ? [{ url: card.backgroundPhotoUrl }] : undefined,
    },
  };
}

export default async function CardPage({ params }: PageProps<"/c/[slug]">) {
  const { slug } = await params;
  const bundle = await getCardBySlug(slug);
  return <PublicCard slug={slug} serverBundle={bundle} />;
}
