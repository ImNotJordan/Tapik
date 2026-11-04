/** GET /c/<slug>/vcard: the published card as a contact file (.vcf) for "Save to contacts". */
import { getCardBySlug } from "@/lib/services/public-cards";
import { generateVCard, publicCardUrlFor } from "@/lib/services/card-utils";

export async function GET(_req: Request, { params }: RouteContext<"/c/[slug]/vcard">) {
  const { slug } = await params;
  const bundle = await getCardBySlug(slug);
  if (!bundle) return new Response("This card isn’t available.", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  const vcf = generateVCard(bundle, publicCardUrlFor(slug));
  const file = (bundle.card.name || "contact").replace(/[^\p{L}\p{N} ._-]+/gu, "").trim().replace(/\s+/g, "-") || "contact";
  return new Response(vcf, {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": `attachment; filename="${file}.vcf"`,
      "Cache-Control": "public, max-age=60",
    },
  });
}
